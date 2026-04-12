import React, { useState, useEffect } from 'react';
import { initDB, getReports, updateReport } from './db/db.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { MapScreen } from './components/MapScreen.jsx';
import { ReportForm } from './components/ReportForm.jsx';
import { ProfileScreen } from './components/ProfileScreen.jsx';

import { Map as MapIcon, PlusCircle, User } from 'lucide-react';

import './index.css';
import './App.css';

function App() {
  const [currentTab, setCurrentTab] = useState('login'); 
  const [volunteerId, setVolunteerId] = useState(null);
  const [reports, setReports] = useState([]);

  const fetchReports = async () => {
    try {
      const data = await getReports();
      setReports(data || []);
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

  // Set up polling to refresh reports periodically from SQLite
  useEffect(() => {
    if (currentTab !== 'login') {
      const interval = setInterval(fetchReports, 5000);
      return () => clearInterval(interval);
    }
  }, [currentTab]);

  const handleLogin = (id) => {
    setVolunteerId(id);
    setCurrentTab('map');
  };

  const handleLogout = () => {
    setVolunteerId(null);
    setCurrentTab('login');
  };

  const handleResolve = async (reportId, fieldName, chosenVersion) => {
    const report = reports.find(r => r.reportId === reportId);
    if (!report) return;
    
    report[fieldName] = chosenVersion;
    report.syncStatus = 'pending';
    
    const hasMoreConflicts = Object.values(report).some(
      v => v && typeof v === 'object' && v.conflict
    );
    if (!hasMoreConflicts) {
      report.syncStatus = 'pending'; 
    } else {
      report.syncStatus = 'conflict';
    }
    
    await updateReport(report.reportId, report);
    fetchReports();
  };

  const renderScreen = () => {
    switch (currentTab) {
      case 'map':
        return <MapScreen onNavigateToReport={() => setCurrentTab('report')} reports={reports} />;
      case 'report':
        return <ReportForm onReportAdded={() => { fetchReports(); setCurrentTab('map'); }} />;
      case 'profile':
        return <ProfileScreen volunteerId={volunteerId} onLogout={handleLogout} reports={reports} onResolve={handleResolve} />;
      default:
        return <MapScreen onNavigateToReport={() => setCurrentTab('report')} reports={reports} />;
    }
  };

  if (currentTab === 'login') {
    return (
      <div className="app-container">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <main className="main-content">
        {renderScreen()}
      </main>

      <nav className="bottom-tab-bar">
        <button 
          className={`tab-btn ${currentTab === 'map' ? 'active' : ''}`}
          onClick={() => setCurrentTab('map')}
        >
          <div className="tab-icon"><MapIcon /></div>
          {currentTab === 'map' && <div className="tab-indicator" />}
        </button>
        <button 
          className={`tab-btn ${currentTab === 'report' ? 'active' : ''}`}
          onClick={() => setCurrentTab('report')}
        >
          <div className="tab-icon"><PlusCircle /></div>
          {currentTab === 'report' && <div className="tab-indicator" />}
        </button>
        <button 
          className={`tab-btn ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentTab('profile')}
        >
          <div className="tab-icon"><User /></div>
          {currentTab === 'profile' && <div className="tab-indicator" />}
        </button>
      </nav>
    </div>
  );
}

export default App;