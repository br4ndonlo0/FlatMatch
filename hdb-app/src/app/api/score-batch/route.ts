// app/api/score-batch/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { geocodeWithCache } from "@/lib/geocode";
import { loadStations, loadHospitals, loadSchools, haversineMeters } from "@/lib/loaders";

type Item = {
  town: string;
  block: string;
  street_name: string;
  flat_type: string;
  month?: string;
  resale_price: string | number;
};

type WeightInput = {
  mrt: number;
  school: number;
  hospital: number;
  affordability: number;
};

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

function distanceToBaseScore(meters: number, capMeters: number): number {
  if (!Number.isFinite(meters)) return 0;
  const s = 100 * (1 - meters / capMeters);
  return Math.max(0, Math.min(100, s));
}

// TTL cache for batch results (same inputs → same outputs) to avoid recomputation
type CacheEntry = { ts: number; data: any };
const SCORE_CACHE = new Map<string, CacheEntry>();
const SCORE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Per-address distance memo to skip repeated nearest scans
type Dist = { dMrt: number; dSchool: number; dHospital: number };
const DIST_CACHE = new Map<string, Dist>();

function normU(s: string) { return (s || "").toString().trim().toUpperCase(); }
function addrKey(b: string, s: string, t: string) { return `${normU(b)}|${normU(s)}|${normU(t)}`; }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: Item[] = Array.isArray(body?.items) ? body.items : [];
    const weights: WeightInput = body?.weights ?? { mrt: 7, school: 6, hospital: 3, affordability: 8 };

    if (items.length === 0) {
      return NextResponse.json({ ok: true, results: [] });
    }

    // Cache key based on ordered compositeKeys (or normalized addresses) and weights
    const keyParts = items.map((it) => [
      encodeURIComponent(normU(it.block)),
      encodeURIComponent(normU(it.street_name)),
      encodeURIComponent(normU(it.flat_type)),
      encodeURIComponent((it.month || '').toString().trim()),
      '0',
    ].join('__'));
    const cacheKey = JSON.stringify({ k: keyParts, w: weights, v: 1 });
    const now = Date.now();
    const hit = SCORE_CACHE.get(cacheKey);
    if (hit && now - hit.ts < SCORE_TTL_MS) {
      return NextResponse.json(hit.data);
    }

    // Load amenities (cached in module scope by loaders.ts)
    const stations = loadStations();
    const hospitals = loadHospitals();
    const schools = loadSchools();

    const temp: Array<{
      item: Item;
      dMrt: number; dSchool: number; dHospital: number; price: number;
    }> = [];

    for (const it of items) {
      const pt = await geocodeWithCache(it.block, it.street_name, it.town);
      if (!pt) continue;
      const here = { lat: pt.lat, lng: pt.lng } as const;

      const k = addrKey(it.block, it.street_name, it.town);
      let dists = DIST_CACHE.get(k);
      if (!dists) {
        let bestMrt = Infinity, bestSch = Infinity, bestHosp = Infinity;
        for (const s of stations) {
          const d = haversineMeters(here as any, s as any);
          if (d < bestMrt) bestMrt = d;
        }
        for (const s of schools) {
          const d = haversineMeters(here as any, s as any);
          if (d < bestSch) bestSch = d;
        }
        for (const h of hospitals) {
          const d = haversineMeters(here as any, h as any);
          if (d < bestHosp) bestHosp = d;
        }
        dists = { dMrt: bestMrt, dSchool: bestSch, dHospital: bestHosp };
        DIST_CACHE.set(k, dists);
      }

      const price = Number(it.resale_price);
      temp.push({ item: it, dMrt: dists.dMrt, dSchool: dists.dSchool, dHospital: dists.dHospital, price });
    }

    if (temp.length === 0) {
      return NextResponse.json({ ok: true, results: [] });
    }

    const prices = temp.map(t => t.price).filter(Number.isFinite) as number[];
    const priceLow = Math.min(...prices);
    const priceHigh = Math.max(...prices);
    const priceSpan = Math.max(priceHigh - priceLow, 1);

    const w = {
      mrt: Math.max(0, weights.mrt || 0),
      school: Math.max(0, weights.school || 0),
      hospital: Math.max(0, weights.hospital || 0),
      affordability: Math.max(0, weights.affordability || 0),
    };
    let wSum = w.mrt + w.school + w.hospital + w.affordability;
    if (wSum <= 0) wSum = 4;
    const pct = {
      mrt: w.mrt / wSum,
      school: w.school / wSum,
      hospital: w.hospital / wSum,
      affordability: w.affordability / wSum,
    } as const;

    const MRT_CAP = 3000, SCHOOL_CAP = 2000, HOSPITAL_CAP = 3000;

    const results = temp.map(t => {
      const baseMrt = distanceToBaseScore(t.dMrt, MRT_CAP);
      const baseSchool = distanceToBaseScore(t.dSchool, SCHOOL_CAP);
      const baseHospital = distanceToBaseScore(t.dHospital, HOSPITAL_CAP);
      const priceScore = Number.isFinite(t.price) ? 100 * clamp01((priceHigh - t.price) / priceSpan) : 50;
      const score = pct.mrt * baseMrt + pct.school * baseSchool + pct.hospital * baseHospital + pct.affordability * priceScore;

      const compositeKey = [
        encodeURIComponent((t.item.block || "").toString().trim().toUpperCase()),
        encodeURIComponent((t.item.street_name || "").toString().trim().toUpperCase()),
        encodeURIComponent((t.item.flat_type || "").toString().trim().toUpperCase()),
        encodeURIComponent((t.item.month || "").toString().trim()),
        "0",
      ].join("__");

      return { compositeKey, score };
    });

    const payload = { ok: true, results } as const;
    SCORE_CACHE.set(cacheKey, { ts: Date.now(), data: payload });
    return NextResponse.json(payload);
  } catch (e: any) {
    console.error("[score-batch][POST] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
