import 'server-only';
import { geocodeWithCache } from './geocode';
import { getTownCentroid } from './townCentroids';
import { Pt } from './geo';

// Simple fetch helper
async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed fetch ${url}`);
  return res.json();
}

export interface FlatRec {
  id: string;
  town: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: number;
  remaining_lease: string; // raw
  remaining_lease_yrs: number; // parsed
  resale_price: number;
  lat: number;
  lng: number;
  approx?: boolean; // true if using centroid fallback
}

function parseRemainingLease(raw: string): number {
  if (!raw) return 0;
  const m = raw.match(/(\d+)\s*years?(?:\s*(\d+)\s*months?)?/i);
  if (!m) return 0;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : 0;
  return y + mo / 12;
}

// Basic Singapore bounding box + numeric sanity check
function isValidCoord(lat: any, lng: any): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  // Rough SG bounds (lat ~1.20–1.50, lng ~103.55–104.10) allow a little slack
  return lat > 1.15 && lat < 1.55 && lng > 103.5 && lng < 104.15;
}

export async function loadFlatsForTowns(towns: string[], maxPerTown = 100): Promise<FlatRec[]> {
  // We'll page through the public API until we have enough per town (rough heuristic)
  const dataset_id = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
  const targetTowns = new Set(towns.map(t => t.toUpperCase()));
  const perTown: Record<string, FlatRec[]> = {};
  let offset = 0; const pageSize = 100; // moderate
  while (offset < 4000) { // safety bound
    const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${dataset_id}&limit=${pageSize}&offset=${offset}`;
    const data = await fetchJSON(url);
    const records = data.result.records;
    if (!records.length) break;
    let consecutiveGeoFailures = 0;
    for (const r of records) {
      const town = String(r.town || r.TOWN || '').toUpperCase();
      if (!targetTowns.has(town)) continue;
      if (!perTown[town]) perTown[town] = [];
      if (perTown[town].length >= maxPerTown) continue;
      const lease = parseRemainingLease(r.remaining_lease || r.REMAINING_LEASE);
      const price = Number(r.resale_price || r.RESALE_PRICE || 0);
      const fa = Number(r.floor_area_sqm || r.FLOOR_AREA_SQM || 0);
      const storey = String(r.storey_range || r.STOREY_RANGE || '');
      // Geocode block+street
      let geo = null;
      let usedFallback = false;
      try {
        geo = await geocodeWithCache(r.block || r.BLOCK, r.street_name || r.STREET_NAME, town);
        if (!geo) {
          consecutiveGeoFailures++;
          const centroid = getTownCentroid(town);
          if (centroid) {
            // Use centroid fallback (still counts as a recovery, reset failure counter partially)
            geo = { lat: centroid.lat, lng: centroid.lng } as any;
            console.warn('[loadFlatsForTowns] fallback centroid used for', town);
            consecutiveGeoFailures = Math.max(0, consecutiveGeoFailures - 5);
            usedFallback = true;
          } else if (consecutiveGeoFailures > 25) {
            console.warn('[loadFlatsForTowns] too many consecutive geocode nulls – temporarily skipping rest of page');
            break;
          } else {
            continue; // skip this record
          }
        } else {
          consecutiveGeoFailures = 0;
        }
        await new Promise(r => setTimeout(r, 60)); // throttle
      } catch (e) {
        consecutiveGeoFailures++;
        const centroid = getTownCentroid(town);
        if (centroid) {
          geo = { lat: centroid.lat, lng: centroid.lng } as any;
          console.warn('[loadFlatsForTowns] exception geocode -> centroid fallback', town);
          consecutiveGeoFailures = Math.max(0, consecutiveGeoFailures - 5);
          usedFallback = true;
        } else if (consecutiveGeoFailures > 25) {
          console.warn('[loadFlatsForTowns] aborting remaining records this page due to repeated geocode errors');
          break;
        } else {
          console.warn('[loadFlatsForTowns] geocode error', (e as any)?.message);
          continue;
        }
      }
      // Coordinate validation & secondary fallback attempt
      if (!isValidCoord((geo as any).lat, (geo as any).lng)) {
        console.warn('[loadFlatsForTowns] invalid coordinates', {
          town,
          block: r.block || r.BLOCK,
          street: r.street_name || r.STREET_NAME,
          lat: (geo as any).lat,
          lng: (geo as any).lng,
          approx: usedFallback
        });
        if (!usedFallback) {
          const centroid = getTownCentroid(town);
          if (centroid && isValidCoord(centroid.lat, centroid.lng)) {
            geo = { lat: centroid.lat, lng: centroid.lng } as any;
            usedFallback = true;
            console.warn('[loadFlatsForTowns] replaced invalid geocode with centroid fallback', town);
          } else {
            // Skip this record entirely if we cannot salvage
            continue;
          }
        } else {
          // Already using fallback but still invalid -> skip
          continue;
        }
      }
      perTown[town].push({
        id: `${r._id}`,
        town,
        block: r.block || r.BLOCK,
        street_name: r.street_name || r.STREET_NAME,
        storey_range: storey,
        floor_area_sqm: fa,
        remaining_lease: r.remaining_lease || r.REMAINING_LEASE,
        remaining_lease_yrs: lease,
        resale_price: price,
        lat: (geo as any).lat,
        lng: (geo as any).lng,
        approx: usedFallback,
      });
    }
    if (towns.every(t => (perTown[t] || []).length >= maxPerTown)) break;
    offset += pageSize;
  }
  return Object.values(perTown).flat();
}

/* -------------------- NEW: local GeoJSON helpers -------------------- */

async function readGeoJSON(relPath: string): Promise<any | null> {
  const fs = await import('node:fs/promises');
  const path = (await import('node:path')).default;
  const file = path.join(process.cwd(), 'data', relPath);
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[loader] failed to read ${relPath}:`, (e as any)?.message);
    return null;
  }
}

function toPtsFromGeoJSON(gj: any): Pt[] {
  if (!gj?.features) return [];
  const out: Pt[] = [];
  for (const f of gj.features) {
    try {
      const g = f?.geometry;
      if (!g) continue;
      if (g.type === 'Point' && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
        const [lng, lat] = g.coordinates; // GeoJSON is [lng, lat]
        if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
        continue;
      }
      if (g.type === 'Polygon' && Array.isArray(g.coordinates) && g.coordinates[0]?.length >= 3) {
        // polygon centroid
        const ring: number[][] = g.coordinates[0];
        let twiceArea = 0, cx = 0, cy = 0;
        for (let i = 0; i < ring.length - 1; i++) {
          const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
          const cross = x1 * y2 - x2 * y1;
          twiceArea += cross;
          cx += (x1 + x2) * cross;
          cy += (y1 + y2) * cross;
        }
        let lng = 0, lat = 0;
        if (twiceArea === 0) {
          lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
          lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
        } else {
          lng = cx / (3 * twiceArea);
          lat = cy / (3 * twiceArea);
        }
        if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
        continue;
      }
      if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) {
        // naive centroid across all rings
        let sumLat = 0, sumLng = 0, count = 0;
        for (const poly of g.coordinates as number[][][][]) {
          const ring = poly[0];
          for (const pt of ring) {
            if (Array.isArray(pt) && pt.length >= 2) {
              sumLng += pt[0];
              sumLat += pt[1];
              count++;
            }
          }
        }
        if (count > 0) {
          const lat = sumLat / count, lng = sumLng / count;
          if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
        }
        continue;
      }
    } catch {
      // skip bad feature
    }
  }
  return out;
}

/* -------------------- FIXED AMENITY LOADERS -------------------- */

// Use local GeoJSONs: schools_points.geojson + preschools.geojson
export async function loadSchools(): Promise<Pt[]> {
  const pts: Pt[] = [];
  const schoolsGJ = await readGeoJSON('schools_points.geojson');
  if (schoolsGJ) pts.push(...toPtsFromGeoJSON(schoolsGJ));
  const preschoolsGJ = await readGeoJSON('preschools.geojson');
  if (preschoolsGJ) pts.push(...toPtsFromGeoJSON(preschoolsGJ));

  if (pts.length === 0) {
    console.warn('[loader][loadSchools] No local school points found.');
  } else if (process.env.NODE_ENV !== 'production') {
    console.log('[loader][loadSchools] loaded', pts.length, 'school points from local files');
  }
  return pts;
}

// Use local CHAS Clinics (includes GPs, dental, some polyclinics)
export async function loadHospitals(): Promise<Pt[]> {
  const clinicsGJ = await readGeoJSON('chas_clinics.geojson');
  const pts = clinicsGJ ? toPtsFromGeoJSON(clinicsGJ) : [];
  if (pts.length === 0) {
    console.warn('[loader][loadHospitals] No local clinic/hospital points found.');
  } else if (process.env.NODE_ENV !== 'production') {
    console.log('[loader][loadHospitals] loaded', pts.length, 'clinic/hospital points from local files');
  }
  return pts;
}