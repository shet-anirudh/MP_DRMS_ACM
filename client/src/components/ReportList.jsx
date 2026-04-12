import React from 'react';
import { ConflictResolver } from './ConflictResolver.jsx';

export function ReportList({ reports, onResolve }) {
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
          <div className="report-header">
            <strong>ID: {report.reportId.substring(0, 8)}</strong>
            <span className={`sync-badge ${getStatusClass(report.syncStatus)}`}>
              {report.syncStatus}
            </span>
          </div>
          <div className="report-body">
            {renderNormalField('Injured Count', report.injuredCount, 'injuredCount')}
            {renderNormalField('Notes', report.notes, 'notes')}
            {renderNormalField('Location', report.location, 'location')}
            
            {report.syncStatus === 'conflict' && (
              <div className="conflicts-container">
                {['injuredCount', 'notes', 'location'].map(field => {
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
