import { useState, useCallback } from 'react';
import { lon2tile, lat2tile } from '../utils/mapUtils.js';
import { estimateTileCount } from '../utils/storageUtils.js';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MIN_ZOOM = 10;
const MAX_ZOOM = 15;

/**
 * useOfflineTiles — Download OSM tiles via @capacitor/filesystem.
 * Falls back gracefully in the browser (fetch without filesystem write).
 */
export function useOfflineTiles() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus]     = useState('idle'); // idle | downloading | done | error

  const downloadTiles = useCallback(async (lat, lon, radiusKm) => {
    setStatus('downloading');
    setProgress(0);

    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem').catch(() => null) ?? {};

      const tiles = [];
      for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
        const delta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
        const minX = lon2tile(lon - delta, z);
        const maxX = lon2tile(lon + delta, z);
        const minY = lat2tile(lat + delta / Math.cos((lat * Math.PI) / 180), z);
        const maxY = lat2tile(lat - delta / Math.cos((lat * Math.PI) / 180), z);
        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            tiles.push({ z, x, y });
          }
        }
      }

      const total = tiles.length;
      let done = 0;

      for (const { z, x, y } of tiles) {
        const url = OSM_TILE_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
        try {
          const resp = await fetch(url);
          if (resp.ok && Filesystem) {
            const buffer = await resp.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            await Filesystem.writeFile({
              path: `tiles/${z}/${x}/${y}.png`,
              data: b64,
              directory: Directory.Data,
              recursive: true,
            });
          }
        } catch { /* skip failed tile */ }
        done++;
        setProgress(Math.round((done / total) * 100));
      }
      setStatus('done');
    } catch (err) {
      console.error('Tile download failed:', err);
      setStatus('error');
    }
  }, []);

  return { downloadTiles, progress, status };
}
