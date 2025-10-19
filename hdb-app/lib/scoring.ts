// lib/scoring.ts
import { nearestDistance, Pt } from './geo';

type Flat = {
  id: string;
  lat: number; lng: number;
  storey_range: string;
  resale_price: number;
  floor_area_sqm: number;
  remaining_lease_yrs: number;
  approx?: boolean; // centroid fallback used
};

type Weights = { school: number; mrt: number; hospital: number; level: number; price: number; lease: number; };

const caps = { school_m: 1500, mrt_m: 1200, hospital_m: 3000 };

function midLevel(sr: string) {
  const m = sr.match(/(\d+)\s*TO\s*(\d+)/);
  if (!m) return 0;
  return (Number(m[1]) + Number(m[2])) / 2;
}
const clamp01 = (x:number)=> Math.max(0, Math.min(1, x));

function nearestWithName(from: Pt, stations: (Pt & { name?: string })[]) {
  let best = Infinity; let bestName = '';
  for (const s of stations) {
    const d = nearestDistance(from, [s]); // reuse haversine once per station
    if (d < best) { best = d; bestName = (s as any).name || ''; }
  }
  return { name: bestName, distance: best };
}

export function scoreFlats(
  flats: Flat[],
  weights: Weights,
  stations: (Pt & { name?: string })[],
  schools: Pt[],
  hospitals: Pt[]
) {
  const sumW = Object.values(weights).reduce((a,b)=>a+b, 0) || 1;
  const W = Object.fromEntries(Object.entries(weights).map(([k,v])=>[k, v/sumW])) as Weights;

  return flats.map(f => {
    const p = { lat: f.lat, lng: f.lng };
  // If coordinates are approximate (town centroid), assign neutral distances so they neither dominate nor collapse to 0.
  const isApprox = f.approx;
  const neutralDist = 750; // mid-range within school/mrt caps
  const dSchool = isApprox ? neutralDist : nearestDistance(p, schools);
  const mrtInfo = isApprox ? { name: '', distance: neutralDist } : nearestWithName(p, stations);
  const dMrt    = mrtInfo.distance;
  const dHosp   = isApprox ? neutralDist*2 : nearestDistance(p, hospitals);

    const sSchool = 1 - clamp01(dSchool / caps.school_m);
    const sMrt    = 1 - clamp01(dMrt    / caps.mrt_m);
    const sHosp   = 1 - clamp01(dHosp   / caps.hospital_m);

    const level = midLevel(f.storey_range);
    const sLevel = clamp01(level / 50);

    const ppsm = f.resale_price / Math.max(1, f.floor_area_sqm);
    const sPrice = 1 - clamp01((ppsm - 3000) / (9000 - 3000)); // tune bands

    const sLease = clamp01(f.remaining_lease_yrs / 99);

    const score =
      W.school*sSchool + W.mrt*sMrt + W.hospital*sHosp +
      W.level*sLevel + W.price*sPrice + W.lease*sLease;

    return { ...f, score, distances: { dSchool, dMrt, dHosp, approx: isApprox }, nearestStation: { name: mrtInfo.name, distance_m: Math.round(dMrt), approx: isApprox } };
  }).sort((a,b) => b.score - a.score);
}
