import React, { useState, useEffect } from 'react';
import { initDB } from './db/db.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { MapScreen } from './components/MapScreen.jsx';
import { VolunteersScreen } from './components/VolunteersScreen.jsx';
import { ReportForm } from './components/ReportForm.jsx';
import { ProfileScreen } from './components/ProfileScreen.jsx';

import { Map as MapIcon, Users, PlusCircle, User } from 'lucide-react';

import './index.css';
import './App.css';

function App() {
  const [currentTab, setCurrentTab] = useState('login'); // 'login', 'map', 'volunteers', 'report', 'profile'
  const [volunteerId, setVolunteerId] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        console.log("DB ready");
      } catch (err) {
        console.error("DB init failed", err);
      }
    };
    init();
  }, []);

  const handleLogin = (id) => {
    setVolunteerId(id);
    setCurrentTab('map');
  };

  const handleLogout = () => {
    setVolunteerId(null);
    setCurrentTab('login');
  };

  const renderScreen = () => {
    switch (currentTab) {
      case 'map':
        return <MapScreen onNavigateToReport={() => setCurrentTab('report')} />;
      case 'volunteers':
        return <VolunteersScreen />;
      case 'report':
        return <ReportForm onReportAdded={() => setCurrentTab('map')} />;
      case 'profile':
        return <ProfileScreen volunteerId={volunteerId} onLogout={handleLogout} />;
      default:
        return <MapScreen onNavigateToReport={() => setCurrentTab('report')} />;
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
          className={`tab-btn ${currentTab === 'volunteers' ? 'active' : ''}`}
          onClick={() => setCurrentTab('volunteers')}
        >
          <div className="tab-icon"><Users /></div>
          {currentTab === 'volunteers' && <div className="tab-indicator" />}
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