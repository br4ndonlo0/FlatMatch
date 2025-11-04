// app/api/finder/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { geocodeWithCache } from "@/lib/geocode";
import { loadStations, loadHospitals, loadSchools, haversineMeters } from "@/lib/loaders";

// town+type loader with "cheapest recent 24 months" policy
import { loadCheapestRecentByBlockForTownsAndType, FlatRow } from "@/lib/resale";

// Distinct towns for the picker come from the live resale dataset
import { getAllTownsFromResaleAPI } from "@/lib/resale";

type WeightInput = {
  mrt: number;
  school: number;
  hospital: number;
  affordability: number;
};

// Simple in-memory cache for computed results (keyed by payload); TTL-based.
// This reduces repeated heavy work across users (especially for Featured on Home).
type CacheEntry = { ts: number; data: any };
const FINDER_CACHE = new Map<string, CacheEntry>();
const FINDER_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheKeyFromBody(body: any): string {
  const towns = Array.isArray(body?.towns) ? [...body.towns].map((t: string) => (t || "").toString().trim().toUpperCase()).sort() : [];
  const weights = body?.weights ?? {};
  const flatType = (body?.flatType || "").toString().trim().toUpperCase();
  const pricePolicy = (body?.pricePolicy || "cheapest-recent-24m").toString();
  return JSON.stringify({ towns, weights, flatType, pricePolicy, v: 1 });
}

// ---------- helpers ----------
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function distanceToBaseScore(meters: number, capMeters: number): number {
  if (!Number.isFinite(meters)) return 0;
  const s = 100 * (1 - meters / capMeters);
  return Math.max(0, Math.min(100, s));
}

function nearestDistance(
  here: { lat: number; lng: number },
  candidates: { lat: number; lng: number }[]
) {
  let best = Infinity;
  for (const c of candidates) {
    const d = haversineMeters(here as any, c as any);
    if (d < best) best = d;
  }
  return Number.isFinite(best) ? best : NaN;
}

// ---------- GET (utility ops like ?op=towns) ----------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const op = (searchParams.get("op") || "").toLowerCase();

  if (op === "towns") {
    try {
      const towns = await getAllTownsFromResaleAPI();
      return NextResponse.json({ ok: true, towns });
    } catch (e: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("[finder][GET towns] error:", e?.message || e);
      }
      // Fallback: let the UI still work with a few
      return NextResponse.json(
        { ok: true, towns: ["ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "QUEENSTOWN", "TOA PAYOH"] },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ ok: false, error: "Unknown op" }, { status: 400 });
}

// ---------- POST (main scoring) ----------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check cache first
    const key = cacheKeyFromBody(body);
    const now = Date.now();
    const hit = FINDER_CACHE.get(key);
    if (hit && now - hit.ts < FINDER_TTL_MS) {
      // console.log("[finder][POST] cache HIT for key", key);
      return NextResponse.json(hit.data);
    }
    const weights: WeightInput =
      body?.weights ?? { mrt: 7, school: 6, hospital: 3, affordability: 8 };

    const towns: string[] = Array.isArray(body?.towns) ? body.towns : [];
    const flatType: string = (body?.flatType || "").toString().trim().toUpperCase();

    const RECENT_MONTHS = 24; // policy window
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log("[finder][POST] towns=", towns, "flatType=", flatType, "policy=cheapest-recent", RECENT_MONTHS, "months");
      console.log("[finder][POST] weights=", weights);
    }

    if (towns.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No towns selected." },
        { status: 400 }
      );
    }
    if (!flatType) {
      return NextResponse.json(
        { ok: false, error: "No flat type selected." },
        { status: 400 }
      );
    }

    // Load amenities from local GeoJSON
    const stations = loadStations(); // MRT/LRT
    const hospitals = loadHospitals(); // clinics/hospitals
    const schools = loadSchools(); // MOE + preschools

    // Load representative flats per (BLOCK, STREET, TOWN) for the given flat type:
    // Representative row = cheapest resale in last RECENT_MONTHS; if none, cheapest ever.
    const flats: FlatRow[] = await loadCheapestRecentByBlockForTownsAndType(towns, flatType, RECENT_MONTHS);

  if (isDev) console.log(`[finder][POST] candidates after grouping: ${flats.length}`);

    type Temp = {
      row: FlatRow;
      here: { lat: number; lng: number } | null;
      dMrt: number;
      dSchool: number;
      dHospital: number;
      price: number;
    };
    const temp: Temp[] = [];

    let misses = 0;
    const missSamples: string[] = [];

    for (const row of flats) {
      const pt = await geocodeWithCache(row.block, row.street_name, row.town);
      if (!pt) {
        misses++;
        if (missSamples.length < 8) missSamples.push(`${row.block} | ${row.street_name} | ${row.town}`);
        continue;
      }
      const here = { lat: pt.lat, lng: pt.lng };
      const dMrt = nearestDistance(here, stations);
      const dSchool = nearestDistance(here, schools);
      const dHospital = nearestDistance(here, hospitals);
      const price = Number(row.resale_price);

      temp.push({ row, here, dMrt, dSchool, dHospital, price });
    }

  if (isDev) console.log(`[finder][POST] geocoded ok=${temp.length}, misses=${misses}`);
  if (misses > 0 && isDev) console.warn("[finder][POST] sample geocode misses:", missSamples);

    if (temp.length === 0) {
      return NextResponse.json({ ok: true, results: [] });
    }

    // Price normalization window
    const validPrices = temp.map((t) => t.price).filter(Number.isFinite) as number[];
    const priceLow = Math.min(...validPrices);
    const priceHigh = Math.max(...validPrices);
    const priceSpan = Math.max(priceHigh - priceLow, 1);
    if (isDev) {
      console.log(
        `[finder][POST] price window among candidates: low=${priceLow} high=${priceHigh} span=${priceSpan}`
      );
    }

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
    };

    const MRT_CAP = 3000;
    const SCHOOL_CAP = 2000;
    const HOSPITAL_CAP = 3000;

    const results = temp.map((t) => {
      const baseMrt = distanceToBaseScore(t.dMrt, MRT_CAP);
      const baseSchool = distanceToBaseScore(t.dSchool, SCHOOL_CAP);
      const baseHospital = distanceToBaseScore(t.dHospital, HOSPITAL_CAP);
      const priceScore =
        Number.isFinite(t.price) ? 100 * clamp01((priceHigh - t.price) / priceSpan) : 50;

      const score =
        pct.mrt * baseMrt +
        pct.school * baseSchool +
        pct.hospital * baseHospital +
        pct.affordability * priceScore;

      // Build composite key with the chosen representative month (cheapest-recent)
      const compositeKey = [
        (t.row.block || "").toString().trim().toUpperCase(),
        (t.row.street_name || "").toString().trim().toUpperCase(),
        (t.row.flat_type || "").toString().trim().toUpperCase(),
        (t.row.month || "").toString().trim(),
        "0",
      ].map(encodeURIComponent).join("__");

      return {
        town: t.row.town,
        block: t.row.block,
        street_name: t.row.street_name,
        resale_price: t.row.resale_price,
        score,
        flat_type: t.row.flat_type,
        month: t.row.month,
        distances: { dMrt: t.dMrt, dSchool: t.dSchool, dHospital: t.dHospital },
        compositeKey,
      };
    });

    results.sort((a, b) => (b.score - a.score));

  if (isDev) console.log("[finder][POST] top 3:", results.slice(0, 3).map(r => `${r.compositeKey} $${r.resale_price}`));
    const payload = { ok: true, results } as const;
    FINDER_CACHE.set(key, { ts: Date.now(), data: payload });
    return NextResponse.json(payload);
  } catch (e: any) {
    console.error("[finder][POST] error:", e?.message || e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}