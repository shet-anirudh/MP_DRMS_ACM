import React, { useState } from 'react';
import { Plus, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { MapView } from './MapView.jsx';

export function MapScreen({ onNavigateToReport, reports }) {
  const [filter, setFilter] = useState('All');
  const [isSheetExpanded, setIsSheetExpanded] = useState(true);

  // Priority color map
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'var(--primary-red)';
      case 'Medium': return 'var(--status-busy)';
      case 'Low': return 'var(--status-available)';
      default: return 'var(--primary-black)';
    }
  };

  const filteredAlerts = (reports || []).filter(a => {
     if (filter === 'All') return true;
     return a.priority === filter;
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#E0E7EA', overflow: 'hidden' }}>
      
      {/* Real Native MapView rendering under the UI layers */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
        <MapView reports={filteredAlerts} />
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
          top: 205, // Below the mapview navigation tools
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
        padding: '10px 0 20px 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
        zIndex: 5,
        transform: isSheetExpanded ? 'translateY(0)' : 'translateY(calc(100% - 60px))',
        transition: 'transform 0.3s ease-in-out'
      }}>
        <div 
          onClick={() => setIsSheetExpanded(!isSheetExpanded)} 
          style={{ display: 'flex', justifyContent: 'center', paddingBottom: '16px', cursor: 'pointer' }}
        >
          <div style={{ width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2 }} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: 16 }}>
          <h3 className="heading-md" style={{ fontSize: '20px', margin: 0 }}>Nearby alerts</h3>
          <button onClick={() => setIsSheetExpanded(!isSheetExpanded)} style={{ background: 'none', border: 'none', color: '#9A9A9A', cursor: 'pointer' }}>
            {isSheetExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>
        
        <div className="flex-row gap-16 hide-scrollbar" style={{ overflowX: 'auto', padding: '0 20px' }}>
          {filteredAlerts.length > 0 ? filteredAlerts.map(alert => (
            <div key={alert.reportId} className="card flex-col gap-8" style={{ border: '1px solid rgba(0,0,0,0.05)', minWidth: 220, borderLeft: `4px solid ${getPriorityColor(alert.priority)}`, borderRadius: 16 }}>
              <div className="flex-row justify-space-between align-center">
                <span style={{ fontWeight: 600, fontSize: 16 }}>{alert.location?.landmark || 'Unknown Location'}</span>
                <span className="pill-chip" style={{ padding: '4px 8px', fontSize: 12, backgroundColor: getPriorityColor(alert.priority), color: '#FFF', border: 'none' }}>
                  {alert.priority}
                </span>
              </div>
              <div className="flex-row align-center gap-8 text-muted body-text">
                <AlertTriangle size={16} /> {alert.injuredCount?.value || 0} injured
              </div>
              <div className="body-text" style={{ fontWeight: 600 }}>
                {alert.syncStatus === 'pending' ? 'Unsynced' : 'Synced'}
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
