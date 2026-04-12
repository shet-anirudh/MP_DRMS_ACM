import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Map, FileText, User } from 'lucide-react';

import { initDB, getReports, updateReport } from './db/db.js';
import { syncWithServer, syncWithPeer, isOnline } from './services/sync.js';
import { getDeviceId } from './services/deviceId.js';

import { LoginScreen }    from './components/LoginScreen.jsx';
import { MapScreen }      from './components/MapScreen.jsx';
import { ReportForm }     from './components/ReportForm.jsx';
import { ReportList }     from './components/ReportList.jsx';
import { ProfileScreen }  from './components/ProfileScreen.jsx';

import './App.css';

const TABS = [
  { id: 'map',     label: 'Map',     Icon: Map },
  { id: 'reports', label: 'Reports', Icon: FileText },
  { id: 'profile', label: 'Profile', Icon: User },
];

function App() {
  // ─── Auth ───────────────────────────────────────────────────────────────────
  const [volunteerId, setVolunteerId] = useState(() => localStorage.getItem('volunteerId') || null);

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]     = useState('map');
  const [showForm, setShowForm]       = useState(false);
  const [editingReport, setEditingReport] = useState(null);

  // ─── Data ────────────────────────────────────────────────────────────────────
  const [reports, setReports]         = useState([]);
  const [dbReady, setDbReady]         = useState(false);

  // ─── Sync state ──────────────────────────────────────────────────────────────
  const [syncStatus, setSyncStatus]   = useState('idle'); // idle|syncing|done|error|offline
  const pollingRef = useRef(null);

  // ─── DB initialisation ───────────────────────────────────────────────────────
  useEffect(() => {
    initDB()
      .then(() => {
        setDbReady(true);
        fetchReports();
      })
      .catch(err => console.error('DB init failed:', err));
  }, []);

  // ─── 5-second polling while logged in ───────────────────────────────────────
  useEffect(() => {
    if (!dbReady || !volunteerId) return;
    pollingRef.current = setInterval(fetchReports, 5000);
    return () => clearInterval(pollingRef.current);
  }, [dbReady, volunteerId]);

  const fetchReports = useCallback(async () => {
    try {
      const all = await getReports();
      setReports(all);
    } catch (err) {
      console.error('fetchReports failed:', err);
    }
  }, []);

  // ─── Login / logout ──────────────────────────────────────────────────────────
  const handleLogin = (id) => {
    localStorage.setItem('volunteerId', id);
    setVolunteerId(id);
  };

  const handleLogout = () => {
    localStorage.removeItem('volunteerId');
    setVolunteerId(null);
  };

  // ─── Conflict resolution ─────────────────────────────────────────────────────
  const handleResolve = useCallback(async (reportId, fieldName, chosenVersion) => {
    const allReports = await getReports();
    const report = allReports.find(r => r.reportId === reportId);
    if (!report) return;

    const resolvedField = {
      ...chosenVersion,
      timestamp: Date.now(),
      updatedBy: getDeviceId(),
    };

    const updatedReport = { ...report, [fieldName]: resolvedField };

    const stillConflicted = ['injuredCount', 'notes', 'location', 'priority', 'volunteersRequired']
      .some(f => f !== fieldName && updatedReport[f]?.conflict === true);

    updatedReport.syncStatus = stillConflicted ? 'conflict' : 'pending';
    await updateReport(reportId, updatedReport);
    await fetchReports();
  }, [fetchReports]);

  // ─── Server sync ─────────────────────────────────────────────────────────────
  const handleServerSync = useCallback(async () => {
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
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, []);

  // ─── P2P sync (called from Profile screen) ───────────────────────────────────
  const handlePeerSync = useCallback(async (peerIp) => {
    const updated = await syncWithPeer(peerIp);
    setReports(updated);
  }, []);

  // ─── Report form helpers ──────────────────────────────────────────────────────
  const handleReportAdded = useCallback(() => {
    fetchReports();
    setShowForm(false);
    setEditingReport(null);
    setActiveTab('reports');
  }, [fetchReports]);

  const handleEditReport = useCallback((report) => {
    setEditingReport(report);
    setShowForm(true);
    setActiveTab('reports');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingReport(null);
    setShowForm(false);
  }, []);

  // ─── If not yet logged in ────────────────────────────────────────────────────
  if (!volunteerId) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const conflictCount = reports.filter(r => r.syncStatus === 'conflict').length;

  return (
    <div className="app-shell">

      {/* ── Tab content ── */}
      <div className="tab-content">

        {/* MAP TAB */}
        {activeTab === 'map' && (
          <MapScreen
            reports={reports}
            onAddReport={() => { setShowForm(true); setEditingReport(null); setActiveTab('reports'); }}
          />
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="reports-tab">
            {showForm ? (
              <div className="form-page">
                <div className="form-page-header">
                  <h2>{editingReport ? 'Edit Report' : 'New Report'}</h2>
                  <button className="icon-btn" onClick={handleCancelEdit}>✕</button>
                </div>
                <ReportForm
                  onReportAdded={handleReportAdded}
                  editingReport={editingReport}
                  onCancelEdit={handleCancelEdit}
                />
              </div>
            ) : (
              <div className="list-page">
                <div className="list-page-header">
                  <h2>Reports</h2>
                  <button
                    id="btn-new-report"
                    className="btn-pill btn-primary-red btn-sm"
                    onClick={() => { setShowForm(true); setEditingReport(null); }}
                  >
                    + New
                  </button>
                </div>
                {reports.length === 0 ? (
                  <div className="empty-state">
                    <FileText size={48} color="#ccc" />
                    <p>No reports yet. Tap <strong>+ New</strong> to add your first.</p>
                  </div>
                ) : (
                  <ReportList
                    reports={reports}
                    onResolve={handleResolve}
                    onEditReport={handleEditReport}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <ProfileScreen
            volunteerId={volunteerId}
            reports={reports}
            onServerSync={handleServerSync}
            onPeerSync={handlePeerSync}
            syncStatus={syncStatus}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* ── Bottom tab bar ── */}
      <nav className="bottom-tab-bar">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const badge = id === 'profile' && conflictCount > 0 ? conflictCount : null;
          return (
            <button
              key={id}
              id={`tab-${id}`}
              className={`tab-btn-nav ${isActive ? 'tab-active-nav' : ''}`}
              onClick={() => { setActiveTab(id); setShowForm(false); setEditingReport(null); }}
            >
              <div className="tab-icon-wrap">
                <Icon size={22} />
                {badge && <span className="tab-badge">{badge}</span>}
              </div>
              <span className="tab-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;