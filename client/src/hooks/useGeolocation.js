import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export const useGeolocation = (active = true) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let watchId = null;

    const startWatching = async () => {
      try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
           const req = await Geolocation.requestPermissions();
           if (req.location !== 'granted') {
             setError('Location permission denied');
             return;
           }
        }
        
        // Grab immediate location
        try {
           const initial = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
           if (initial) {
             setLocation({
               lat: initial.coords.latitude,
               lng: initial.coords.longitude,
               heading: initial.coords.heading
             });
           }
        } catch(e) {
             console.warn("Initial position grab failed", e);
        }
        
        // Start continuous live tracking
        watchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position, err) => {
          if (err) {
            setError(err.message);
            return;
          }
          if (position) {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: position.coords.heading
            });
            setError(null);
          }
        });
      } catch (err) {
        setError(err.message);
      }
    };

    if (active) {
      startWatching();
    }

    return () => {
      if (watchId != null) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, [active]);

  return { location, error };
};
