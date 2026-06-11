import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Radio, Wifi, WifiOff, Smartphone, Check, Loader, ArrowLeft,
  ChevronRight, AlertTriangle, RefreshCw, Users, Zap
} from 'lucide-react';
import { addReport, getReports } from '../db/db.js';
import { getDeviceId } from '../services/deviceId.js';
import {
  isNearbyAvailable,
  startNearbyDiscovery,
  stopNearbyDiscovery,
  syncWithNearbyPeer,
} from '../services/nearbySync.js';

/* ── Simulated peers (web / dev mode fallback) ───────────────────────────── */
const FAKE_PEERS = [
  { endpointId: 'peer-a1b2c3', name: 'Volunteer-Arun',   signal: 92 },
  { endpointId: 'peer-d4e5f6', name: 'Volunteer-Priya',   signal: 78 },
  { endpointId: 'peer-g7h8i9', name: 'Rescue-Unit-3',     signal: 61 },
  { endpointId: 'peer-j0k1l2', name: 'Medical-Camp-East', signal: 44 },
];

const SAMPLE_DISASTER_TYPES = [
  'Flood in low-lying area – water level rising',
  'Building collapse near market road',
  'Gas leak reported, residents evacuating',
  'Road blocked by landslide debris',
  'Power lines down after storm',
  'Fire at warehouse, smoke visible',
  'Multiple injuries at construction site',
  'Bridge damaged, unsafe for vehicles',
];

function randomBetween(a, b) { return Math.random() * (b - a) + a; }

function generateFakeReport(peerId) {
  const now = Date.now();
  const priorities = ['Low', 'Medium', 'High'];
  return {
    reportId: crypto.randomUUID(),
    injuredCount: {
      value: Math.floor(Math.random() * 15),
      timestamp: now - Math.floor(Math.random() * 60000),
      updatedBy: peerId,
    },
    notes: {
      value: SAMPLE_DISASTER_TYPES[Math.floor(Math.random() * SAMPLE_DISASTER_TYPES.length)],
      timestamp: now - Math.floor(Math.random() * 60000),
      updatedBy: peerId,
    },
    location: {
      lat: randomBetween(18.5, 28.5),
      lon: randomBetween(73.0, 85.0),
      landmark: { value: 'Near Sector ' + Math.floor(Math.random() * 50), timestamp: now, updatedBy: peerId },
      timestamp: now,
      updatedBy: peerId,
    },
    priority: {
      value: priorities[Math.floor(Math.random() * priorities.length)],
      timestamp: now,
      updatedBy: peerId,
    },
    volunteersRequired: {
      value: Math.random() > 0.5,
      timestamp: now,
      updatedBy: peerId,
    },
    syncStatus: 'synced',
  };
}

/* ── Signal indicator ────────────────────────────────────────────────────── */
function SignalBars({ signal }) {
  const color = signal > 75 ? '#4CAF50' : signal > 50 ? '#F5A623' : '#E24B4A';
  const bars = [25, 50, 75, 100].map((threshold, i) => (
    <div
      key={i}
      style={{
        width: 4,
        height: 4 + i * 3,
        borderRadius: 2,
        background: signal >= threshold ? color : 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-end',
      }}
    />
  ));
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
      {bars}
    </div>
  );
}

/* ── Transfer progress bar ───────────────────────────────────────────────── */
function TransferProgress({ progress }) {
  if (progress === null) return null;
  const pct = progress.totalBytes > 0
    ? Math.round((progress.bytesTransferred / progress.totalBytes) * 100)
    : 0;
  return (
    <div className="nearby-transfer-progress">
      <div className="nearby-transfer-bar" style={{ width: `${pct}%` }} />
      <span className="nearby-transfer-label">{pct}%</span>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export function PeerSyncScreen({ onBack, onSyncComplete }) {
  const [nearbyReady, setNearbyReady]     = useState(null); // null=checking, true, false
  const [scanning, setScanning]           = useState(false);
  const [peers, setPeers]                 = useState([]);
  const [syncingPeer, setSyncingPeer]     = useState(null);
  const [syncedPeers, setSyncedPeers]     = useState(new Set());
  const [syncResults, setSyncResults]     = useState({});   // endpointId → { mergedCount, conflictCount }
  const [transferProgress, setTransferProgress] = useState({}); // endpointId → { bytesTransferred, totalBytes }
  const [error, setError]                 = useState(null);
  const deviceId = getDeviceId();
  const fakeTimers = useRef([]);

  /* ── Check Nearby availability on mount ─────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    isNearbyAvailable().then(available => {
      if (!cancelled) setNearbyReady(available);
    });
    return () => { cancelled = true; };
  }, []);

  /* ── Start real Nearby discovery when ready ──────────────────────────────── */
  useEffect(() => {
    if (nearbyReady !== true) return;

    setScanning(true);
    setError(null);

    const onPeerFound = (peer) => {
      setPeers(prev => {
        if (prev.some(p => p.endpointId === peer.endpointId)) return prev;
        return [...prev, { ...peer, signal: null }];
      });
    };

    const onPeerLost = (endpointId) => {
      setPeers(prev => prev.filter(p => p.endpointId !== endpointId));
    };

    const onDisconnected = (endpointId) => {
      // Peer disconnected after sync — leave result visible
      console.log('[PeerSyncScreen] Peer disconnected:', endpointId);
    };

    const deviceName = `DRMS-${deviceId.slice(0, 6)}`;

    startNearbyDiscovery(deviceName, onPeerFound, onPeerLost, onDisconnected)
      .then(() => setScanning(false))
      .catch(err => {
        console.error('[PeerSyncScreen] Discovery failed:', err);
        setError('Could not start Nearby discovery. Check location permissions.');
        setScanning(false);
      });

    return () => {
      stopNearbyDiscovery().catch(() => {});
    };
  }, [nearbyReady, deviceId]);

  /* ── Simulated discovery (web / dev mode) ────────────────────────────────── */
  useEffect(() => {
    if (nearbyReady !== false) return;

    setScanning(true);
    setPeers([]);
    setSyncedPeers(new Set());
    setSyncResults({});

    fakeTimers.current = FAKE_PEERS.map((peer, i) =>
      setTimeout(() => {
        setPeers(prev => [...prev, peer]);
        if (i === FAKE_PEERS.length - 1) setScanning(false);
      }, 800 + i * 700)
    );

    return () => fakeTimers.current.forEach(clearTimeout);
  }, [nearbyReady]);

  /* ── Sync handler ────────────────────────────────────────────────────────── */
  const handlePeerSync = useCallback(async (peer) => {
    if (syncedPeers.has(peer.endpointId) || syncingPeer) return;

    setSyncingPeer(peer.endpointId);
    setError(null);
    setTransferProgress(prev => ({ ...prev, [peer.endpointId]: null }));

    try {
      if (nearbyReady) {
        /* ── Real Nearby sync ─────────────────────── */
        const deviceName = `DRMS-${deviceId.slice(0, 6)}`;
        const result = await syncWithNearbyPeer(
          peer.endpointId,
          deviceName,
          (progress) => setTransferProgress(prev => ({ ...prev, [peer.endpointId]: progress }))
        );
        setSyncResults(prev => ({ ...prev, [peer.endpointId]: result }));
      } else {
        /* ── Simulated sync (web dev mode) ───────── */
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
        const count = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < count; i++) {
          await addReport(generateFakeReport(peer.endpointId));
        }
        setSyncResults(prev => ({
          ...prev,
          [peer.endpointId]: { mergedCount: count, conflictCount: 0 }
        }));
      }

      setSyncedPeers(prev => new Set([...prev, peer.endpointId]));
      if (onSyncComplete) onSyncComplete();

    } catch (err) {
      console.error('[PeerSyncScreen] Sync error:', err);
      setError(`Sync with ${peer.name} failed: ${err.message}`);
    } finally {
      setSyncingPeer(null);
      setTransferProgress(prev => ({ ...prev, [peer.endpointId]: null }));
    }
  }, [syncedPeers, syncingPeer, nearbyReady, deviceId, onSyncComplete]);

  /* ── Rescan ──────────────────────────────────────────────────────────────── */
  const handleRescan = useCallback(() => {
    if (nearbyReady) {
      stopNearbyDiscovery()
        .then(() => {
          setPeers([]);
          setSyncedPeers(new Set());
          setSyncResults({});
          setNearbyReady(null); // re-trigger the effect
          isNearbyAvailable().then(setNearbyReady);
        });
    } else {
      setNearbyReady(false); // re-trigger fake discovery effect
    }
  }, [nearbyReady]);

  /* ── Render ──────────────────────────────────────────────────────────────── */
  const totalMerged   = Object.values(syncResults).reduce((s, r) => s + (r?.mergedCount ?? 0), 0);
  const totalConflict = Object.values(syncResults).reduce((s, r) => s + (r?.conflictCount ?? 0), 0);

  return (
    <div className="peer-sync-screen">

      {/* Header */}
      <div className="peer-sync-header">
        <button className="icon-btn" onClick={onBack} id="btn-peer-sync-back">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2>Nearby Device Sync</h2>
          <p className="hint-text">
            {nearbyReady
              ? 'Auto-discovering via Bluetooth & WiFi Direct'
              : nearbyReady === false
                ? 'Demo mode — real sync requires Android app'
                : 'Checking Nearby availability…'}
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={handleRescan}
          disabled={scanning || syncingPeer !== null}
          title="Rescan"
          id="btn-nearby-rescan"
        >
          <RefreshCw size={18} className={scanning ? 'spin' : ''} />
        </button>
      </div>

      {/* Demo mode banner */}
      {nearbyReady === false && (
        <div className="nearby-demo-banner">
          <Wifi size={14} />
          <span>Web demo — install the Android app for real Nearby sync</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="nearby-error-banner">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Scan animation */}
      <div className="scan-indicator">
        <div className={`scan-ring ${(scanning || nearbyReady === null) ? 'scan-active' : ''}`}>
          <Radio size={32} className={(scanning || nearbyReady === null) ? 'pulse-icon' : ''} />
        </div>
        <p className="scan-label">
          {nearbyReady === null
            ? 'Checking availability…'
            : scanning
              ? 'Scanning for nearby devices…'
              : peers.length === 0
                ? 'No devices found nearby'
                : `Found ${peers.length} device${peers.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Device list */}
      <div className="peer-list">
        {peers.map(peer => {
          const isSyncing  = syncingPeer === peer.endpointId;
          const isSynced   = syncedPeers.has(peer.endpointId);
          const result     = syncResults[peer.endpointId];
          const progress   = transferProgress[peer.endpointId];
          const signalVal  = peer.signal ?? 70;

          return (
            <div
              key={peer.endpointId}
              id={`peer-card-${peer.endpointId}`}
              className={`peer-card ${isSynced ? 'peer-synced' : ''} ${isSyncing ? 'peer-syncing' : ''}`}
              onClick={() => handlePeerSync(peer)}
            >
              <div className="peer-icon-wrap">
                <Smartphone size={24} />
                <div className="signal-dot" style={{
                  background: signalVal > 75 ? '#4CAF50' : signalVal > 50 ? '#F5A623' : '#E24B4A'
                }} />
              </div>

              <div className="peer-info">
                <p className="peer-name">{peer.name}</p>
                <div className="peer-meta-row">
                  <SignalBars signal={signalVal} />
                  <span className="peer-meta">{peer.signal ? `Signal: ${peer.signal}%` : 'Nearby'}</span>
                </div>

                {isSyncing && progress && (
                  <TransferProgress progress={progress} />
                )}

                {isSynced && result && (
                  <p className="peer-result">
                    ✅ {result.mergedCount} report{result.mergedCount !== 1 ? 's' : ''} synced
                    {result.conflictCount > 0 && (
                      <span className="peer-conflict-count">
                        &nbsp;• ⚠️ {result.conflictCount} conflict{result.conflictCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="peer-action">
                {isSyncing ? (
                  <Loader size={20} className="spin" color="#E24B4A" />
                ) : isSynced ? (
                  <Check size={20} color="#4CAF50" />
                ) : (
                  <span className="tap-hint">
                    <Zap size={12} />Sync
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {peers.length === 0 && (scanning || nearbyReady === null) && (
          <div className="empty-state small">
            <Loader size={24} className="spin" color="#999" />
            <p>Looking for devices…</p>
          </div>
        )}

        {peers.length === 0 && !scanning && nearbyReady !== null && (
          <div className="empty-state small">
            <WifiOff size={24} color="#999" />
            <p>No devices found. Make sure other devices have the app open.</p>
          </div>
        )}
      </div>

      {/* Summary banner */}
      {syncedPeers.size > 0 && (
        <div className="sync-summary">
          <Check size={16} color="#4CAF50" />
          <span>
            Synced with {syncedPeers.size} device{syncedPeers.size !== 1 ? 's' : ''} &nbsp;•&nbsp;
            {totalMerged} reports
            {totalConflict > 0 && ` • ⚠️ ${totalConflict} conflicts`}
          </span>
        </div>
      )}
    </div>
  );
}
