// Approximate centroids for HDB towns (lat, lng). Values are rough and can be refined.
// Source: manually approximated from public maps; acceptable for fallback distances.
export const TOWN_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "ANG MO KIO": { lat: 1.3691, lng: 103.8458 },
  "BEDOK": { lat: 1.3236, lng: 103.9305 },
  "BISHAN": { lat: 1.3508, lng: 103.8487 },
  "BUKIT BATOK": { lat: 1.3496, lng: 103.7495 },
  "BUKIT MERAH": { lat: 1.2778, lng: 103.8190 },
  "BUKIT PANJANG": { lat: 1.3786, lng: 103.7643 },
  "BUKIT TIMAH": { lat: 1.3294, lng: 103.8021 },
  "CENTRAL AREA": { lat: 1.2906, lng: 103.8519 },
  "CHOA CHU KANG": { lat: 1.3854, lng: 103.7441 },
  "CLEMENTI": { lat: 1.3151, lng: 103.7646 },
  "GEYLANG": { lat: 1.3180, lng: 103.8830 },
  "HOUGANG": { lat: 1.3611, lng: 103.8863 },
  "JURONG EAST": { lat: 1.3331, lng: 103.7435 },
  "JURONG WEST": { lat: 1.3393, lng: 103.7090 },
  "KALLANG/WHAMPOA": { lat: 1.3139, lng: 103.8564 },
  "MARINE PARADE": { lat: 1.3012, lng: 103.9052 },
  "PASIR RIS": { lat: 1.3731, lng: 103.9497 },
  "PUNGGOL": { lat: 1.4054, lng: 103.9023 },
  "QUEENSTOWN": { lat: 1.2943, lng: 103.7865 },
  "SEMBAWANG": { lat: 1.4491, lng: 103.8201 },
  "SENGKANG": { lat: 1.3912, lng: 103.8952 },
  "SERANGOON": { lat: 1.3524, lng: 103.8690 },
  "TAMPINES": { lat: 1.3527, lng: 103.9440 },
  "TOA PAYOH": { lat: 1.3341, lng: 103.8503 },
  "WOODLANDS": { lat: 1.4354, lng: 103.7865 },
  "YISHUN": { lat: 1.4294, lng: 103.8352 },
};

export function getTownCentroid(town: string) {
  return TOWN_CENTROIDS[town.toUpperCase()] || null;
}
