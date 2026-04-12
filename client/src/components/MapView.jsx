import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOfflineTiles, base64ToArrayBuffer } from '../hooks/useOfflineTiles';
import { NavigationPanel } from './NavigationPanel';
import { DownloadMapModal } from './DownloadMapModal';
import { Layers, Download, Navigation } from 'lucide-react';

export function MapView() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { location, error: locError } = useGeolocation(true);
  const offlineTiles = useOfflineTiles();
  
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showNavPanel, setShowNavPanel] = useState(false);
  const [destPoint, setDestPoint] = useState(null);

  useEffect(() => {
    if (mapRef.current) return;

    try {
      maplibregl.addProtocol('osm-offline', (params) => {
        return new Promise((resolve, reject) => {
          const [z, x, yExt] = params.url.replace('osm-offline://', '').split('/');
          const y = yExt.split('.')[0];
          
          offlineTiles.getTileStr(z, x, y).then(base64 => {
             if (base64) {
                 resolve({ data: base64ToArrayBuffer(base64) });
             } else {
                 fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`)
                   .then(res => {
                       if (!res.ok) throw new Error("Tile fetch failed");
                       return res.blob();
                   })
                   .then(blob => offlineTiles.blobToBase64(blob))
                   .then(b64 => {
                      offlineTiles.saveTile(z, x, y, b64);
                      resolve({ data: base64ToArrayBuffer(b64) });
                   })
                   .catch(err => reject(err));
             }
          }).catch(err => reject(err));
        });
      });
    } catch(e) {
      console.warn("Protocol potentially already added", e);
    }

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['osm-offline://{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }]
      },
      center: [80.27, 13.08],
      zoom: 12
    });

    mapRef.current.on('load', () => {
      setMapLoaded(true);
      mapRef.current.addSource('user-location', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      mapRef.current.addLayer({
        id: 'user-location-dot',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': 8,
          'circle-color': '#3498db',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });
      
      mapRef.current.addSource('destination-pin', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      mapRef.current.addLayer({
        id: 'destination-pin-layer',
        type: 'circle',
        source: 'destination-pin',
        paint: {
          'circle-radius': 8,
          'circle-color': '#e74c3c',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#c0392b'
        }
      });
      
      mapRef.current.addSource('route-line', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
      });
      mapRef.current.addLayer({
        id: 'route-line-layer',
        type: 'line',
        source: 'route-line',
        paint: {
          'line-color': '#3498db',
          'line-width': 4,
          'line-dasharray': [2, 2]
        }
      });
    });

    return () => {
       try { maplibregl.removeProtocol('osm-offline'); } catch(e){}
       // Do not remove map instance on generic remount during dev
    };
  }, []);

  useEffect(() => {
    if (mapLoaded && location && mapRef.current) {
       const userSrc = mapRef.current.getSource('user-location');
       if (userSrc) {
          userSrc.setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [location.lng, location.lat] }
            }]
          });
       }
    }
  }, [location, mapLoaded]);

  useEffect(() => {
    if (mapLoaded && mapRef.current) {
        const destSrc = mapRef.current.getSource('destination-pin');
        const routeSrc = mapRef.current.getSource('route-line');
        
        if (destPoint) {
            destSrc.setData({
               type: 'FeatureCollection',
               features: [{
                 type: 'Feature',
                 geometry: { type: 'Point', coordinates: [destPoint.lng, destPoint.lat] }
               }]
            });
            if (location) {
                routeSrc.setData({
                  type: 'Feature',
                  geometry: { type: 'LineString', coordinates: [
                     [location.lng, location.lat],
                     [destPoint.lng, destPoint.lat]
                  ]}
                });
            }
        } else {
            destSrc.setData({ type: 'FeatureCollection', features: [] });
            routeSrc.setData({ type: 'FeatureCollection', features: [] });
        }
    }
  }, [destPoint, location, mapLoaded]);

  const handleDownload = (radius) => {
     if (!location) return alert("Waiting for GPS lock to download surrounding area.");
     offlineTiles.downloadArea(location.lat, location.lng, radius);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 80px)', background: '#1e272e', borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10 }}>
        <button 
           onClick={() => setShowDownloadModal(true)}
           style={{ background: '#2f3542', color: 'white', padding: '12px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
        >
          <Download size={20}/>
        </button>
        <button 
           onClick={() => {
              if (location && mapRef.current) {
                 mapRef.current.flyTo({ center: [location.lng, location.lat], zoom: 14 });
              }
           }}
           style={{ background: '#2f3542', color: 'white', padding: '12px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
        >
          <Navigation size={20}/>
        </button>
      </div>
      
      <button 
         onClick={() => setShowNavPanel(true)}
         style={{ position: 'absolute', bottom: 20, right: 20, background: '#3742fa', color: 'white', padding: '15px', border: 'none', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 5px 15px rgba(55, 66, 250, 0.4)', zIndex: 10 }}
      >
        <Layers size={24}/>
      </button>

      {showDownloadModal && (
        <DownloadMapModal 
          onClose={() => setShowDownloadModal(false)}
          downloading={offlineTiles.downloading}
          progress={offlineTiles.downloadProgress}
          packs={offlineTiles.downloadedPacks}
          onDownload={handleDownload}
        />
      )}

      {showNavPanel && (
        <NavigationPanel 
          userLat={location?.lat}
          userLng={location?.lng}
          onClose={() => setShowNavPanel(false)}
          onTargetSet={(lat, lng) => setDestPoint({lat, lng})}
        />
      )}
    </div>
  );
}
