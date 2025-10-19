// lib/geo.ts
export const R = 6371000; // metres
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export type Pt = { lat: number; lng: number };
export function nearestDistance(from: Pt, to: Pt[]) {
  let best = Infinity;
  for (const t of to) {
    const d = haversine(from.lat, from.lng, t.lat, t.lng);
    if (d < best) best = d;
  }
  return best;
}
