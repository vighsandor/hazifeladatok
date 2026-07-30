// Haversine formula: great-circle distance between two points on Earth
// Input: latitude, longitude in degrees
// Output: distance in kilometers

const EARTH_RADIUS_KM = 6371;

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversine(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number | null {
  // Handle null coordinates
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.asin(Math.sqrt(a));
  const distance = EARTH_RADIUS_KM * c;

  // Round to 1 decimal place
  return Math.round(distance * 10) / 10;
}
