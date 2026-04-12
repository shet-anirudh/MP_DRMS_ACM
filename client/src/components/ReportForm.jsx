import React, { useState, useEffect } from 'react';
import { addReport, updateReport } from '../db/db.js';
import { getDeviceId } from '../services/deviceId.js';

export function ReportForm({ onReportAdded, editingReport, onCancelEdit }) {
  const [injuredCount, setInjuredCount] = useState('');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [priority, setPriority] = useState('medium');
  const [volunteersRequired, setVolunteersRequired] = useState(false);

  const isEditMode = !!editingReport;

  // Pre-fill fields when editingReport changes
  useEffect(() => {
    if (editingReport) {
      setInjuredCount(editingReport.injuredCount?.value ?? '');
      setNotes(editingReport.notes?.value ?? '');
      setLat(editingReport.location?.lat ?? '');
      setLon(editingReport.location?.lon ?? '');
      setPriority(editingReport.priority?.value ?? 'medium');
      setVolunteersRequired(editingReport.volunteersRequired?.value ?? false);
    } else {
      // Reset to blank when exiting edit mode
      setInjuredCount('');
      setNotes('');
      setLat('');
      setLon('');
      setPriority('medium');
      setVolunteersRequired(false);
    }
  }, [editingReport]);

  const handleGetLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLon(position.coords.longitude);
        setLocationLoading(false);
      },
      (error) => {
        alert("Unable to retrieve location. Please enter manually.");
        console.error(error);
        setLocationLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const deviceId = getDeviceId();
      const now = Date.now();

      if (isEditMode) {
        // EDIT MODE: only bump timestamp+updatedBy for fields that actually changed
        const orig = editingReport;

        const newInjuredCount = Number(injuredCount);
        const newLat = Number(lat);
        const newLon = Number(lon);

        const injuredChanged  = newInjuredCount !== orig.injuredCount?.value;
        const notesChanged    = notes !== orig.notes?.value;
        const latChanged      = newLat !== orig.location?.lat;
        const lonChanged      = newLon !== orig.location?.lon;
        const locationChanged = latChanged || lonChanged;
        const priorityChanged = priority !== orig.priority?.value;
        const volChanged      = volunteersRequired !== orig.volunteersRequired?.value;

        const updatedReport = {
          ...orig,
          injuredCount: injuredChanged
            ? { value: newInjuredCount, timestamp: now, updatedBy: deviceId }
            : orig.injuredCount,
          notes: notesChanged
            ? { value: notes, timestamp: now, updatedBy: deviceId }
            : orig.notes,
          location: locationChanged
            ? { lat: newLat, lon: newLon, timestamp: now, updatedBy: deviceId }
            : orig.location,
          priority: priorityChanged
            ? { value: priority, timestamp: now, updatedBy: deviceId }
            : orig.priority,
          volunteersRequired: volChanged
            ? { value: volunteersRequired, timestamp: now, updatedBy: deviceId }
            : orig.volunteersRequired,
          syncStatus: 'pending'
        };

        await updateReport(orig.reportId, updatedReport);
      } else {
        // CREATE MODE: build a fresh report
        const report = {
          reportId: crypto.randomUUID(),
          injuredCount: { value: Number(injuredCount), timestamp: now, updatedBy: deviceId },
          notes: { value: notes, timestamp: now, updatedBy: deviceId },
          location: { lat: Number(lat), lon: Number(lon), timestamp: now, updatedBy: deviceId },
          priority: { value: priority, timestamp: now, updatedBy: deviceId },
          volunteersRequired: { value: volunteersRequired, timestamp: now, updatedBy: deviceId },
          syncStatus: 'pending'
        };
        await addReport(report);
      }

      if (onReportAdded) onReportAdded();

    } catch (err) {
      console.error("Failed to save report:", err);
    }
  };

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="injuredCount">Injured Count</label>
        <input 
          id="injuredCount"
          type="number" 
          min="0" 
          value={injuredCount} 
          onChange={(e) => setInjuredCount(e.target.value)} 
          required 
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea 
          id="notes"
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          required 
        />
      </div>
      
      <div className="form-group">
        <label>Location</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="input-row" style={{ flex: 1, marginBottom: 0 }}>
            <input 
              type="number" 
              step="any"
              placeholder="Latitude" 
              value={lat} 
              onChange={(e) => setLat(e.target.value)} 
              required 
            />
            <input 
              type="number" 
              step="any"
              placeholder="Longitude" 
              value={lon} 
              onChange={(e) => setLon(e.target.value)} 
              required 
            />
          </div>
          <button 
            type="button" 
            onClick={handleGetLocation} 
            disabled={locationLoading}
            style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.1)', color: '#a4b0be', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: locationLoading ? 'not-allowed' : 'pointer' }}
          >
            {locationLoading ? 'Locating...' : 'Use Current Location'}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Priority</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['low', 'medium', 'high'].map(level => (
            <button
              key={level}
              type="button"
              onClick={() => setPriority(level)}
              style={{
                flex: 1,
                padding: '0.8rem',
                textTransform: 'capitalize',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: priority === level ? (level === 'high' ? '#e74c3c' : level === 'medium' ? '#f39c12' : '#2ecc71') : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: priority === level ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>More volunteers required?</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setVolunteersRequired(true)}
            style={{
              flex: 1, padding: '0.8rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)',
              background: volunteersRequired ? '#27ae60' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer'
            }}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setVolunteersRequired(false)}
            style={{
              flex: 1, padding: '0.8rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)',
              background: !volunteersRequired ? '#7f8c8d' : 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer'
            }}
          >
            No
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" className="submit-btn" style={{ flex: 1 }}>
          {isEditMode ? 'Update Report' : 'Submit Report'}
        </button>
        {isEditMode && onCancelEdit && (
          <button 
            type="button" 
            onClick={onCancelEdit}
            style={{ padding: '0.8rem 1.2rem', background: 'transparent', color: '#95a5a6', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
