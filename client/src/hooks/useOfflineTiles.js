import { useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { getBoundingBox, lon2tile, lat2tile } from '../utils/mapUtils';

export const useOfflineTiles = () => {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadedPacks, setDownloadedPacks] = useState(() => {
    const saved = localStorage.getItem('offline_map_packs');
    return saved ? JSON.parse(saved) : [];
  });

  const saveTile = async (z, x, y, base64Data) => {
    try {
      await Filesystem.writeFile({
        path: `osm_tiles/${z}/${x}/${y}.png`,
        data: base64Data,
        directory: Directory.Data,
        recursive: true
      });
    } catch(e) {
      console.warn('Failed saving tile', e);
    }
  };

  const getTileStr = async (z, x, y) => {
    try {
      const result = await Filesystem.readFile({
        path: `osm_tiles/${z}/${x}/${y}.png`,
        directory: Directory.Data
      });
      return result.data;
    } catch(e) {
      return null;
    }
  };

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if(reader.result) resolve(reader.result.split(',')[1]);
        else reject();
    };
    reader.readAsDataURL(blob);
  });

  const downloadArea = async (lat, lng, radiusKm) => {
    setDownloading(true);
    setDownloadProgress(0);
    const box = getBoundingBox(lat, lng, radiusKm);
    
    // Contiguous zoom levels as requested (10 through 16)
    const zoomLevels = [10, 11, 12, 13, 14, 15, 16]; 
    let totalTiles = 0;
    
    zoomLevels.forEach(z => {
      const minX = Math.min(lon2tile(box.minLng, z), lon2tile(box.maxLng, z));
      const maxX = Math.max(lon2tile(box.minLng, z), lon2tile(box.maxLng, z));
      const minY = Math.min(lat2tile(box.maxLat, z), lat2tile(box.minLat, z));
      const maxY = Math.max(lat2tile(box.maxLat, z), lat2tile(box.minLat, z));
      totalTiles += (maxX - minX + 1) * (maxY - minY + 1);
    });

    let downloadedTiles = 0;

    for (const z of zoomLevels) {
      const minX = Math.min(lon2tile(box.minLng, z), lon2tile(box.maxLng, z));
      const maxX = Math.max(lon2tile(box.minLng, z), lon2tile(box.maxLng, z));
      const minY = Math.min(lat2tile(box.maxLat, z), lat2tile(box.minLat, z));
      const maxY = Math.max(lat2tile(box.maxLat, z), lat2tile(box.minLat, z));

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          try {
            const existing = await getTileStr(z, x, y);
            if (!existing) {
              const res = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
              if (res.ok) {
                 const blob = await res.blob();
                 const base64 = await blobToBase64(blob);
                 await saveTile(z, x, y, base64);
              }
            }
          } catch(e) {}
          downloadedTiles++;
          setDownloadProgress(Math.floor((downloadedTiles / totalTiles) * 100));
        }
      }
    }
    
    const newPack = { id: Date.now(), lat, lng, radiusKm, date: new Date().toISOString() };
    const newPacksList = [...downloadedPacks, newPack];
    setDownloadedPacks(newPacksList);
    localStorage.setItem('offline_map_packs', JSON.stringify(newPacksList));
    
    setDownloading(false);
    setDownloadProgress(100);
  };

  return { downloading, downloadProgress, downloadedPacks, downloadArea, getTileStr, blobToBase64, saveTile };
};

export const base64ToArrayBuffer = (base64) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};
