import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOfflineTiles, base64ToArrayBuffer } from '../hooks/useOfflineTiles';
import { DownloadMapModal } from './DownloadMapModal';
import { Download, Navigation } from 'lucide-react';

export function MapView({ reports }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { location, error: locError } = useGeolocation(true);
  const offlineTiles = useOfflineTiles();
  const initialCenterSet = useRef(false);
  
  const [showDownloadModal, setShowDownloadModal] = useState(false);

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
      
      // User location dot layer
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
      
      // Report map pins layer
      mapRef.current.addSource('reports-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      mapRef.current.addLayer({
        id: 'reports-layer',
        type: 'circle',
        source: 'reports-source',
        paint: {
          'circle-radius': 10,
          'circle-color': [
            'match',
            ['get', 'priority'],
            'High', '#E24B4A',
            'Medium', '#EF9F27',
            'Low', '#1D9E75',
            '#000000' // default
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    });

    return () => {
       try { maplibregl.removeProtocol('osm-offline'); } catch(e){}
    };
  }, []);

  // Update user location on map
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
          
          if (!initialCenterSet.current) {
              mapRef.current.jumpTo({ center: [location.lng, location.lat], zoom: 14 });
              initialCenterSet.current = true;
          }
       }
    }
  }, [location, mapLoaded]);

  // Update reported incidents tightly onto the map
  useEffect(() => {
    if (mapLoaded && mapRef.current && reports) {
        const reportsSrc = mapRef.current.getSource('reports-source');
        if (reportsSrc) {
            const features = reports
              .filter(r => r.location && typeof r.location.lat === 'number' && typeof r.location.lon === 'number')
              .map(r => ({
                 type: 'Feature',
                 geometry: { type: 'Point', coordinates: [r.location.lon, r.location.lat] },
                 properties: { priority: r.priority, id: r.reportId }
              }));
            
            reportsSrc.setData({ type: 'FeatureCollection', features });
        }
    }
  }, [reports, mapLoaded]);

  const handleDownload = (radius) => {
     if (!location) return alert("Waiting for GPS lock to download surrounding area.");
     offlineTiles.downloadArea(location.lat, location.lng, radius);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
      <div style={{ position: 'absolute', top: 90, right: 16, display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10 }}>
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

      {showDownloadModal && (
        <DownloadMapModal 
          onClose={() => setShowDownloadModal(false)}
          downloading={offlineTiles.downloading}
          progress={offlineTiles.downloadProgress}
          packs={offlineTiles.downloadedPacks}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
