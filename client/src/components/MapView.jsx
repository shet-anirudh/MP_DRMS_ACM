import React, { useEffect, useRef } from 'react';

const PRIORITY_COLORS = {
  High:   '#E24B4A',
  Medium: '#F5A623',
  Low:    '#4CAF50',
};

export function MapView({ pins = [], onPinClick }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let map;
    import('maplibre-gl').then(({ default: maplibregl }) => {
      import('maplibre-gl/dist/maplibre-gl.css');
      if (!mapContainerRef.current || mapRef.current) return;

      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center: [78.9629, 22.5937], // India centre
        zoom: 4,
      });

      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }), 'top-right');
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add/refresh markers whenever pins change
  useEffect(() => {
    if (!mapRef.current) return;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      // Remove old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      pins.forEach(pin => {
        const lat = Number(pin.lat);
        const lon = Number(pin.lon);
        // Skip pins with invalid coordinates
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

        const color = PRIORITY_COLORS[pin.priority] ?? '#888';
        const el = document.createElement('div');
        el.className = 'map-pin';
        el.style.cssText = `
          width: 14px; height: 14px;
          background: ${color};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          cursor: pointer;
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lon, lat])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setText(pin.label))
          .addTo(mapRef.current);

        el.addEventListener('click', () => onPinClick?.(pin));
        markersRef.current.push(marker);
      });
    });
  }, [pins, onPinClick]);

  return (
    <div
      ref={mapContainerRef}
      className="map-container"
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    />
  );
}
