import { findCoordinates } from './geocoding';

describe('Geocoding', () => {
  test('finds coordinates for exact city name', () => {
    const coords = findCoordinates('Budapest');
    expect(coords).toEqual({ lat: 47.4979, lon: 19.0402 });
  });

  test('finds coordinates for lowercase city name', () => {
    const coords = findCoordinates('budapest');
    expect(coords).toEqual({ lat: 47.4979, lon: 19.0402 });
  });

  test('finds coordinates for city with diacritics', () => {
    const coords = findCoordinates('Kraków');
    expect(coords).toEqual({ lat: 50.0647, lon: 19.9450 });
  });

  test('finds coordinates for city with whitespace', () => {
    const coords = findCoordinates('  Prague  ');
    expect(coords).toEqual({ lat: 50.0755, lon: 14.4378 });
  });

  test('returns null for unknown city', () => {
    const coords = findCoordinates('Unknown');
    expect(coords).toBeNull();
  });

  test('returns null for empty string', () => {
    const coords = findCoordinates('');
    expect(coords).toBeNull();
  });
});
