import React from 'react';

const FIELD_LABELS = {
  injuredCount: 'Injured Count',
  notes: 'Notes',
  location: 'Location',
  priority: 'Priority',
  volunteersRequired: 'Volunteers Required',
};

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return 'just now';
}

function renderValue(fieldName, val) {
  if (val === undefined || val === null) return 'N/A';
  if (fieldName === 'volunteersRequired') return val.value ? 'Yes — needed' : 'No';
  if (fieldName === 'priority') {
    const pv = String(val.value);
    return pv.charAt(0).toUpperCase() + pv.slice(1).toLowerCase();
  }
  if (val.value !== undefined) return String(val.value);
  if (val.lat !== undefined && val.lon !== undefined) {
    const lm = val.landmark?.value ?? val.landmark ?? '';
    return `${val.lat.toFixed ? val.lat.toFixed(5) : val.lat}, ${val.lon.toFixed ? val.lon.toFixed(5) : val.lon}${lm ? ` (${lm})` : ''}`;
  }
  return JSON.stringify(val);
}

export function ConflictResolver({ reportId, fieldName, fieldData, onResolve }) {
  if (!fieldData || !fieldData.conflict) return null;

  const { versionA, versionB } = fieldData;
  const label = FIELD_LABELS[fieldName] ?? fieldName;

  return (
    <div className="conflict-card">
      <h4 className="conflict-heading">⚡ Conflict: {label}</h4>
      <div className="conflict-panels">

        {/* Version A — Server */}
        <div className="conflict-panel panel-server">
          <div className="panel-label">Version A — Server</div>
          <div className="panel-body">
            <p>
              <strong>Device:</strong>{' '}
              <code>{versionA.updatedBy?.slice(0, 8) ?? 'unknown'}</code>
            </p>
            <p>
              <strong>Value:</strong> {renderValue(fieldName, versionA)}
            </p>
            <p className="panel-time">
              <strong>Updated:</strong> {timeAgo(versionA.timestamp)}
              <br />
              <small>{new Date(versionA.timestamp).toLocaleString()}</small>
            </p>
          </div>
          <button
            className="accept-btn btn-blue"
            onClick={() => onResolve(reportId, fieldName, versionA)}
          >
            Accept Server Version
          </button>
        </div>

        {/* Version B — Local */}
        <div className="conflict-panel panel-local">
          <div className="panel-label">Version B — Yours</div>
          <div className="panel-body">
            <p>
              <strong>Device:</strong>{' '}
              <code>{versionB.updatedBy?.slice(0, 8) ?? 'unknown'}</code>
            </p>
            <p>
              <strong>Value:</strong> {renderValue(fieldName, versionB)}
            </p>
            <p className="panel-time">
              <strong>Updated:</strong> {timeAgo(versionB.timestamp)}
              <br />
              <small>{new Date(versionB.timestamp).toLocaleString()}</small>
            </p>
          </div>
          <button
            className="accept-btn btn-amber"
            onClick={() => onResolve(reportId, fieldName, versionB)}
          >
            Accept Your Version
          </button>
        </div>

      </div>
    </div>
  );
}
