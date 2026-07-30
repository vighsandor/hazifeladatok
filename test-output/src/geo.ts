export const coordinatesMap: Record<string, { lat: number; lon: number }> = {
  'budapest': { lat: 47.4979, lon: 19.0402 },
  'vienna': { lat: 48.2082, lon: 16.3738 },
  'munich': { lat: 48.1351, lon: 11.582 },
  'milan': { lat: 45.4642, lon: 9.19 },
  'barcelona': { lat: 41.3874, lon: 2.1686 },
  'lyon': { lat: 45.764, lon: 4.8357 },
  'krakow': { lat: 50.0647, lon: 19.945 },
  'prague': { lat: 50.0755, lon: 14.4378 },
  'lisbon': { lat: 38.7223, lon: -9.1393 },
  'amsterdam': { lat: 52.3676, lon: 4.9041 },
  'stockholm': { lat: 59.3293, lon: 18.0686 },
  'ljubljana': { lat: 46.0569, lon: 14.5058 },
  'bucharest': { lat: 44.4268, lon: 26.1025 },
  'dublin': { lat: 53.3498, lon: -6.2603 },
  'copenhagen': { lat: 55.6761, lon: 12.5683 },
};

export const BUDAPEST = { lat: 47.4979, lon: 19.0402 };

export const normalizeTown = (town: string): string => {
  const accents: Record<string, string> = {
    á: 'a', é: 'e', í: 'i', ó: 'o', ö: 'o', ő: 'o',
    ú: 'u', ü: 'u', ű: 'u', č: 'c', š: 's', ž: 'z',
  };

  return town
    .toLowerCase()
    .trim()
    .replace(/[áéíóöőúüűčšž]/g, c => accents[c] || c);
};

export const lookupCoordinates = (
  city: string
): { lat: number | null; lon: number | null } => {
  const normalized = normalizeTown(city);
  const coords = coordinatesMap[normalized];

  if (!coords) {
    console.warn(`[WARN] Unknown town: ${city}`);
    return { lat: null, lon: null };
  }

  return coords;
};

export const haversine = (
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number | null => {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
