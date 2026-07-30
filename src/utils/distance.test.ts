import { haversine } from './distance';

describe('Haversine Distance', () => {
  test('Budapest → Vienna ≈ 214.0 km (known distance)', () => {
    const budapest = { lat: 47.4979, lon: 19.0402 };
    const vienna = { lat: 48.2082, lon: 16.3738 };

    const distance = haversine(budapest.lat, budapest.lon, vienna.lat, vienna.lon);

    // Tolerance: ±0.5 km (ellenorzo-adatok expects 214.0 km)
    expect(distance).not.toBeNull();
    expect(distance!).toBeCloseTo(214.0, 0);
  });

  test('Budapest → Budapest = 0.0 km (same point)', () => {
    const budapest = { lat: 47.4979, lon: 19.0402 };

    const distance = haversine(budapest.lat, budapest.lon, budapest.lat, budapest.lon);

    expect(distance).toBe(0.0);
  });

  test('Null coordinates → null (no throw)', () => {
    const budapest = { lat: 47.4979, lon: 19.0402 };

    // One null lat
    expect(haversine(null, budapest.lon, budapest.lat, budapest.lon)).toBeNull();

    // One null lon
    expect(haversine(budapest.lat, null, budapest.lat, budapest.lon)).toBeNull();

    // Both null
    expect(haversine(null, null, budapest.lat, budapest.lon)).toBeNull();

    // All null
    expect(haversine(null, null, null, null)).toBeNull();
  });

  test('Distance is rounded to 1 decimal place', () => {
    // Prague to Budapest (should have decimal)
    const budapest = { lat: 47.4979, lon: 19.0402 };
    const prague = { lat: 50.0755, lon: 14.4378 };

    const distance = haversine(budapest.lat, budapest.lon, prague.lat, prague.lon);

    expect(distance).not.toBeNull();
    // Check that it has max 1 decimal (multiply by 10, check if integer)
    expect((distance! * 10) % 1).toBe(0);
  });
});
