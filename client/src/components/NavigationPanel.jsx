import React, { useState, useEffect } from 'react';
import { Navigation2, X, MapPin } from 'lucide-react';
import { getDistance, getBearing, getDirectionText } from '../utils/mapUtils';

export function NavigationPanel({ userLat, userLng, onClose, onTargetSet }) {
  const [destLat, setDestLat] = useState('');
  const [destLng, setDestLng] = useState('');
  const [activeNav, setActiveNav] = useState(false);
  const [distanceKm, setDistanceKm] = useState(null);
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (activeNav && userLat && userLng && destLat && destLng) {
      setDistanceKm(getDistance(userLat, userLng, Number(destLat), Number(destLng)));
      setBearing(getBearing(userLat, userLng, Number(destLat), Number(destLng)));
    }
  }, [userLat, userLng, destLat, destLng, activeNav]);

  const startNav = () => {
    if (destLat && destLng) {
      setActiveNav(true);
      onTargetSet && onTargetSet(Number(destLat), Number(destLng));
    }
  };

  return (
    <div style={{ position: 'absolute', bottom: 20, left: '5%', right: '5%', background: '#2f3542', padding: '20px', borderRadius: '12px', color: 'white', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#a4b0be', cursor: 'pointer' }}><X size={20}/></button>
      
      {!activeNav ? (
        <div>
          <h3 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18}/> Set Destination</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input type="number" placeholder="Lat (e.g. 13.08)" value={destLat} onChange={e=>setDestLat(e.target.value)} style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid #57606f', color: 'white', borderRadius: '4px' }} />
            <input type="number" placeholder="Lng (e.g. 80.27)" value={destLng} onChange={e=>setDestLng(e.target.value)} style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid #57606f', color: 'white', borderRadius: '4px' }} />
          </div>
          <button onClick={startNav} style={{ width: '100%', padding: '12px', background: '#3742fa', border: 'none', color: 'white', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Start Navigation</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 5px 0', color: '#2ed573' }}>Navigating</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }}>{distanceKm ? distanceKm.toFixed(2) : '--'} km</div>
            <div style={{ fontSize: '0.9rem', color: '#a4b0be' }}>Head {getDirectionText(bearing)}</div>
            <button onClick={() => setActiveNav(false)} style={{ marginTop: '10px', padding: '5px 10px', background: 'transparent', border: '1px solid #ff4757', color: '#ff4757', borderRadius: '4px', cursor: 'pointer' }}>Stop Navigation</button>
          </div>
          <div style={{ padding: '15px', background: '#1e272e', borderRadius: '50%', transform: `rotate(${bearing}deg)`, transition: 'transform 0.5s' }}>
             <Navigation2 size={40} color="#3742fa" fill="#3742fa" />
          </div>
        </div>
      )}
    </div>
  );
}
