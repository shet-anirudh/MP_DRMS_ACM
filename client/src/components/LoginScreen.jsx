import React, { useState } from 'react';
import { ShieldAlert, Wifi } from 'lucide-react';

export function LoginScreen({ onLogin }) {
  const [volunteerId, setVolunteerId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!volunteerId.trim()) {
      setError('Please enter your Volunteer ID.');
      return;
    }
    setLoading(true);
    setError('');
    // Simulate login — in production this would hit an auth endpoint
    await new Promise(res => setTimeout(res, 600));
    setLoading(false);
    onLogin(volunteerId.trim());
  };

  const handleOffline = () => {
    onLogin('offline-user');
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <ShieldAlert size={48} color="#E24B4A" />
        </div>
        <h1 className="login-title">DRMS</h1>
        <p className="login-subtitle">Disaster Response Management System</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="volunteerId">Volunteer ID</label>
            <input
              id="volunteerId"
              type="text"
              placeholder="e.g. VOL-2024-001"
              value={volunteerId}
              onChange={e => setVolunteerId(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            id="btn-login"
            type="submit"
            className="btn-pill btn-primary-red"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          id="btn-continue-offline"
          type="button"
          className="btn-pill btn-outline offline-btn"
          onClick={handleOffline}
        >
          <Wifi size={16} />
          Continue Offline
        </button>

        <p className="login-hint">
          Offline mode stores reports locally and syncs when connectivity is restored.
        </p>
      </div>
    </div>
  );
}
