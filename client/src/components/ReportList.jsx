import React from 'react';
import { ConflictResolver } from './ConflictResolver.jsx';

export function ReportList({ reports, onResolve, onEditReport }) {
  if (!reports || reports.length === 0) {
    return <p className="no-reports">No reports yet.</p>;
  }

  const getStatusClass = (status) => {
    switch(status) {
      case 'pending': return 'badge-yellow';
      case 'synced': return 'badge-green';
      case 'conflict': return 'badge-red';
      default: return 'badge-gray';
    }
  };

  const renderNormalField = (label, data, fieldName) => {
    if (data?.conflict) return null;
    if (fieldName === 'priority') {
      const p = data?.value || 'medium';
      return (
        <p>
          <strong>{label}:</strong>{' '}
          <span style={{ 
            padding: '2px 8px', borderRadius: '4px', color: 'white', fontSize: '0.8rem', textTransform: 'uppercase',
            backgroundColor: p === 'high' ? '#e74c3c' : p === 'medium' ? '#f39c12' : '#2ecc71'
          }}>
            {p}
          </span>
        </p>
      );
    }
    if (fieldName === 'volunteersRequired') {
      if (!data?.value) return null;
      return (
        <p>
          <span style={{ background: '#9b59b6', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
            Volunteers needed
          </span>
        </p>
      );
    }
    if (fieldName === 'location') {
      return (
        <p>
          <strong>{label}:</strong>{' '}
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lon}`}
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#3498db', textDecoration: 'underline' }}
          >
            {data.lat}, {data.lon}
          </a>
        </p>
      );
    }
    return <p><strong>{label}:</strong> {data.value}</p>;
  };

  return (
    <div className="report-list">
      {reports.map((report) => (
        <div key={report.reportId} className="report-card">
          <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>ID: {report.reportId.substring(0, 8)}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(report.syncStatus === 'synced' || report.syncStatus === 'pending') && onEditReport && (
                <button 
                  onClick={() => onEditReport(report)}
                  style={{ background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Edit
                </button>
              )}
              <span className={`sync-badge ${getStatusClass(report.syncStatus)}`}>
                {report.syncStatus}
              </span>
            </div>
          </div>
          <div className="report-body">
            {renderNormalField('Injured Count', report.injuredCount, 'injuredCount')}
            {renderNormalField('Notes', report.notes, 'notes')}
            {renderNormalField('Location', report.location, 'location')}
            {renderNormalField('Priority', report.priority, 'priority')}
            {renderNormalField('Volunteers', report.volunteersRequired, 'volunteersRequired')}
            
            {report.syncStatus === 'conflict' && (
              <div className="conflicts-container">
                {['injuredCount', 'notes', 'location', 'priority', 'volunteersRequired'].map(field => {
                  if (report[field]?.conflict) {
                    return (
                      <ConflictResolver 
                        key={`${report.reportId}-${field}`}
                        reportId={report.reportId}
                        fieldName={field}
                        fieldData={report[field]}
                        onResolve={onResolve}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}
            
            <p className="updated-by">
              <em>Updated by: {report.injuredCount?.updatedBy || report.injuredCount?.versionA?.updatedBy || 'N/A'}</em>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
