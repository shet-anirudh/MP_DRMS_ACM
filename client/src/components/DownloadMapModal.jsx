import React, { useState } from 'react';
import { DownloadCloud, Trash2, X } from 'lucide-react';
import { estimateTileCount } from '../utils/storageUtils';

export function DownloadMapModal({ onClose, onDownload, downloading, progress, packs }) {
  const [radius, setRadius] = useState(10);
  const estimate = estimateTileCount(radius);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#2f3542', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '400px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Offline Maps</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20}/></button>
        </div>

        {!downloading && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px' }}>Select Radius:</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              {[10, 25, 50].map(r => (
                 <button 
                   key={r}
                   onClick={() => setRadius(r)}
                   style={{ flex: 1, padding: '10px', background: radius === r ? '#3742fa' : '#57606f', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                   {r} km
                 </button>
              ))}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#a4b0be' }}>Estimated Size: ~{estimate.mb} MB ({estimate.tiles} tiles)</p>
            <button 
              onClick={() => onDownload(radius)}
              style={{ width: '100%', padding: '12px', background: '#2ed573', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
            >
              <DownloadCloud size={18}/> Download Area
            </button>
          </div>
        )}

        {downloading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p>Downloading {progress}%</p>
            <div style={{ width: '100%', height: '10px', background: '#57606f', borderRadius: '5px', overflow: 'hidden' }}>
               <div style={{ width: `${progress}%`, height: '100%', background: '#2ed573', transition: 'width 0.3s' }}></div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px', borderTop: '1px solid #57606f', paddingTop: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Downloaded Packs</h4>
          {packs.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#a4b0be' }}>No areas downloaded yet.</p>
          ) : (
             packs.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e272e', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem' }}>{p.radiusKm}km Area</div>
                    <div style={{ fontSize: '0.75rem', color: '#a4b0be' }}>{new Date(p.date).toLocaleDateString()}</div>
                  </div>
                  <Trash2 size={16} color="#ff4757" style={{ cursor: 'pointer' }}/>
                </div>
             ))
          )}
        </div>
      </div>
    </div>
  );
}
