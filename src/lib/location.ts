/**
 * Optional, tap-to-capture location. Nothing is recorded unless the user
 * taps the location button in the composer; coordinates + a human place
 * name are stored locally in the entry row and can be removed anytime.
 */
import * as Location from 'expo-location';

export interface CapturedPlace {
  placeName: string;
  latitude: number;
  longitude: number;
}

export async function captureCurrentPlace(): Promise<CapturedPlace | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = pos.coords;
  let placeName = 'Somewhere quiet';
  try {
    const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geo) {
      placeName = [geo.name && !/^\d+$/.test(geo.name) ? geo.name : null, geo.city ?? geo.subregion, geo.country]
        .filter(Boolean)
        .slice(0, 2)
        .join(', ') || placeName;
    }
  } catch {
    // reverse geocode is best-effort; keep coordinates regardless
  }
  return { placeName, latitude, longitude };
}
