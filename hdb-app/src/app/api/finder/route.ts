// app/api/finder/route.ts
import { NextResponse } from "next/server";
import { loadStations } from "@/lib/stations";
import { scoreFlats } from "@/lib/scoring";
import { loadFlatsForTowns, loadSchools } from "@/lib/loaders";

// Helper to normalise/validate weight numbers
function normaliseWeight(v: any, fallback: number) {
  const n = Number(v);
  if (Number.isFinite(n) && n >= 0) return n; // allow 0
  return fallback;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const weights = (body.weights || {}) as { [k: string]: number };
    const towns: string[] = Array.isArray(body.towns) ? body.towns.slice(0,3) : [];
    if (!towns.length) return NextResponse.json({ ok:false, error:"No towns provided" }, { status:400 });

    // Fetch core datasets in parallel
    const [stations, schools, flats] = await Promise.all([
      loadStations().catch(e=>{ console.error('[finder] stations load failed', e); return []; }),
      loadSchools().catch(e=>{ console.error('[finder] schools load failed', e); return []; }),
      loadFlatsForTowns(towns).catch(e=>{ console.error('[finder] flats load failed', e); return []; }),
    ]);

    if (!flats.length) {
      return NextResponse.json({ ok:false, error:"No flats gathered (all geocodes failed and no centroid fallback?)", diagnostics: { stations: stations.length, schools: schools.length } }, { status:502 });
    }

    const ranked = scoreFlats(flats, {
      school: normaliseWeight(weights.school, 5),
      mrt: normaliseWeight(weights.mrt, 5),
      hospital: 0, // ignored for now
      level: normaliseWeight(weights.level, 5),
      price: normaliseWeight(weights.price, 5),
      lease: normaliseWeight(weights.lease, 5),
    }, stations, schools, []);

    return NextResponse.json({ ok: true, count: ranked.length, results: ranked.slice(0, 50) });
  } catch (e:any) {
    // Log full stack on server for debugging
    console.error('[finder] fatal error', e);
    return NextResponse.json({ ok:false, error: String(e), stack: process.env.NODE_ENV !== 'production' ? e?.stack : undefined }, { status: 500 });
  }
}
