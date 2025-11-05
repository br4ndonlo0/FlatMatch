// app/api/finder/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { geocodeWithCache } from "@/lib/geocode";
import { loadHospitals, loadSchools } from "@/lib/loaders";
import { loadStations } from "@/lib/stations";
import { haversine } from "@/lib/geo";
import { evaluateAffordability } from "@/lib/affordability";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";

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
  const towns = Array.isArray(body?.towns)
    ? [...body.towns].map((t: string) => (t || "").toString().trim().toUpperCase()).sort()
    : [];
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

// Normalize ANY pointish shape to {lat,lng}
type AnyPoint = any;
type LL = { lat: number; lng: number };

function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function normalizePoints(items: AnyPoint[], label: string): LL[] {
  const out: LL[] = [];
  for (const it of items || []) {
    let lat: any, lng: any;

    if (it == null) continue;

    // direct fields
    if (it.lat !== undefined) lat = it.lat;
    if (it.lng !== undefined) lng = it.lng;

    // common alternates
    if (lng === undefined && it.lon !== undefined) lng = it.lon;
    if (lat === undefined && it.latitude !== undefined) lat = it.latitude;
    if (lng === undefined && it.longitude !== undefined) lng = it.longitude;

    // GeoJSON Feature<Point>
    if ((lat === undefined || lng === undefined) && it.geometry?.type === "Point" && Array.isArray(it.geometry.coordinates)) {
      const [lonV, latV] = it.geometry.coordinates;
      lat = lat ?? latV;
      lng = lng ?? lonV;
    }

    // Generic coordinates: [lon, lat]
    if ((lat === undefined || lng === undefined) && Array.isArray(it.coordinates) && it.coordinates.length >= 2) {
      const [lonV, latV] = it.coordinates;
      lat = lat ?? latV;
      lng = lng ?? lonV;
    }

    const latN = toNum(lat);
    const lngN = toNum(lng);
    if (Number.isFinite(latN) && Number.isFinite(lngN)) {
      out.push({ lat: latN, lng: lngN });
    }
  }

  if (process.env.NODE_ENV !== "production") {
    if (out.length === 0 && (items || []).length > 0) {
      console.warn(`[finder][normalizePoints] "${label}" points present but none normalized. First sample:`, (items || [])[0]);
    }
  }
  return out;
}

function nearestDistance(
  here: { lat: number; lng: number },
  candidates: LL[]
) {
  if (!candidates || candidates.length === 0) return NaN;
  let best = Infinity;
  for (const c of candidates) {
    const d = haversine(here.lat, here.lng, c.lat, c.lng);
    if (Number.isFinite(d) && d < best) best = d;
  }
  return Number.isFinite(best) ? best : NaN;
}

/** Approximate remaining lease years (no dependency on parseRemainingLeaseYears).
 * Uses 99-year lease assumption from `lease_commence_date` and listing `month` (YYYY-MM).
 * Always returns a number.
 */
function estimateRemainingLeaseYears(row: FlatRow): number {
  const anyRow = row as any;
  const startYear = Number(anyRow?.lease_commence_date);
  let txnYear = new Date().getFullYear();
  if (typeof row.month === "string" && /^\d{4}/.test(row.month)) {
    const y = Number(row.month.slice(0, 4));
    if (Number.isFinite(y)) txnYear = y;
  }
  if (Number.isFinite(startYear)) {
    const elapsed = Math.max(0, txnYear - startYear);
    const rem = Math.max(0, 99 - elapsed);
    return Math.min(99, rem);
  }
  return 50; // neutral fallback if unknown
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

    // Fetch user info for affordability calculation
    let userAge: number | undefined;
    let userIncome: number | undefined;
    let userDownPaymentBudget: number | undefined;

    try {
      await connectDB();
      const cookieStore = await cookies();
      const username = cookieStore.get("username")?.value;
      if (username) {
        const user = await User.findOne({ username });
        if (user) {
          userAge = user.age;
          userIncome = user.income ? Number(user.income) : undefined;
          userDownPaymentBudget = user.downPaymentBudget;
        }
      }
    } catch (e) {
      // If we can't fetch user info, affordability scoring will fall back to price-based
      console.warn("[finder][POST] Could not fetch user info for affordability:", e);
    }

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

    // Load amenities from local GeoJSON (raw shapes may vary)
    const stationsRaw = await loadStations();   // MRT/LRT
    const hospitalsRaw = await loadHospitals(); // clinics/hospitals
    const schoolsRaw = await loadSchools();     // MOE + preschools

    // Normalize to {lat,lng} so distances compute correctly
    const stations = normalizePoints(stationsRaw, "stations");
    const hospitals = normalizePoints(hospitalsRaw, "hospitals");
    const schools = normalizePoints(schoolsRaw, "schools");

    // Load representative flats per (BLOCK, STREET, TOWN) for the given flat type:
    // Representative row = cheapest resale in last RECENT_MONTHS; if none, cheapest ever.
    const flats: FlatRow[] = await loadCheapestRecentByBlockForTownsAndType(
      towns,
      flatType,
      RECENT_MONTHS
    );

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
      if (!pt || !Number.isFinite(pt.lat) || !Number.isFinite(pt.lng)) {
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

      // Calculate affordability score using our library
      let affordabilityScore = 50; // Default fallback (mid-range)

      // Only compute user-based affordability when inputs are valid numbers
      const hasAffordInputs =
        typeof userAge === "number" && Number.isFinite(userAge) &&
        typeof userIncome === "number" && Number.isFinite(userIncome);

      if (hasAffordInputs) {
        const remainingLeaseYears = estimateRemainingLeaseYears(t.row);

        const args: {
          price: number;
          age: number;
          remainingLeaseYears: number;
          incomePerAnnum: number;
          downPaymentBudget?: number;
        } = {
          price: t.price,
          age: userAge as number,
          remainingLeaseYears,
          incomePerAnnum: userIncome as number,
        };

        if (typeof userDownPaymentBudget === "number" && Number.isFinite(userDownPaymentBudget)) {
          args.downPaymentBudget = userDownPaymentBudget;
        }

        const evaluation = evaluateAffordability(args);
        if (evaluation?.score !== undefined) {
          affordabilityScore = (evaluation.score / 10) * 100;
        }
      } else {
        // Fallback to price-based scoring if no user info
        affordabilityScore = Number.isFinite(t.price)
          ? 100 * clamp01((priceHigh - t.price) / priceSpan)
          : 50;
      }

      const score =
        pct.mrt * baseMrt +
        pct.school * baseSchool +
        pct.hospital * baseHospital +
        pct.affordability * affordabilityScore;

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
        affordabilityScore: affordabilityScore / 10, // Convert back to 1-10 scale for display
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