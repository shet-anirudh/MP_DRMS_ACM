import React, { useState } from 'react';
import { addReport } from '../db/db.js';
import { getDeviceId } from '../services/deviceId.js';
import { MapPin, ExternalLink } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';

export function ReportForm({ onReportAdded }) {
  const [injuredCount, setInjuredCount] = useState('');
  const [priority, setPriority] = useState('High');
  const [notes, setNotes] = useState('');
  
  const [locTab, setLocTab] = useState('GPS');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [landmark, setLandmark] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  const handleGetLocation = async (e) => {
    e.preventDefault();
    setLocationLoading(true);
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      setLat(position.coords.latitude);
      setLon(position.coords.longitude);
    } catch (error) {
      alert("Unable to retrieve location. Ensure GPS is on and permissions are granted.");
      console.error(error);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const deviceId = getDeviceId();
      const report = {
        reportId: crypto.randomUUID(),
        priority,
        injuredCount: { value: Number(injuredCount), timestamp: Date.now(), updatedBy: deviceId },
        notes: { value: notes, timestamp: Date.now(), updatedBy: deviceId },
        location: { lat: Number(lat), lon: Number(lon), landmark, timestamp: Date.now(), updatedBy: deviceId },
        syncStatus: 'pending' 
      };
      
      await addReport(report);
      
      if (onReportAdded) {
        onReportAdded();
      }
      
      // Reset
      setInjuredCount('');
      setNotes('');
      setLat('');
      setLon('');
      setLandmark('');
      setPriority('High');
    } catch (err) {
      console.error("Failed to add report:", err);
    }
  };

  const sectionStyle = {
    padding: '16px',
    backgroundColor: '#F9F9F9',
    border: '1px solid #E0E0E0',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  };

  return (
    <div className="screen-content hide-scrollbar" style={{ overflowY: 'auto' }}>
      <div className="flex-col gap-8" style={{ marginBottom: 24 }}>
        <h1 className="heading-lg">New report</h1>
        <p className="body-text text-muted">Saved locally · syncs when online</p>
      </div>

      <div className="card flex-col gap-24" style={{ padding: '20px 16px' }}>
        <form className="flex-col gap-24" onSubmit={handleSubmit}>
          
          <div style={sectionStyle}>
            <label style={{ fontWeight: 600 }}>Priority</label>
            <div className="pill-row">
              {['High', 'Medium', 'Low'].map(p => (
                <button 
                  type="button"
                  key={p}
                  className={`pill-chip ${priority === p ? `active priority-${p.toLowerCase()}` : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={{ fontWeight: 600 }}>Injured count</label>
            <input 
              type="number" 
              className="input-field"
              min="0"
              placeholder="0"
              value={injuredCount} 
              onChange={(e) => setInjuredCount(e.target.value)} 
              required 
              style={{ marginBottom: 0, backgroundColor: '#FFFFFF', border: '1px solid #EEEEEE' }}
            />
          </div>
          
          <div style={sectionStyle}>
            <label style={{ fontWeight: 600 }}>Notes</label>
            <textarea 
              className="input-field"
              placeholder="Describe the situation..."
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              required 
              style={{ marginBottom: 0, backgroundColor: '#FFFFFF', border: '1px solid #EEEEEE' }}
            />
          </div>
          
          <div style={sectionStyle}>
            <label style={{ fontWeight: 600 }}>Location</label>
            <div className="pill-row">
              <button 
                type="button"
                className={`pill-chip ${locTab === 'GPS' ? 'active' : ''}`}
                onClick={() => setLocTab('GPS')}
                style={{ flex: 1 }}
              >
                GPS
              </button>
              <button 
                type="button"
                className={`pill-chip ${locTab === 'Manual' ? 'active' : ''}`}
                onClick={() => setLocTab('Manual')}
                style={{ flex: 1 }}
              >
                Manual
              </button>
            </div>

            {locTab === 'GPS' ? (
              <div className="flex-col gap-12" style={{ marginTop: 8 }}>
                <div style={{
                  height: 120,
                  borderRadius: 16,
                  backgroundColor: '#E0E7EA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundImage: 'radial-gradient(circle, #CFD8DC 2px, transparent 2px)', backgroundSize: '20px 20px',
                  position: 'relative'
                }}>
                  {lat && lon ? (
                    <MapPin size={32} color="var(--primary-red)" />
                  ) : (
                    <div style={{
                      width: 16, height: 16, backgroundColor: '#4285F4', borderRadius: '50%',
                      border: '2px solid white', boxShadow: '0 0 0 4px rgba(66,133,244,0.3)'
                    }} />
                  )}
                </div>
                
                {lat && lon && (
                  <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <a 
                       href={`https://www.google.com/maps/place/${lat},${lon}`} 
                       target="_blank" 
                       rel="noreferrer"
                       style={{ color: '#3498db', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '14px', fontWeight: '600' }}
                    >
                      {lat.toFixed(5)}, {lon.toFixed(5)} <ExternalLink size={14} />
                    </a>
                  </div>
                )}
                
                <button type="button" className="btn-pill btn-black" onClick={handleGetLocation} disabled={locationLoading}>
                  {locationLoading ? 'Locating...' : (lat && lon ? 'Update location' : 'Get my location')}
                </button>
              </div>
            ) : (
              <div className="flex-col gap-12" style={{ marginTop: 8 }}>
                <input 
                  type="text" 
                  className="input-field"
                  placeholder="Landmark (e.g. Near City Hall)"
                  value={landmark} 
                  onChange={(e) => setLandmark(e.target.value)} 
                  style={{ marginBottom: 0, backgroundColor: '#FFFFFF', border: '1px solid #EEEEEE' }}
                />
                <div className="flex-row gap-12">
                  <input 
                    type="number" step="any"
                    className="input-field"
                    placeholder="Lat"
                    value={lat} 
                    onChange={(e) => setLat(e.target.value)} 
                    style={{ marginBottom: 0, flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #EEEEEE' }}
                  />
                  <input 
                    type="number" step="any"
                    className="input-field"
                    placeholder="Lon"
                    value={lon} 
                    onChange={(e) => setLon(e.target.value)} 
                    style={{ marginBottom: 0, flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #EEEEEE' }}
                  />
                </div>
              </div>
            )}
          </div>
          
          <button type="submit" className="btn-pill btn-black" style={{ marginTop: 16 }}>
            Submit Report
          </button>
        </form>
      </div>
      
      <div style={{ minHeight: 40 }} />
    </div>
  );
}
