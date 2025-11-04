import { NextResponse } from "next/server";
import { oneMapGET } from "../_lib";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radius = Number(searchParams.get("radius") || 1000);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
  }

  const qs = { latitude: lat, longitude: lon, radius_in_meters: radius };

  // Bus stops
  const busRes = await oneMapGET("/api/public/nearbysvc/getNearestBusStops", qs);
  const busJson = await busRes.json();
  const bus = (busJson ?? []).map((b: any) => ({
    id: String(b.id),
    name: b.name,
    lat: parseFloat(b.lat),
    lon: parseFloat(b.lon),
    road: b.road
  }));

  // MRT
  const mrtRes = await oneMapGET("/api/public/nearbysvc/getNearestMrtStops", qs);
  const mrtJson = await mrtRes.json();
  const mrt = (mrtJson ?? []).map((m: any) => ({
    id: String(m.id),
    name: m.name,
    lat: parseFloat(m.lat),
    lon: parseFloat(m.lon),
    road: m.road
  }));

  return NextResponse.json({ bus, mrt });
}