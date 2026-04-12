import React, { useEffect, useState } from 'react';
import { initDB, getReports, updateReport } from './db/db.js';
import { syncWithServer, syncWithPeer, isOnline } from './services/sync.js';
import { getDeviceId } from './services/deviceId.js';
import { ReportForm } from './components/ReportForm.jsx';
import { ReportList } from './components/ReportList.jsx';
import { MapView } from './components/MapView.jsx';
import './App.css';

function App() {
  const [reports, setReports] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [peerIp, setPeerIp] = useState('');
  const [p2pSyncStatus, setP2pSyncStatus] = useState('idle');
  const [showMap, setShowMap] = useState(false);

  const fetchReports = async () => {
    try {
      const allReports = await getReports();
      setReports(allReports);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        console.log("DB ready");
        await fetchReports();
      } catch (err) {
        console.error("DB init failed", err);
      }
    };

    init();
  }, []);

  const handleReportAdded = () => {
    fetchReports();
  };

  const handleResolve = async (reportId, fieldName, chosenVersion) => {
    // 1. Get the current report from local DB
    const allReports = await getReports();
    const report = allReports.find(r => r.reportId === reportId);
    if (!report) return;

    // 2. Replace the conflicting field with the chosen version
    // CRITICAL: We give it a NEW timestamp (Date.now()) so it beats the server's old version!
    // Using spread (...chosenVersion) ensures we retain field variations safely (like .value vs .lat/.lon for location).
    const resolvedField = {
      ...chosenVersion,
      timestamp: Date.now(),
      updatedBy: getDeviceId()
    };

    // 3. Build the updated report
    const updatedReport = {
      ...report,
      [fieldName]: resolvedField
    };

    // 4. Check if any OTHER fields still have conflicts
    const stillConflicted = ['injuredCount', 'notes', 'location']
      .some(f => f !== fieldName && updatedReport[f]?.conflict === true);

    // If no other fields are conflicted, set status to pending so we can push to server seamlessly.
    updatedReport.syncStatus = stillConflicted ? 'conflict' : 'pending';

    // 5. Save to IndexedDB
    await updateReport(reportId, updatedReport);

    // 6. Refresh the report list
    const fresh = await getReports();
    setReports(fresh);

    console.log(`Resolved ${fieldName}. New status: ${updatedReport.syncStatus}`);
  };

  const handleSync = async () => {
    if (!isOnline()) {
      setSyncStatus('offline');
      setTimeout(() => setSyncStatus('idle'), 3000);
      return;
    }
    
    setSyncStatus('syncing');
    
    try {
      const updated = await syncWithServer();
      setReports(updated);
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
      const updated = await syncWithPeer(peerIp);
      setReports(updated);
      setP2pSyncStatus('done');
      setTimeout(() => setP2pSyncStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setP2pSyncStatus('error');
      setTimeout(() => setP2pSyncStatus('idle'), 3000);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Disaster Response App</h1>
        <div className="sync-controls">
          <button 
            onClick={() => setShowMap(!showMap)} 
            className="sync-btn"
            style={{ background: showMap ? '#e1b12c' : '#44bd32', marginRight: '10px' }}
          >
            {showMap ? 'Hide Map' : 'MAP VIEW'}
          </button>
          <button 
            onClick={handleSync} 
            disabled={syncStatus === 'syncing'}
            className="sync-btn"
          >
            Sync Now
          </button>
          
          {syncStatus !== 'idle' && (
            <span className="sync-status">
              {syncStatus === 'syncing' && 'Syncing...'}
              {syncStatus === 'done' && 'Synced ✓'}
              {syncStatus === 'error' && 'Sync failed'}
              {syncStatus === 'offline' && 'You are offline'}
            </span>
          )}
        </div>
      </header>
      <main>
        {showMap ? (
          <div style={{ padding: '0 20px 20px 20px' }}>
            <MapView reports={reports} />
          </div>
        ) : (
        <div className="layout-grid">
          <section className="form-section">
            <h2>Add New Report</h2>
            <ReportForm onReportAdded={handleReportAdded} />
            
            <div className="p2p-card" style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ marginTop: 0 }}>P2P Local Sync</h3>
              <p style={{ fontSize: '0.85rem', color: '#a4b0be', marginBottom: '1rem' }}>
                Sync directly with a device on the local network.
              </p>
              <input 
                type="text" 
                placeholder="192.168.1.50" 
                value={peerIp} 
                onChange={(e) => setPeerIp(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }}
              />
              <button 
                onClick={handleP2PSync} 
                disabled={p2pSyncStatus === 'syncing' || !peerIp}
                style={{ width: '100%', padding: '0.8rem', background: p2pSyncStatus === 'syncing' ? 'var(--bg-color)' : '#9b59b6', color: 'white', border: 'none', borderRadius: '4px', cursor: p2pSyncStatus === 'syncing' ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {p2pSyncStatus === 'syncing' ? 'Syncing...' : 'Sync with Peer'}
              </button>
              {p2pSyncStatus === 'done' && <p style={{ color: '#2ed573', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center', marginBottom: 0 }}>P2P Success!</p>}
              {p2pSyncStatus === 'error' && <p style={{ color: '#ff4757', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center', marginBottom: 0 }}>Sync failed. Check IP.</p>}
            </div>
          </section>
          <section className="list-section">
            <h2>Recent Reports</h2>
            <ReportList reports={reports} onResolve={handleResolve} />
          </section>
        </div>
        )}
      </main>
    </div>
  );
}

export default App;