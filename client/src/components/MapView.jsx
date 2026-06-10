import React, { useEffect, useRef } from 'react';

const PRIORITY_COLORS = {
  High:   '#E24B4A',
  Medium: '#F5A623',
  Low:    '#4CAF50',
};

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

function addMarkersToMap(maplibregl, mapInstance, pins, markersRef, onPinClick) {
  // Remove old markers
  markersRef.current.forEach(m => m.remove());
  markersRef.current = [];

  pins.forEach(pin => {
    const lat = Number(pin.lat);
    const lon = Number(pin.lon);
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
      .addTo(mapInstance);

    el.addEventListener('click', () => onPinClick?.(pin));
    markersRef.current.push(marker);
  });
}

export function MapView({ pins = [], onPinClick }) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef([]);
  const pinsRef         = useRef(pins);
  const onPinClickRef   = useRef(onPinClick);

  // Keep latest pins/callback in refs so the load handler always sees current values
  useEffect(() => { pinsRef.current = pins; }, [pins]);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);

  // ── Initialise map once ─────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return; // already initialised
    injectVolunteerStyles();

    let mapInstance;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      import('maplibre-gl/dist/maplibre-gl.css');

      if (!mapContainerRef.current || mapRef.current) return;

      mapInstance = new maplibregl.Map({
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
        center: [78.9629, 22.5937],
        zoom: 4,
      });

      mapRef.current = mapInstance;

      mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');
      mapInstance.addControl(new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }), 'top-right');

      // Add initial markers after map has loaded tiles
      mapInstance.on('load', () => {
        addMarkersToMap(maplibregl, mapInstance, pinsRef.current, markersRef, onPinClickRef.current);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ── Update markers whenever pins change ─────────────────────────────────
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    // If map not yet loaded, wait for it
    if (!mapInstance.loaded()) {
      const onLoad = () => {
        import('maplibre-gl').then(({ default: maplibregl }) => {
          addMarkersToMap(maplibregl, mapInstance, pins, markersRef, onPinClick);
        });
      };
      mapInstance.once('load', onLoad);
      return () => mapInstance.off('load', onLoad);
    }

    // Map already loaded — update immediately
    import('maplibre-gl').then(({ default: maplibregl }) => {
      addMarkersToMap(maplibregl, mapInstance, pins, markersRef, onPinClick);
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
