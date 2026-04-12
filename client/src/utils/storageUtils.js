export const estimateTileCount = (radiusKm) => {
  // Rough estimation:
  // Zoom 10-16 roughly square of area. Very loose estimation for UI.
  if (radiusKm <= 10) return { tiles: 800, mb: 15 };
  if (radiusKm <= 25) return { tiles: 4500, mb: 85 };
  return { tiles: 18000, mb: 350 };
};
