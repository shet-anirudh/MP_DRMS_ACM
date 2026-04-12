import React, { useState } from 'react';

export function LoginScreen({ onLogin }) {
  const [volunteerId, setVolunteerId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (volunteerId) {
      onLogin(volunteerId);
    }
  };

  return (
    <div className="screen-content justify-space-between" style={{ backgroundColor: 'var(--bg-color)' }}>
      <div className="flex-col gap-24" style={{ marginTop: '40px' }}>
        <h1 className="heading-lg">DisasterSync</h1>
        <h2 className="heading-md">Hi, Volunteer!</h2>
        
        <form className="flex-col" onSubmit={handleSubmit}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Volunteer ID / Email" 
            value={volunteerId}
            onChange={(e) => setVolunteerId(e.target.value)}
          />
          <input 
            type="password" 
            className="input-field" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <div className="spacer" style={{ minHeight: '40px' }} />
          
          <div className="flex-col gap-16">
            <button type="submit" className="btn-pill btn-black" disabled={!volunteerId}>
              Sign in
            </button>
            <button type="button" className="btn-pill btn-outline" onClick={() => onLogin('OfflineUser')}>
              Continue offline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
