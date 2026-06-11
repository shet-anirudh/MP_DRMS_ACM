import React, { useState } from 'react';
import {
  User, Server, Smartphone, Radio, AlertCircle, CheckCircle,
  Loader, ChevronRight, ChevronDown, ChevronUp, Zap
} from 'lucide-react';

export function ProfileScreen({
  volunteerId,
  reports,
  onServerSync,
  onPeerSync,
  onNearbySync,   // () => void — opens the PeerSyncScreen
  syncStatus,
  onLogout,
}) {
  const [peerIp, setPeerIp] = useState('');
  const [peerStatus, setPeerStatus] = useState('idle'); // idle | syncing | done | error
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const deviceId = (() => {
    try { return localStorage.getItem('deviceId') || 'unknown'; } catch { return 'unknown'; }
  })();

  const conflictReports = reports.filter(r => r.syncStatus === 'conflict');
  const pendingReports  = reports.filter(r => r.syncStatus === 'pending');

  const handlePeerSync = async () => {
    if (!peerIp.trim()) return;
    setPeerStatus('syncing');
    try {
      await onPeerSync(peerIp.trim());
      setPeerStatus('done');
      setTimeout(() => setPeerStatus('idle'), 3000);
    } catch {
      setPeerStatus('error');
      setTimeout(() => setPeerStatus('idle'), 3000);
    }
  };

  return (
    <div className="profile-screen">
      {/* Avatar header */}
      <div className="profile-header">
        <div className="profile-avatar">
          <User size={36} color="#E24B4A" />
        </div>
        <div className="profile-info">
          <p className="profile-name">{volunteerId}</p>
          <p className="profile-device-id">Device: {deviceId.slice(0, 8)}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <p className="stat-value">{reports.length}</p>
          <p className="stat-label">Total</p>
        </div>
        <div className="stat-card stat-warn">
          <p className="stat-value">{pendingReports.length}</p>
          <p className="stat-label">Pending</p>
        </div>
        <div className="stat-card stat-danger">
          <p className="stat-value">{conflictReports.length}</p>
          <p className="stat-label">Conflicts</p>
        </div>
      </div>

      {/* Server Sync */}
      <div className="profile-section">
        <h3 className="section-label"><Server size={16} /> Server Sync</h3>
        <button
          id="btn-server-sync"
          className="btn-pill btn-primary-red"
          onClick={onServerSync}
          disabled={syncStatus === 'syncing'}
        >
          {syncStatus === 'syncing' ? (
            <><Loader size={14} className="spin" /> Syncing…</>
          ) : syncStatus === 'done' ? (
            <><CheckCircle size={14} /> Synced ✓</>
          ) : syncStatus === 'error' ? (
            <><AlertCircle size={14} /> Retry Sync</>
          ) : (
            'Sync with Server'
          )}
        </button>
        {syncStatus === 'error' && (
          <p className="hint-text error-text">Sync failed. Check your connection.</p>
        )}
        {syncStatus === 'offline' && (
          <p className="hint-text">You are offline. Reports saved locally.</p>
        )}
      </div>

      {/* Nearby P2P Sync — primary */}
      <div className="profile-section profile-section-nearby">
        <h3 className="section-label"><Radio size={16} /> Nearby Device Sync</h3>
        <p className="hint-text">
          Automatically discover and sync with volunteers nearby — no internet or IP address needed.
        </p>
        <button
          id="btn-nearby-sync"
          className="btn-pill btn-nearby"
          onClick={onNearbySync}
        >
          <Zap size={14} />
          Find Nearby Devices
        </button>

        {/* Advanced accordion — manual LAN IP fallback */}
        <button
          className="nearby-advanced-toggle"
          onClick={() => setAdvancedOpen(o => !o)}
          id="btn-advanced-toggle"
        >
          {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Advanced: Manual IP Sync
        </button>

        {advancedOpen && (
          <div className="nearby-advanced-panel">
            <p className="hint-text">
              For laptop-to-device sync on the same WiFi network. Enter the device's local IP.
            </p>
            <div className="peer-input-row">
              <input
                id="peer-ip-input"
                type="text"
                placeholder="192.168.1.50"
                value={peerIp}
                onChange={e => setPeerIp(e.target.value)}
                className="peer-ip-input"
              />
              <button
                id="btn-peer-sync"
                className="btn-pill btn-black"
                onClick={handlePeerSync}
                disabled={peerStatus === 'syncing' || !peerIp.trim()}
              >
                {peerStatus === 'syncing' ? <Loader size={14} className="spin" /> : <Smartphone size={14} />}
                {peerStatus === 'syncing' ? 'Syncing…' :
                 peerStatus === 'done'    ? 'Done ✓'   :
                 peerStatus === 'error'   ? 'Failed'   : 'Sync'}
              </button>
            </div>
            {peerStatus === 'error' && (
              <p className="hint-text error-text">Could not reach peer device.</p>
            )}
          </div>
        )}
      </div>

      {/* Conflicts */}
      {conflictReports.length > 0 && (
        <div className="profile-section">
          <h3 className="section-label">
            <AlertCircle size={16} color="#E24B4A" /> Conflicts ({conflictReports.length})
          </h3>
          <div className="conflict-summary-list">
            {conflictReports.map(r => (
              <div key={r.reportId} className="conflict-summary-item">
                <div>
                  <p className="alert-id">#{r.reportId.slice(0, 8)}</p>
                  <p className="hint-text">{r.notes?.value ?? 'No notes'}</p>
                </div>
                <ChevronRight size={16} color="#999" />
              </div>
            ))}
          </div>
          <p className="hint-text">Go to <strong>Reports</strong> tab to resolve conflicts.</p>
        </div>
      )}

      {/* Logout */}
      <div className="profile-section">
        <button
          id="btn-logout"
          className="btn-pill btn-outline"
          onClick={onLogout}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
