import { lon2tile, lat2tile } from './mapUtils.js';

/**
 * Estimates the number of tiles that would be downloaded for a radius around a point.
 * Useful for showing download size previews in the UI.
 *
 * @param {number} lat - Centre latitude
 * @param {number} lon - Centre longitude
 * @param {number} radiusKm - Radius in kilometres
 * @param {number} [minZoom=10]
 * @param {number} [maxZoom=15]
 * @returns {number} Estimated tile count
 */
export function estimateTileCount(lat, lon, radiusKm, minZoom = 10, maxZoom = 15) {
  let count = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const delta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    const minX = lon2tile(lon - delta, z);
    const maxX = lon2tile(lon + delta, z);
    const minY = lat2tile(lat + delta, z);
    const maxY = lat2tile(lat - delta, z);
    count += Math.max(0, maxX - minX + 1) * Math.max(0, maxY - minY + 1);
  }
  return count;
}

/**
 * Converts a tile count to an estimated storage size string.
 * ~10 KB per tile (OSM raster tiles average ~8-12 KB).
 */
export function formatTileStorageEstimate(tileCount) {
  const bytes = tileCount * 10 * 1024;
  if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`;
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
