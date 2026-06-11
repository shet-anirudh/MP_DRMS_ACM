/**
 * nearbySync.js — Google Nearby Connections orchestration service
 *
 * This is the Nearby-transport equivalent of the axios-based performSync()
 * in sync.js. The CRDT mergeField() / mergeReport() logic is shared from
 * utils/mergeField.js and is completely transport-agnostic.
 *
 * Flow on initiating device:
 *   startNearbyDiscovery()
 *     → nearbyPeerFound events arrive → UI shows peer cards
 *   user taps Sync on a peer card:
 *   syncWithNearbyPeer(endpointId)
 *     1. requestConnection(endpointId)
 *     2. wait for nearbyConnectionResult (accepted)
 *     3. read all local reports from DB
 *     4. serialise → sendPayload(endpointId, json)
 *     5. wait for nearbyPayloadReceived (peer's reports)
 *     6. run mergeReport() on every report pair
 *     7. write merged back to local DB
 *     8. send merged result back to peer → peer also writes it
 *     9. disconnect(endpointId)
 *  10. return { mergedCount, conflictCount }
 *
 * Edge cases handled:
 *   • Large payloads (>32KB)  — handled natively in NearbyPlugin.kt (STREAM)
 *   • Transfer cancelled       — rollback via pre-sync DB snapshot
 *   • Play Services unavailable — isNearbyAvailable() returns false
 *   • Both advertising + discovering simultaneously — supported natively
 */

import { Capacitor } from '@capacitor/core';
import { NearbyPlugin } from '../plugins/NearbyPlugin.ts';
import { getReports, addReport, updateReport } from '../db/db.js';
import { mergeReport } from '../utils/mergeField.js';

// Service ID must match across all devices on the same app
const SERVICE_ID = 'com.disaster.app';

// ─── State ────────────────────────────────────────────────────────────────────

/** Listener handles returned by addListener — kept so we can remove them */
const _listeners = [];

/** Promise resolvers for async handshake steps */
let _connectionResolvers = {};   // endpointId → { resolve, reject }
let _payloadResolvers = {};      // endpointId → { resolve, reject }
let _transferResolvers = {};     // endpointId → { resolve, reject }

// ─── Availability check ───────────────────────────────────────────────────────

/**
 * Returns true only when running as a native Android app with Play Services.
 * Always false on web (dev mode) — callers show a fallback demo instead.
 */
export async function isNearbyAvailable() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { available } = await NearbyPlugin.checkPlayServices();
    return available;
  } catch {
    return false;
  }
}

// ─── Discovery lifecycle ──────────────────────────────────────────────────────

/**
 * Start advertising + discovery simultaneously.
 * Fires onPeerFound(peer) / onPeerLost(endpointId) as peers appear/disappear.
 *
 * @param {string} deviceName  — Human-readable name shown to peers
 * @param {function} onPeerFound  — Called with { endpointId, name }
 * @param {function} onPeerLost   — Called with { endpointId }
 * @param {function} [onDisconnected] — Called when an active peer disconnects
 */
export async function startNearbyDiscovery(deviceName, onPeerFound, onPeerLost, onDisconnected) {
  await _removeAllListeners();

  // Register event listeners before starting so no events are missed
  _listeners.push(await NearbyPlugin.addListener('nearbyPeerFound', onPeerFound));
  _listeners.push(await NearbyPlugin.addListener('nearbyPeerLost', ({ endpointId }) => onPeerLost(endpointId)));

  if (onDisconnected) {
    _listeners.push(await NearbyPlugin.addListener('nearbyDisconnected', ({ endpointId }) => onDisconnected(endpointId)));
  }

  // Register connection + payload listeners needed during syncWithNearbyPeer
  _listeners.push(await NearbyPlugin.addListener('nearbyConnectionResult', _handleConnectionResult));
  _listeners.push(await NearbyPlugin.addListener('nearbyPayloadReceived', _handlePayloadReceived));
  _listeners.push(await NearbyPlugin.addListener('nearbyPayloadTransferUpdate', _handleTransferUpdate));

  // Start both roles simultaneously — Nearby supports this natively
  await NearbyPlugin.startAdvertising({ deviceName, serviceId: SERVICE_ID });
  await NearbyPlugin.startDiscovery({ serviceId: SERVICE_ID });

  console.log('[NearbySync] Discovery + advertising started as:', deviceName);
}

/**
 * Stop all Nearby activity. Call when leaving the P2P tab.
 */
export async function stopNearbyDiscovery() {
  try {
    await NearbyPlugin.stopAllEndpoints();
  } catch (e) {
    console.warn('[NearbySync] stopAllEndpoints error:', e);
  }
  await _removeAllListeners();
  _connectionResolvers = {};
  _payloadResolvers = {};
  _transferResolvers = {};
  console.log('[NearbySync] Discovery + advertising stopped');
}

// ─── Sync with a peer ─────────────────────────────────────────────────────────

/**
 * Full bidirectional CRDT sync with a discovered peer.
 *
 * @param {string} endpointId
 * @param {string} deviceName  — This device's name (for requestConnection)
 * @param {function} [onProgress] — Called with { bytesTransferred, totalBytes }
 * @returns {{ mergedCount: number, conflictCount: number }}
 */
export async function syncWithNearbyPeer(endpointId, deviceName = 'MP-DRMS-Device', onProgress) {
  // Take a pre-sync snapshot for rollback on failure
  const snapshot = await getReports();

  try {
    // Step 1 — Request connection
    console.log('[NearbySync] Requesting connection to', endpointId);
    await NearbyPlugin.requestConnection({ endpointId, deviceName });

    // Step 2 — Wait for connection accepted (timeout: 15s)
    const connectionAccepted = await _waitForConnection(endpointId, 15_000);
    if (!connectionAccepted) {
      throw new Error('Connection rejected by peer');
    }
    console.log('[NearbySync] Connection accepted by', endpointId);

    // Step 3 — Read local reports and send to peer
    const localReports = await getReports();
    const outgoingJson = JSON.stringify({ reports: localReports });
    console.log(`[NearbySync] Sending ${localReports.length} reports (${outgoingJson.length} bytes) to ${endpointId}`);
    await NearbyPlugin.sendPayload({ endpointId, json: outgoingJson });

    // Step 4 — Wait for peer's reports (timeout: 30s)
    const incomingJson = await _waitForPayload(endpointId, 30_000, onProgress);
    const { reports: peerReports } = JSON.parse(incomingJson);
    console.log(`[NearbySync] Received ${peerReports.length} reports from ${endpointId}`);

    // Step 5 — CRDT merge: run mergeReport() on all reports
    const mergedMap = new Map(localReports.map(r => [r.reportId, r]));

    for (const peerReport of peerReports) {
      const local = mergedMap.get(peerReport.reportId);
      if (local) {
        mergedMap.set(peerReport.reportId, mergeReport(local, peerReport));
      } else {
        mergedMap.set(peerReport.reportId, peerReport);
      }
    }

    const mergedReports = Array.from(mergedMap.values());

    // Step 6 — Write merged results to local DB
    for (const report of mergedReports) {
      const wasLocal = localReports.some(r => r.reportId === report.reportId);
      if (wasLocal) {
        await updateReport(report.reportId, report);
      } else {
        await addReport(report);
      }
    }

    // Step 7 — Send merged result back to peer (they also write it)
    const mergedJson = JSON.stringify({ reports: mergedReports });
    await NearbyPlugin.sendPayload({ endpointId, json: mergedJson });
    console.log('[NearbySync] Merged result sent back to', endpointId);

    // Step 8 — Disconnect cleanly
    await NearbyPlugin.disconnect({ endpointId });

    const conflictCount = mergedReports.filter(r => r.syncStatus === 'conflict').length;
    console.log(`[NearbySync] Sync complete: ${mergedReports.length} reports, ${conflictCount} conflicts`);

    return { mergedCount: mergedReports.length, conflictCount };

  } catch (error) {
    console.error('[NearbySync] Sync failed, rolling back:', error);

    // Rollback: restore pre-sync snapshot
    for (const report of snapshot) {
      try { await updateReport(report.reportId, report); } catch { /* new records — skip */ }
    }

    // Ensure peer is disconnected
    try { await NearbyPlugin.disconnect({ endpointId }); } catch { /* already disconnected */ }

    throw error;
  }
}

// ─── Internal async-wait helpers ──────────────────────────────────────────────

function _waitForConnection(endpointId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      delete _connectionResolvers[endpointId];
      reject(new Error(`Connection to ${endpointId} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    _connectionResolvers[endpointId] = {
      resolve: (accepted) => { clearTimeout(timer); resolve(accepted); },
      reject:  (err)      => { clearTimeout(timer); reject(err); },
    };
  });
}

function _waitForPayload(endpointId, timeoutMs, onProgress) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      delete _payloadResolvers[endpointId];
      reject(new Error(`Payload from ${endpointId} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    if (onProgress) {
      _transferResolvers[endpointId] = { onProgress };
    }

    _payloadResolvers[endpointId] = {
      resolve: (json) => { clearTimeout(timer); delete _transferResolvers[endpointId]; resolve(json); },
      reject:  (err)  => { clearTimeout(timer); delete _transferResolvers[endpointId]; reject(err); },
    };
  });
}

// ─── Internal event handlers ──────────────────────────────────────────────────

function _handleConnectionResult({ endpointId, accepted }) {
  const resolver = _connectionResolvers[endpointId];
  if (!resolver) return;
  delete _connectionResolvers[endpointId];
  resolver.resolve(accepted);
}

function _handlePayloadReceived({ endpointId, json }) {
  const resolver = _payloadResolvers[endpointId];
  if (!resolver) {
    // We are the peer receiving the initiator's data — write it locally
    _handleIncomingMergedPayload(endpointId, json);
    return;
  }
  // We are the initiator waiting for the peer's original reports
  delete _payloadResolvers[endpointId];
  resolver.resolve(json);
}

/**
 * Called on the non-initiating (peer) device when it receives the merged
 * payload back from the initiator. Writes results to local DB directly.
 */
async function _handleIncomingMergedPayload(endpointId, json) {
  try {
    const { reports: mergedReports } = JSON.parse(json);
    const localReports = await getReports();
    for (const report of mergedReports) {
      const exists = localReports.some(r => r.reportId === report.reportId);
      if (exists) {
        await updateReport(report.reportId, report);
      } else {
        await addReport(report);
      }
    }
    console.log(`[NearbySync] Peer: wrote ${mergedReports.length} merged reports from ${endpointId}`);
    // Disconnect cleanly from our side too
    try { await NearbyPlugin.disconnect({ endpointId }); } catch { /* ok */ }
  } catch (e) {
    console.error('[NearbySync] Failed to apply incoming merged payload:', e);
  }
}

function _handleTransferUpdate({ endpointId, status, bytesTransferred, totalBytes }) {
  if (status === 'CANCELED' || status === 'FAILURE') {
    const resolver = _payloadResolvers[endpointId];
    if (resolver) {
      delete _payloadResolvers[endpointId];
      resolver.reject(new Error(`Payload transfer ${status.toLowerCase()} for ${endpointId}`));
    }
  }

  const transferResolver = _transferResolvers[endpointId];
  if (transferResolver?.onProgress && status === 'IN_PROGRESS') {
    transferResolver.onProgress({ bytesTransferred, totalBytes });
  }
}

async function _removeAllListeners() {
  for (const handle of _listeners) {
    try { await handle.remove(); } catch { /* ok */ }
  }
  _listeners.length = 0;
}
