import React from 'react';

export function ConflictResolver({ reportId, fieldName, fieldData, onResolve }) {
  if (!fieldData || !fieldData.conflict) return null;

  const formatDate = (ts) => new Date(ts).toLocaleString();
  
  const renderValue = (val) => {
    if (val === undefined || val === null) return 'N/A';
    if (fieldName === 'volunteersRequired') return val.value ? 'Yes' : 'No';
    if (fieldName === 'priority') return String(val.value).toUpperCase();
    if (val.value !== undefined) return val.value;
    if (val.lat !== undefined && val.lon !== undefined) return `${val.lat}, ${val.lon}`;
    return JSON.stringify(val);
  };

  return (
    <div className="conflict-card">
      <h4 className="conflict-heading">Conflict: {fieldName}</h4>
      <div className="conflict-panels">
        
        <div className="conflict-panel panel-server">
          <div className="panel-label">Version A (Server)</div>
          <div className="panel-body">
            <p><strong>Device:</strong> {fieldData.versionA.updatedBy}</p>
            <p><strong>Value:</strong> {renderValue(fieldData.versionA)}</p>
            <p><strong>Updated at:</strong> {formatDate(fieldData.versionA.timestamp)}</p>
          </div>
          <button 
            className="accept-btn btn-blue"
            onClick={() => onResolve(reportId, fieldName, fieldData.versionA)}
          >
            Accept A
          </button>
        </div>

        <div className="conflict-panel panel-local">
          <div className="panel-label">Version B (Yours)</div>
          <div className="panel-body">
            <p><strong>Device:</strong> {fieldData.versionB.updatedBy}</p>
            <p><strong>Value:</strong> {renderValue(fieldData.versionB)}</p>
            <p><strong>Updated at:</strong> {formatDate(fieldData.versionB.timestamp)}</p>
          </div>
          <button 
            className="accept-btn btn-amber"
            onClick={() => onResolve(reportId, fieldName, fieldData.versionB)}
          >
            Accept B
          </button>
        </div>

      </div>
    </div>
  );
}
