import React, { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';

const DUMMY_ALERTS = [
  { id: '1', lat: 34.0522, lon: -118.2437, priority: 'High', injuredCount: 5, volunteersNeeded: 3, locationName: 'Downtown Main St.' },
  { id: '2', lat: 34.0622, lon: -118.2537, priority: 'Medium', injuredCount: 2, volunteersNeeded: 1, locationName: 'Westlake District' },
];

export function MapScreen({ onNavigateToReport }) {
  const [filter, setFilter] = useState('All');

  // Priority color map
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'var(--primary-red)';
      case 'Medium': return 'var(--status-busy)';
      case 'Low': return 'var(--status-available)';
      default: return 'var(--primary-black)';
    }
  };

  const filteredAlerts = filter === 'All' 
    ? DUMMY_ALERTS 
    : DUMMY_ALERTS.filter(a => a.priority === filter);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#E0E7EA' }}>
      {/* Map visual placeholder */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.3)', backgroundImage: 'radial-gradient(circle, #CFD8DC 2px, transparent 2px)', backgroundSize: '30px 30px' }}>
        <p className="heading-md" style={{ position: 'absolute', opacity: 0.5 }}>Map View Placeholder</p>

        {/* User own location fake dot */}
        <div style={{
          position: 'absolute',
          width: '24px',
          height: '24px',
          backgroundColor: '#4285F4',
          borderRadius: '50%',
          border: '3px solid white',
          boxShadow: '0 0 0 5px rgba(66, 133, 244, 0.3)',
          animation: 'pulse 2s infinite'
        }} />
      </div>

      {/* Filter Pills */}
      <div className="flex-row gap-8 hide-scrollbar" style={{ position: 'absolute', top: 24, left: 16, right: 16, overflowX: 'auto', zIndex: 10 }}>
        {['All', 'High', 'Medium', 'Low'].map(f => (
          <button 
            key={f}
            className={`pill-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* FAB */}
      <button 
        style={{
          position: 'absolute',
          bottom: 180, // Above the bottom sheet
          right: 16,
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: 'var(--primary-black)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10,
          cursor: 'pointer'
        }}
        onClick={onNavigateToReport}
      >
        <Plus size={28} />
      </button>

      {/* Bottom Sheet for Nearby Alerts */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--card-bg)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: '20px 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
        zIndex: 5
      }}>
        <h3 className="heading-md" style={{ padding: '0 20px', marginBottom: 16, fontSize: '20px' }}>Nearby alerts</h3>
        
        <div className="flex-row gap-16 hide-scrollbar" style={{ overflowX: 'auto', padding: '0 20px' }}>
          {filteredAlerts.length > 0 ? filteredAlerts.map(alert => (
            <div key={alert.id} className="card flex-col gap-8" style={{ border: '1px solid rgba(0,0,0,0.05)', minWidth: 220, borderLeft: `4px solid ${getPriorityColor(alert.priority)}`, borderRadius: 16 }}>
              <div className="flex-row justify-space-between align-center">
                <span style={{ fontWeight: 600, fontSize: 16 }}>{alert.locationName}</span>
                <span className="pill-chip" style={{ padding: '4px 8px', fontSize: 12, backgroundColor: getPriorityColor(alert.priority), color: '#FFF' }}>
                  {alert.priority}
                </span>
              </div>
              <div className="flex-row align-center gap-8 text-muted body-text">
                <AlertTriangle size={16} /> {alert.injuredCount} injured
              </div>
              <div className="body-text" style={{ fontWeight: 600 }}>
                {alert.volunteersNeeded} volunteers needed
              </div>
            </div>
          )) : (
            <div className="text-muted body-text">No alerts for this filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
