import React, { useState } from 'react';
import { Download, X, Loader, CheckCircle } from 'lucide-react';
import { useOfflineTiles } from '../hooks/useOfflineTiles.js';

const RADIUS_OPTIONS = [
  { label: '5 km',  value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
];

export function DownloadMapModal({ onClose }) {
  const [radius, setRadius] = useState(10);
  const { downloadTiles, progress, status } = useOfflineTiles();

  const handleDownload = async () => {
    // Use device GPS for the centre; fall back to India centre
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => downloadTiles(pos.coords.latitude, pos.coords.longitude, radius),
        ()  => downloadTiles(22.5937, 78.9629, radius)
      );
    } else {
      downloadTiles(22.5937, 78.9629, radius);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Download Offline Map</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <p className="hint-text">Download tiles around your current location for offline use.</p>

        <div className="radius-selector">
          {RADIUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`pill-chip ${radius === opt.value ? 'pill-active' : ''}`}
              onClick={() => setRadius(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {status === 'downloading' && (
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        {status === 'done' && (
          <div className="success-row">
            <CheckCircle size={16} color="#4CAF50" />
            <span>Download complete!</span>
          </div>
        )}

        {status === 'error' && (
          <p className="error-text">Download failed. Try again.</p>
        )}

        <button
          id="btn-download-tiles"
          className="btn-pill btn-primary-red"
          onClick={handleDownload}
          disabled={status === 'downloading'}
          style={{ marginTop: '1rem' }}
        >
          {status === 'downloading'
            ? <><Loader size={14} className="spin" /> Downloading {Math.round(progress)}%</>
            : <><Download size={14} /> Download {radius} km area</>}
        </button>
      </div>
    </div>
  );
}
