// lib/geocode.ts
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

export type GeocodeResult = {
  lat: number;
  lng: number;
  postal?: string;
  address?: string;
};

const BASE = "https://developers.onemap.sg/commonapi/search";
const CACHE_PATH = path.join(process.cwd(), 'data', 'geocode-cache.json');

function buildQuery(block: string, street: string) {
  // Normalize spacing/casing; keep "BLK" (OneMap understands this)
  const b = String(block).trim();
  const s = String(street).trim().replace(/\s+/g, " ");
  return `BLK ${b} ${s}, Singapore`;
}

let _cache: Record<string, GeocodeResult> | null = null;

function loadCache(): Record<string, GeocodeResult> {
  if (_cache) return _cache;
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    _cache = JSON.parse(raw);
  } catch {
    _cache = {};
  }
  return _cache!;
}
function persistCache() {
  if (!_cache) return;
  try { fs.writeFileSync(CACHE_PATH, JSON.stringify(_cache, null, 2), 'utf8'); } catch {}
}

export async function geocodeHdbAddress(block: string, street_name: string, town?: string)
: Promise<GeocodeResult | null> {
  const searchVal = buildQuery(block, street_name);
  const url = `${BASE}?searchVal=${encodeURIComponent(searchVal)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 429) {
      // Rate limited – brief backoff
      await new Promise(r=>setTimeout(r, 300));
    }
    return null;
  }
  const data = await res.json();

  if (!data?.results?.length) return null;

  // If town is supplied, prefer matches whose ADDRESS contains the town text
  let best = data.results[0];
  if (town) {
    const t = String(town).toUpperCase();
    const hit = data.results.find((r: any) => String(r.ADDRESS).toUpperCase().includes(t));
    if (hit) best = hit;
  }

  return {
    lat: Number(best.LATITUDE),
    lng: Number(best.LONGITUDE),
    postal: best.POSTAL,
    address: best.ADDRESS,
  };
}

export async function geocodeWithCache(block: string, street: string, town?: string) {
  const key = `${block}|${street}`.toUpperCase();
  const cache = loadCache();
  if (cache[key]) return cache[key];
  const res = await geocodeHdbAddress(block, street, town);
  if (res) { cache[key] = res; persistCache(); }
  return res;
}

export function cacheSize() { return Object.keys(loadCache()).length; }
