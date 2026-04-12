import React, { useState, useEffect, useCallback } from 'react';
import { Radio, Wifi, WifiOff, Smartphone, Check, Loader, ArrowLeft, Users } from 'lucide-react';
import { addReport, getReports } from '../db/db.js';
import { getDeviceId } from '../services/deviceId.js';

/* ── Simulated nearby devices ────────────────────────────────────────────── */
const FAKE_PEERS = [
  { id: 'peer-a1b2c3', name: 'Volunteer-Arun',   distance: '~5m',  signal: 92 },
  { id: 'peer-d4e5f6', name: 'Volunteer-Priya',   distance: '~12m', signal: 78 },
  { id: 'peer-g7h8i9', name: 'Rescue-Unit-3',     distance: '~25m', signal: 61 },
  { id: 'peer-j0k1l2', name: 'Medical-Camp-East', distance: '~40m', signal: 44 },
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

function generateRandomReport(peerId) {
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
      lat: randomBetween(18.5, 28.5),   // India latitude range
      lon: randomBetween(73.0, 85.0),    // India longitude range
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

export function PeerSyncScreen({ onBack, onSyncComplete }) {
  const [scanning, setScanning]       = useState(true);
  const [peers, setPeers]             = useState([]);
  const [syncingPeer, setSyncingPeer] = useState(null);
  const [syncedPeers, setSyncedPeers] = useState(new Set());
  const [syncResults, setSyncResults] = useState({});

  // Simulate device discovery with staggered appearance
  useEffect(() => {
    setScanning(true);
    setPeers([]);
    setSyncedPeers(new Set());
    setSyncResults({});

    const timers = FAKE_PEERS.map((peer, i) =>
      setTimeout(() => {
        setPeers(prev => [...prev, peer]);
        if (i === FAKE_PEERS.length - 1) setScanning(false);
      }, 800 + i * 700)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  const handlePeerSync = useCallback(async (peer) => {
    if (syncedPeers.has(peer.id) || syncingPeer) return;

    setSyncingPeer(peer.id);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    // Generate 1-3 random reports from this "peer"
    const count = Math.floor(Math.random() * 3) + 1;
    const newReports = [];
    for (let i = 0; i < count; i++) {
      const report = generateRandomReport(peer.id);
      await addReport(report);
      newReports.push(report);
    }

    setSyncedPeers(prev => new Set([...prev, peer.id]));
    setSyncResults(prev => ({ ...prev, [peer.id]: newReports }));
    setSyncingPeer(null);

    if (onSyncComplete) onSyncComplete();
  }, [syncedPeers, syncingPeer, onSyncComplete]);

  return (
    <div className="peer-sync-screen">
      {/* Header */}
      <div className="peer-sync-header">
        <button className="icon-btn" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2>P2P Device Sync</h2>
          <p className="hint-text">Sync reports directly with nearby volunteers</p>
        </div>
      </div>

      {/* Scanning animation */}
      <div className="scan-indicator">
        <div className={`scan-ring ${scanning ? 'scan-active' : ''}`}>
          <Radio size={32} className={scanning ? 'pulse-icon' : ''} />
        </div>
        <p className="scan-label">
          {scanning
            ? 'Scanning for nearby devices…'
            : `Found ${peers.length} device${peers.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Device list */}
      <div className="peer-list">
        {peers.map(peer => {
          const isSyncing = syncingPeer === peer.id;
          const isSynced  = syncedPeers.has(peer.id);
          const results   = syncResults[peer.id];
          const signalColor = peer.signal > 75 ? '#4CAF50' : peer.signal > 50 ? '#F5A623' : '#E24B4A';

          return (
            <div
              key={peer.id}
              className={`peer-card ${isSynced ? 'peer-synced' : ''} ${isSyncing ? 'peer-syncing' : ''}`}
              onClick={() => handlePeerSync(peer)}
            >
              <div className="peer-icon-wrap">
                <Smartphone size={24} />
                <div className="signal-dot" style={{ background: signalColor }} />
              </div>

              <div className="peer-info">
                <p className="peer-name">{peer.name}</p>
                <p className="peer-meta">
                  {peer.distance} • Signal: {peer.signal}%
                </p>
                {isSynced && results && (
                  <p className="peer-result">
                    ✅ Synced {results.length} report{results.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="peer-action">
                {isSyncing ? (
                  <Loader size={20} className="spin" color="#E24B4A" />
                ) : isSynced ? (
                  <Check size={20} color="#4CAF50" />
                ) : (
                  <span className="tap-hint">Tap to sync</span>
                )}
              </div>
            </div>
          );
        })}

        {peers.length === 0 && scanning && (
          <div className="empty-state small">
            <Loader size={24} className="spin" color="#999" />
            <p>Looking for devices…</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {syncedPeers.size > 0 && (
        <div className="sync-summary">
          <Check size={16} color="#4CAF50" />
          <span>
            Synced with {syncedPeers.size} device{syncedPeers.size !== 1 ? 's' : ''} •{' '}
            {Object.values(syncResults).reduce((sum, r) => sum + r.length, 0)} reports received
          </span>
        </div>
      )}
    </div>
  );
}
