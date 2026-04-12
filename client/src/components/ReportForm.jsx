import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader } from 'lucide-react';
import { addReport, updateReport } from '../db/db.js';
import { getDeviceId } from '../services/deviceId.js';
import { useGeolocation } from '../hooks/useGeolocation.js';

const PRIORITIES = ['Low', 'Medium', 'High'];
const PRIORITY_COLORS = { High: '#E24B4A', Medium: '#F5A623', Low: '#4CAF50' };

export function ReportForm({ onReportAdded, editingReport, onCancelEdit }) {
  const [injuredCount, setInjuredCount] = useState('');
  const [notes, setNotes]               = useState('');
  const [lat, setLat]                   = useState('');
  const [lon, setLon]                   = useState('');
  const [landmark, setLandmark]         = useState('');
  const [locationMode, setLocationMode] = useState('manual'); // 'gps' | 'manual'
  const [priority, setPriority]         = useState('Medium');
  const [volunteersRequired, setVolunteersRequired] = useState(false);

  const { getOnce, loading: gpsLoading, error: gpsError } = useGeolocation();

  const isEditMode = !!editingReport;

  useEffect(() => {
    if (editingReport) {
      setInjuredCount(editingReport.injuredCount?.value ?? '');
      setNotes(editingReport.notes?.value ?? '');
      setLat(editingReport.location?.lat ?? '');
      setLon(editingReport.location?.lon ?? '');
      setLandmark(editingReport.location?.landmark?.value ?? editingReport.location?.landmark ?? '');
      // Normalise priority to title-case
      const pv = editingReport.priority?.value ?? 'Medium';
      setPriority(pv.charAt(0).toUpperCase() + pv.slice(1).toLowerCase());
      setVolunteersRequired(editingReport.volunteersRequired?.value ?? false);
    } else {
      setInjuredCount('');
      setNotes('');
      setLat('');
      setLon('');
      setLandmark('');
      setPriority('Medium');
      setVolunteersRequired(false);
    }
  }, [editingReport]);

  const handleGetGPS = async () => {
    await getOnce();
    // getOnce updates coords internally; we subscribe via hook state
    // but for simplicity we re-use the hook returned coords via a secondary approach:
    // We'll call navigator geo directly here for the form state.
    setLocationMode('gps');
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const deviceId = getDeviceId();
    const now = Date.now();

    try {
      if (isEditMode) {
        const orig = editingReport;
        const newInjured   = Number(injuredCount);
        const newLat       = Number(lat);
        const newLon       = Number(lon);
        const injuredChanged  = newInjured !== orig.injuredCount?.value;
        const notesChanged    = notes !== orig.notes?.value;
        const latChanged      = newLat !== orig.location?.lat;
        const lonChanged      = newLon !== orig.location?.lon;
        const landmarkChanged = landmark !== (orig.location?.landmark?.value ?? orig.location?.landmark ?? '');
        const locationChanged = latChanged || lonChanged || landmarkChanged;
        const priorityChanged = priority !== ((() => {
          const pv = orig.priority?.value ?? 'Medium';
          return pv.charAt(0).toUpperCase() + pv.slice(1).toLowerCase();
        })());
        const volChanged = volunteersRequired !== orig.volunteersRequired?.value;

        const updatedReport = {
          ...orig,
          injuredCount: injuredChanged
            ? { value: newInjured, timestamp: now, updatedBy: deviceId }
            : orig.injuredCount,
          notes: notesChanged
            ? { value: notes, timestamp: now, updatedBy: deviceId }
            : orig.notes,
          location: locationChanged
            ? { lat: newLat, lon: newLon, landmark: { value: landmark, timestamp: now, updatedBy: deviceId }, timestamp: now, updatedBy: deviceId }
            : orig.location,
          priority: priorityChanged
            ? { value: priority, timestamp: now, updatedBy: deviceId }
            : orig.priority,
          volunteersRequired: volChanged
            ? { value: volunteersRequired, timestamp: now, updatedBy: deviceId }
            : orig.volunteersRequired,
          syncStatus: 'pending',
        };
        await updateReport(orig.reportId, updatedReport);
      } else {
        const report = {
          reportId: crypto.randomUUID(),
          injuredCount: { value: Number(injuredCount), timestamp: now, updatedBy: deviceId },
          notes: { value: notes, timestamp: now, updatedBy: deviceId },
          location: {
            lat: Number(lat),
            lon: Number(lon),
            landmark: { value: landmark, timestamp: now, updatedBy: deviceId },
            timestamp: now,
            updatedBy: deviceId,
          },
          priority: { value: priority, timestamp: now, updatedBy: deviceId },
          volunteersRequired: { value: volunteersRequired, timestamp: now, updatedBy: deviceId },
          syncStatus: 'pending',
        };
        await addReport(report);
      }
      if (onReportAdded) onReportAdded();
    } catch (err) {
      console.error('Failed to save report:', err);
    }
  };

  return (
    <form className="report-form" onSubmit={handleSubmit} noValidate>

      {/* Injured Count */}
      <div className="form-group">
        <label htmlFor="injuredCount">Injured Count</label>
        <input
          id="injuredCount"
          type="number"
          min="0"
          value={injuredCount}
          onChange={e => setInjuredCount(e.target.value)}
          placeholder="0"
          required
        />
      </div>

      {/* Notes */}
      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Describe the situation…"
          required
        />
      </div>

      {/* Location — GPS / Manual tabs */}
      <div className="form-group">
        <label>Location</label>
        <div className="location-tabs">
          <button
            type="button"
            className={`tab-btn ${locationMode === 'gps' ? 'tab-active' : ''}`}
            onClick={() => setLocationMode('gps')}
          >
            <Navigation size={14} /> GPS
          </button>
          <button
            type="button"
            className={`tab-btn ${locationMode === 'manual' ? 'tab-active' : ''}`}
            onClick={() => setLocationMode('manual')}
          >
            <MapPin size={14} /> Manual
          </button>
        </div>

        {locationMode === 'gps' ? (
          <div className="gps-section">
            <button
              type="button"
              className="btn-pill btn-outline gps-btn"
              onClick={handleGetGPS}
              disabled={gpsLoading}
            >
              {gpsLoading ? <><Loader size={14} className="spin" /> Locating…</> : <><Navigation size={14} /> Get My Location</>}
            </button>
            {lat && lon && (
              <p className="gps-coords">
                📍 {Number(lat).toFixed(5)}, {Number(lon).toFixed(5)}{' '}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Maps
                </a>
              </p>
            )}
            {gpsError && <p className="error-text">GPS error: {gpsError}</p>}
          </div>
        ) : (
          <div className="manual-section">
            <div className="input-row">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                value={lat}
                onChange={e => setLat(e.target.value)}
                required
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                value={lon}
                onChange={e => setLon(e.target.value)}
                required
              />
            </div>
            <input
              type="text"
              placeholder="Landmark (e.g. Near City Hospital)"
              value={landmark}
              onChange={e => setLandmark(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            />
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="form-group">
        <label>Priority</label>
        <div className="priority-row">
          {PRIORITIES.map(level => (
            <button
              key={level}
              type="button"
              className={`priority-btn ${priority === level ? 'priority-active' : ''}`}
              style={priority === level ? { background: PRIORITY_COLORS[level], borderColor: PRIORITY_COLORS[level], color: 'white' } : {}}
              onClick={() => setPriority(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Volunteers Required — toggle switch */}
      <div className="form-group">
        <label>More volunteers required?</label>
        <div
          className={`vol-toggle ${volunteersRequired ? 'vol-toggle-on' : ''}`}
          onClick={() => setVolunteersRequired(v => !v)}
          role="switch"
          aria-checked={volunteersRequired}
          tabIndex={0}
          onKeyDown={e => e.key === ' ' && setVolunteersRequired(v => !v)}
        >
          <div className="vol-toggle-thumb" />
          <span className="vol-toggle-label">{volunteersRequired ? 'Yes, needed' : 'No'}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
        <button type="submit" className="btn-pill btn-primary-red" style={{ flex: 1 }}>
          {isEditMode ? 'Update Report' : 'Submit Report'}
        </button>
        {isEditMode && onCancelEdit && (
          <button
            type="button"
            className="btn-pill btn-outline"
            onClick={onCancelEdit}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
