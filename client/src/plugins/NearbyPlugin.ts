/**
 * NearbyPlugin.ts — TypeScript bridge for the native NearbyPlugin Capacitor plugin.
 *
 * Used by: client/src/services/nearbySync.js
 *
 * On Android  → delegates to NearbyPlugin.kt via Capacitor bridge
 * On Web/dev  → registerPlugin returns a no-op stub (isNearbyAvailable() returns false)
 */

import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NearbyPeer {
  endpointId: string;
  name: string;
}

export interface NearbyPayloadTransferUpdate {
  endpointId: string;
  payloadId: number;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE' | 'CANCELED';
  bytesTransferred: number;
  totalBytes: number;
}

export interface PlayServicesResult {
  available: boolean;
  errorCode: number;
}

export interface NearbyConnectionResult {
  endpointId: string;
  accepted: boolean;
  statusCode: number;
}

// ─── Plugin interface ─────────────────────────────────────────────────────────

export interface NearbyPluginInterface {
  /** Verify Google Play Services availability before any Nearby call */
  checkPlayServices(): Promise<PlayServicesResult>;

  /** Broadcast this device as available on serviceId */
  startAdvertising(opts: { deviceName: string; serviceId: string }): Promise<void>;

  /** Stop broadcasting */
  stopAdvertising(): Promise<void>;

  /** Scan for peers advertising the same serviceId */
  startDiscovery(opts: { serviceId: string }): Promise<void>;

  /** Stop scanning */
  stopDiscovery(): Promise<void>;

  /** Initiate connection to a discovered peer */
  requestConnection(opts: { endpointId: string; deviceName: string }): Promise<void>;

  /**
   * Send JSON to a connected peer.
   * Auto-switches to STREAM strategy for payloads >32 KB (handled natively).
   */
  sendPayload(opts: { endpointId: string; json: string }): Promise<void>;

  /** Cleanly tear down the connection after sync */
  disconnect(opts: { endpointId: string }): Promise<void>;

  /** Disconnect from all peers and stop discovery+advertising */
  stopAllEndpoints(): Promise<void>;

  // ─── Event listeners ───────────────────────────────────────────────────────

  /** Fired when a new peer is discovered during startDiscovery */
  addListener(
    event: 'nearbyPeerFound',
    cb: (peer: NearbyPeer) => void
  ): Promise<PluginListenerHandle>;

  /** Fired when a previously found peer goes out of range */
  addListener(
    event: 'nearbyPeerLost',
    cb: (data: { endpointId: string }) => void
  ): Promise<PluginListenerHandle>;

  /** Fired when the peer sends their JSON payload to us */
  addListener(
    event: 'nearbyPayloadReceived',
    cb: (data: { endpointId: string; json: string }) => void
  ): Promise<PluginListenerHandle>;

  /** Fired when a connection request is accepted or rejected */
  addListener(
    event: 'nearbyConnectionResult',
    cb: (result: NearbyConnectionResult) => void
  ): Promise<PluginListenerHandle>;

  /** Progress updates during large payload transfers */
  addListener(
    event: 'nearbyPayloadTransferUpdate',
    cb: (update: NearbyPayloadTransferUpdate) => void
  ): Promise<PluginListenerHandle>;

  /** Fired when a peer disconnects */
  addListener(
    event: 'nearbyDisconnected',
    cb: (data: { endpointId: string }) => void
  ): Promise<PluginListenerHandle>;
}

// ─── Registered plugin singleton ──────────────────────────────────────────────

export const NearbyPlugin = registerPlugin<NearbyPluginInterface>('NearbyPlugin');
