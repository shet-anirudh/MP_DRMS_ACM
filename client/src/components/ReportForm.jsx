import React, { useState } from 'react';
import { addReport } from '../db/db.js';
import { getDeviceId } from '../services/deviceId.js';

export function ReportForm({ onReportAdded }) {
  const [injuredCount, setInjuredCount] = useState('');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

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
      const report = {
        reportId: crypto.randomUUID(),
        injuredCount: { value: Number(injuredCount), timestamp: Date.now(), updatedBy: deviceId },
        notes: { value: notes, timestamp: Date.now(), updatedBy: deviceId },
        location: { lat: Number(lat), lon: Number(lon), timestamp: Date.now(), updatedBy: deviceId },
        syncStatus: 'pending'
      };
      
      await addReport(report);
      
      if (onReportAdded) {
        onReportAdded();
      }
      
      // Reset form fields
      setInjuredCount('');
      setNotes('');
      setLat('');
      setLon('');
    } catch (err) {
      console.error("Failed to add report:", err);
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
      
      <button type="submit" className="submit-btn">Submit Report</button>
    </form>
  );
}
