import React, { useEffect, useRef } from 'react';

const PRIORITY_COLORS = {
  High:   '#E24B4A',
  Medium: '#F5A623',
  Low:    '#4CAF50',
};

/* ── Offline tile cache via Cache API ───────────────────────────────────── */
const TILE_CACHE_NAME = 'drms-map-tiles-v1';

async function cachedTileFetch(url, resourceType) {
  // Only cache raster tiles
  if (resourceType !== 'Tile') return { url };

  try {
    const cache = await caches.open(TILE_CACHE_NAME);

    // Try cache first
    const cached = await cache.match(url);
    if (cached) {
      // If online, fetch fresh in background to update cache (stale-while-revalidate)
      if (navigator.onLine) {
        fetch(url).then(res => {
          if (res.ok) cache.put(url, res);
        }).catch(() => {});
      }
      const blob = await cached.blob();
      const objectUrl = URL.createObjectURL(blob);
      return { url: objectUrl };
    }

    // Not cached — fetch and store
    const response = await fetch(url);
    if (response.ok) {
      cache.put(url, response.clone());
    }
    return { url };
  } catch {
    // Fallback — let MapLibre handle it
    return { url };
  }
}

/* ── Volunteer marker pulsing ring (CSS injected once) ──────────────────── */
let styleInjected = false;
function injectVolunteerStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .map-pin-volunteer {
      position: relative;
    }
    .map-pin-volunteer::before {
      content: '';
      position: absolute;
      top: 50%; left: 50%;
      width: 28px; height: 28px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 2px solid #9b59b6;
      animation: volunteer-pulse 1.8s ease-out infinite;
    }
    .map-pin-volunteer::after {
      content: '👥';
      position: absolute;
      top: -18px; left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      background: #9b59b6;
      color: white;
      border-radius: 6px;
      padding: 1px 4px;
      white-space: nowrap;
      pointer-events: none;
    }
    @keyframes volunteer-pulse {
      0%   { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
      100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

export function MapView({ pins = [], onPinClick }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let map;
    injectVolunteerStyles();

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
        // Enable offline tile caching via transformRequest
        transformRequest: (url, resourceType) => cachedTileFetch(url, resourceType),
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

        const needsVolunteers = pin.volunteersRequired === true;
        const color = PRIORITY_COLORS[pin.priority] ?? '#888';
        const size  = needsVolunteers ? 18 : 14;
        const border = needsVolunteers ? '3px solid #9b59b6' : '2px solid white';

        const el = document.createElement('div');
        el.className = `map-pin ${needsVolunteers ? 'map-pin-volunteer' : ''}`;
        el.style.cssText = `
          width: ${size}px; height: ${size}px;
          background: ${color};
          border-radius: 50%;
          border: ${border};
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          cursor: pointer;
          z-index: ${needsVolunteers ? 10 : 1};
        `;

        const popupHtml = `
          <div style="font-size:13px;line-height:1.4;">
            <strong>${pin.label}</strong>
            ${needsVolunteers ? '<br/><span style="color:#9b59b6;font-weight:600;">👥 Volunteers Needed</span>' : ''}
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lon, lat])
          .setPopup(new maplibregl.Popup({ offset: 16, maxWidth: '220px' }).setHTML(popupHtml))
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
