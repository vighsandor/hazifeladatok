import { cityCoordinates } from '../data/cityCoordinates';

// Normalize city name: lowercase, trim, remove diacritics
function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // Remove diacritics (combining characters)
}

// Find coordinates by city name (normalized matching)
export function findCoordinates(city: string): { lat: number; lon: number } | null {
  if (!city) return null;

  const normalized = normalizeCity(city);

  const match = cityCoordinates.find(
    (coord) => normalizeCity(coord.city) === normalized
  );

  return match ? { lat: match.lat, lon: match.lon } : null;
}
