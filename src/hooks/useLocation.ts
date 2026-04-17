import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';

import { resolveRegionCode } from '../data/trafficRules';

type LocationState = {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  regionCode?: string;
  country?: string;
};

export function useLocation() {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied.');
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const [place] = await Location.reverseGeocodeAsync({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });

        const normalizedRegion = place?.region ?? undefined;
        const derivedRegionCode =
          normalizedRegion && normalizedRegion.length === 2
            ? normalizedRegion.toUpperCase()
            : resolveRegionCode(normalizedRegion);

        setLocation({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          city: place?.city ?? undefined,
          region: normalizedRegion,
          regionCode: derivedRegionCode,
          country: place?.country ?? undefined,
        });
      } catch {
        setError('Unable to fetch GPS location.');
      } finally {
        setLoading(false);
      }
    };

    void fetchLocation();
  }, []);

  const locationLabel = useMemo(() => {
    if (!location) {
      return 'Searching current location…';
    }

    const city = location.city ?? 'Current Area';
    const region = location.regionCode ?? location.region ?? '';
    const country = location.country ?? '';

    return [city, region, country].filter(Boolean).join(', ');
  }, [location]);

  return { location, locationLabel, loading, error };
}
