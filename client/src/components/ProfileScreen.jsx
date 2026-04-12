import React, { useState } from 'react';
import { syncWithServer, syncWithPeer, isOnline } from '../services/sync.js';
import { getDeviceId } from '../services/deviceId.js';

export function ProfileScreen({ volunteerId, onLogout }) {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [peerIp, setPeerIp] = useState('');
  const [p2pSyncStatus, setP2pSyncStatus] = useState('idle');

  const handleSync = async () => {
    if (!isOnline()) {
      setSyncStatus('offline');
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }
    
    setSyncStatus('syncing');
    
    try {
      await syncWithServer();
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleP2PSync = async () => {
    if (!peerIp) return;
    try {
      setP2pSyncStatus('syncing');
      await syncWithPeer(peerIp);
      setP2pSyncStatus('done');
      setTimeout(() => setP2pSyncStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setP2pSyncStatus('error');
      setTimeout(() => setP2pSyncStatus('idle'), 3000);
    }
  };

  return (
    <div className="screen-content hide-scrollbar" style={{ overflowY: 'auto' }}>
      <h1 className="heading-lg" style={{ marginBottom: 24 }}>Profile</h1>
      
      <div className="card flex-row align-center gap-16" style={{ marginBottom: 24, border: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="avatar available">
          {volunteerId === 'OfflineUser' ? 'OF' : volunteerId?.slice(0, 2).toUpperCase() || 'VI'}
        </div>
        <div className="flex-col spacer gap-4">
          <div style={{ fontWeight: 700, fontSize: 16 }}>{volunteerId === 'OfflineUser' ? 'Offline User' : volunteerId}</div>
          <div className="text-muted body-text">Device: {getDeviceId().slice(0, 8)}...</div>
        </div>
      </div>

      <h2 className="heading-md" style={{ fontSize: 20, marginBottom: 16 }}>Sync Settings</h2>

      <div className="card flex-col gap-16" style={{ marginBottom: 24, border: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="flex-col gap-8">
          <div style={{ fontWeight: 600 }}>Server Sync</div>
          <p className="body-text text-muted">Sync your pending reports to the main server.</p>
        </div>
        
        <button 
          className="btn-pill btn-black" 
          onClick={handleSync}
          disabled={syncStatus === 'syncing'}
        >
          {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
        </button>
        
        {syncStatus !== 'idle' && (
          <div className="body-text text-muted" style={{ textAlign: 'center' }}>
            {syncStatus === 'done' && <span style={{ color: 'var(--status-available)' }}>Synced successfully ✓</span>}
            {syncStatus === 'error' && <span style={{ color: 'var(--primary-red)' }}>Sync failed</span>}
            {syncStatus === 'offline' && <span>You are offline</span>}
          </div>
        )}
      </div>

      <div className="card flex-col gap-16" style={{ marginBottom: 24, border: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="flex-col gap-8">
          <div style={{ fontWeight: 600 }}>P2P Local Sync</div>
          <p className="body-text text-muted">Sync directly with a device on the local network.</p>
        </div>
        
        <input 
          type="text" 
          className="input-field"
          style={{ marginBottom: 0 }}
          placeholder="e.g. 192.168.1.50" 
          value={peerIp} 
          onChange={(e) => setPeerIp(e.target.value)}
        />
        
        <button 
          className="btn-pill btn-outline" 
          onClick={handleP2PSync}
          disabled={p2pSyncStatus === 'syncing' || !peerIp}
        >
          {p2pSyncStatus === 'syncing' ? 'Syncing...' : 'Sync with Peer'}
        </button>
        
        {p2pSyncStatus !== 'idle' && (
          <div className="body-text text-muted" style={{ textAlign: 'center' }}>
            {p2pSyncStatus === 'done' && <span style={{ color: 'var(--status-available)' }}>P2P Sync Output Success ✓</span>}
            {p2pSyncStatus === 'error' && <span style={{ color: 'var(--primary-red)' }}>Sync failed. Check IP.</span>}
          </div>
        )}
      </div>

      <div className="spacer" />

      <button className="btn-pill btn-outline" style={{ border: 'none', color: 'var(--primary-red)' }} onClick={onLogout}>
        Sign Out
      </button>

      <div style={{ minHeight: 24 }} />
    </div>
  );
}
