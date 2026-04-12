import React, { useState, useCallback } from 'react';
import { MapPin, Filter, Plus, AlertTriangle, Users } from 'lucide-react';
import { MapView } from './MapView.jsx';
import { DownloadMapModal } from './DownloadMapModal.jsx';

const PRIORITY_COLORS = {
  High: '#E24B4A',
  Medium: '#F5A623',
  Low: '#4CAF50',
};

export function MapScreen({ reports, onAddReport }) {
  const [filter, setFilter]   = useState('All');
  const [showDownload, setShowDownload] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const filters = ['All', 'High', 'Medium', 'Low'];

  const filtered = reports.filter(r => {
    if (filter === 'All') return true;
    const pv = r.priority?.value ?? 'Medium';
    // Normalise to title-case for comparison
    const normalised = pv.charAt(0).toUpperCase() + pv.slice(1).toLowerCase();
    return normalised === filter;
  });

  const mapPins = filtered
    .filter(r => r.location && !r.location.conflict && r.location.lat && r.location.lon)
    .map(r => ({
      id: r.reportId,
      lat: r.location.lat,
      lon: r.location.lon,
      priority: (() => {
        const pv = r.priority?.value ?? 'Medium';
        return pv.charAt(0).toUpperCase() + pv.slice(1).toLowerCase();
      })(),
      volunteersRequired: r.volunteersRequired?.value === true,
      label: `#${r.reportId.slice(0, 6)} – ${r.notes?.value ?? ''}`,
    }));

  const handlePinClick = useCallback((pin) => {
    const report = reports.find(r => r.reportId === pin.id);
    setSelectedReport(report || null);
  }, [reports]);

  return (
    <div className="map-screen">
      <MapView pins={mapPins} onPinClick={handlePinClick} />

      {/* Filter pills */}
      <div className="map-filter-row">
        {filters.map(f => (
          <button
            key={f}
            className={`pill-chip ${filter === f ? 'pill-active' : ''}`}
            onClick={() => setFilter(f)}
            style={filter === f && f !== 'All' ? { background: PRIORITY_COLORS[f], borderColor: PRIORITY_COLORS[f] } : {}}
          >
            {f}
          </button>
        ))}
        <button
          className="pill-chip pill-icon"
          onClick={() => setShowDownload(true)}
          title="Download offline map"
        >
          <Filter size={14} />
        </button>
      </div>

      {/* Bottom sheet — nearby alerts */}
      <div className="map-bottom-sheet">
        <div className="bottom-sheet-handle" />
        <div className="bottom-sheet-header">
          <h3 className="heading-sm">Nearby Alerts</h3>
          <span className="count-badge">{filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state small">
            <AlertTriangle size={24} color="#ccc" />
            <p>No {filter !== 'All' ? filter + '-priority ' : ''}alerts in this view.</p>
          </div>
        ) : (
          <div className="alert-list">
            {filtered.map(r => {
              const pv = r.priority?.value ?? 'Medium';
              const p  = pv.charAt(0).toUpperCase() + pv.slice(1).toLowerCase();
              const color = PRIORITY_COLORS[p] ?? '#888';
              const needsVols = r.volunteersRequired?.value === true;
              return (
                <div
                  key={r.reportId}
                  className={`alert-item ${selectedReport?.reportId === r.reportId ? 'alert-item-active' : ''}`}
                  onClick={() => setSelectedReport(r)}
                >
                  <div className="alert-priority-dot" style={{ background: color }} />
                  <div className="alert-body">
                    <p className="alert-id">#{r.reportId.slice(0, 8)}</p>
                    <p className="alert-notes">{r.notes?.value ?? '—'}</p>
                    <div className="alert-tags">
                      <span className="tag" style={{ background: color + '22', color }}>
                        {p}
                      </span>
                      {needsVols && (
                        <span className="tag tag-volunteers">
                          <Users size={10} /> Volunteers needed
                        </span>
                      )}
                    </div>
                  </div>
                  {r.location && !r.location.conflict && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${r.location.lat},${r.location.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="alert-map-link"
                      onClick={e => e.stopPropagation()}
                    >
                      <MapPin size={16} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        id="fab-add-report"
        className="fab"
        onClick={onAddReport}
        title="Add report"
      >
        <Plus size={28} />
      </button>

      {showDownload && (
        <DownloadMapModal onClose={() => setShowDownload(false)} />
      )}
    </div>
  );
}
