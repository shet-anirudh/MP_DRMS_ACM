import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useGeolocation — live GPS watch via @capacitor/geolocation on native;
 * falls back to navigator.geolocation in browser dev mode.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState(null); // { lat, lon, accuracy }
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef(null);

  const startWatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try Capacitor geolocation (native)
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.requestPermissions();
      watchIdRef.current = await Geolocation.watchPosition(
        { enableHighAccuracy: true },
        (position, err) => {
          setLoading(false);
          if (err) { setError(err.message); return; }
          setCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        }
      );
    } catch {
      // Fallback to browser geolocation (web dev)
      if (!navigator.geolocation) {
        setError('Geolocation not supported.');
        setLoading(false);
        return;
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        pos => {
          setLoading(false);
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy });
        },
        err => { setError(err.message); setLoading(false); },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const stopWatch = useCallback(async () => {
    if (watchIdRef.current == null) return;
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.clearWatch({ id: watchIdRef.current });
    } catch {
      navigator.geolocation?.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  }, []);

  const getOnce = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy });
    } catch {
      await new Promise((resolve, reject) => {
        navigator.geolocation?.getCurrentPosition(
          pos => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }); resolve(); },
          err => { setError(err.message); reject(err); },
          { enableHighAccuracy: true }
        ) ?? reject(new Error('Not supported'));
      }).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => { stopWatch(); };
  }, [stopWatch]);

  return { coords, error, loading, startWatch, stopWatch, getOnce };
}
