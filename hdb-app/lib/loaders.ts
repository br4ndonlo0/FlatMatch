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
  return y + mo/12;
}

// Basic Singapore bounding box + numeric sanity check
function isValidCoord(lat: any, lng: any): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  // Rough SG bounds (lat ~1.20–1.50, lng ~103.55–104.10) allow a little slack
  return lat > 1.15 && lat < 1.55 && lng > 103.5 && lng < 104.15;
}

// Negative geocode cache to avoid retrying addresses that recently failed
const NEG_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const negCache = new Map<string, number>(); // key -> timestamp

function makeGeoKey(block: string, street: string, town: string) {
  return `${block.trim().toUpperCase()}|${street.trim().toUpperCase()}|${town.trim().toUpperCase()}`;
}
function isNegCached(key: string) {
  const ts = negCache.get(key);
  if (!ts) return false;
  if (Date.now() - ts > NEG_CACHE_TTL_MS) { negCache.delete(key); return false; }
  return true;
}
function markNeg(key: string) { negCache.set(key, Date.now()); }

export async function loadFlatsForTowns(towns: string[], maxPerTown = 100): Promise<FlatRec[]> {
  // We'll page through the public API until we have enough per town (rough heuristic)
  const dataset_id = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
  const targetTowns = new Set(towns.map(t=>t.toUpperCase()));
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
      const block = String(r.block || r.BLOCK || '');
      const street = String(r.street_name || r.STREET_NAME || '');
      const geoKey = makeGeoKey(block, street, town);
      // Geocode block+street
      let geo = null;
      let usedFallback = false;
      try {
        // Skip geocoding if we've seen this address fail recently
        if (isNegCached(geoKey)) {
          const centroid = getTownCentroid(town);
          if (centroid) {
            geo = { lat: centroid.lat, lng: centroid.lng } as any;
            usedFallback = true;
          } else {
            continue; // nothing we can do; skip the record
          }
        } else {
          geo = await geocodeWithCache(block, street, town);
        }
        if (!geo) {
          consecutiveGeoFailures++;
          const centroid = getTownCentroid(town);
          if (centroid) {
            // Use centroid fallback (still counts as a recovery, reset failure counter partially)
            geo = { lat: centroid.lat, lng: centroid.lng } as any;
            console.warn('[loadFlatsForTowns] fallback centroid used for', town);
            consecutiveGeoFailures = Math.max(0, consecutiveGeoFailures - 5);
            usedFallback = true;
            // mark this address as failed to geocode
            markNeg(geoKey);
          } else if (consecutiveGeoFailures > 25) {
            console.warn('[loadFlatsForTowns] too many consecutive geocode nulls – temporarily skipping rest of page');
            break;
          } else {
            continue; // skip this record
          }
        } else {
          consecutiveGeoFailures = 0;
        }
        await new Promise(r=>setTimeout(r, 60)); // throttle
      } catch (e) {
        consecutiveGeoFailures++;
        const centroid = getTownCentroid(town);
        if (centroid) {
          geo = { lat: centroid.lat, lng: centroid.lng } as any;
          console.warn('[loadFlatsForTowns] exception geocode -> centroid fallback', town);
          consecutiveGeoFailures = Math.max(0, consecutiveGeoFailures - 5);
          usedFallback = true;
          markNeg(geoKey);
        } else if (consecutiveGeoFailures > 25) {
          console.warn('[loadFlatsForTowns] aborting remaining records this page due to repeated geocode errors');
          break;
        } else {
          console.warn('[loadFlatsForTowns] geocode error', (e as any)?.message);
          markNeg(geoKey);
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
  block,
  street_name: street,
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
    if (towns.every(t=> (perTown[t]||[]).length >= maxPerTown)) break;
    offset += pageSize;
  }
  return Object.values(perTown).flat();
}

export async function loadSchools(): Promise<Pt[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  // If running server-side without a base URL, attempt direct dataset call as fallback
  const directUrl = 'https://data.gov.sg/api/action/datastore_search?resource_id=d_688b934f82c1059ed0a6993d2a829089';
  const url = base ? `${base}/api/schooldataset` : directUrl;
  try {
    const data = await fetchJSON(url);
    const recs = (data.result?.records)||[];
    const pts: Pt[] = [];
    for (const r of recs.slice(0, 300)) { // cap for performance
      const addr = r.address || r.Address || r.ADDRESS || r.name || '';
      if (!addr) continue;
      const m = addr.match(/BLK\s*(\d+)\s+(.*)/i);
      if (!m) continue;
      const block = m[1];
      const street = m[2];
      try {
        const g = await geocodeWithCache(block, street);
        if (g) pts.push({ lat: g.lat, lng: g.lng });
      } catch (e) {
        console.warn('[loadSchools] geocode error', (e as any)?.message);
      }
    }
    return pts;
  } catch (e) {
    console.error('[loadSchools] failed to fetch schools dataset', (e as any)?.message);
    return [];
  }
}

export async function loadHospitals(): Promise<Pt[]> { return []; }
