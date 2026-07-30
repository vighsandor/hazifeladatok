// City coordinates reference from ellenorzo-adatok.md
// WGS84, city center, verified: Budapest–Vienna = 214.0 km

export interface CityCoordinate {
  city: string;
  lat: number;
  lon: number;
}

export const cityCoordinates: CityCoordinate[] = [
  { city: 'Budapest', lat: 47.4979, lon: 19.0402 },
  { city: 'Vienna', lat: 48.2082, lon: 16.3738 },
  { city: 'Munich', lat: 48.1351, lon: 11.5820 },
  { city: 'Milan', lat: 45.4642, lon: 9.1900 },
  { city: 'Barcelona', lat: 41.3874, lon: 2.1686 },
  { city: 'Lyon', lat: 45.7640, lon: 4.8357 },
  { city: 'Kraków', lat: 50.0647, lon: 19.9450 },
  { city: 'Prague', lat: 50.0755, lon: 14.4378 },
  { city: 'Lisbon', lat: 38.7223, lon: -9.1393 },
  { city: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
  { city: 'Stockholm', lat: 59.3293, lon: 18.0686 },
  { city: 'Ljubljana', lat: 46.0569, lon: 14.5058 },
  { city: 'Bucharest', lat: 44.4268, lon: 26.1025 },
  { city: 'Dublin', lat: 53.3498, lon: -6.2603 },
  { city: 'Copenhagen', lat: 55.6761, lon: 12.5683 },
];
