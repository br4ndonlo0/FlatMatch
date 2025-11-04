import { NextResponse } from "next/server";
import { oneMapGET } from "../../onemap/_lib";

// Google-style polyline decoder
function decodePolyline(encoded: string): [number, number][] {
  let index = 0, lat = 0, lng = 0, coordinates: [number, number][] = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    coordinates.push([lat / 1e5, lng / 1e5]);
  }
  return coordinates;
}

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = (searchParams.get("start") || "").split(",").map(Number);
  const end   = (searchParams.get("end") || "").split(",").map(Number);
  const type  = searchParams.get("type") || "walk";

  if (start.length !== 2 || end.length !== 2 || !start.every(Number.isFinite) || !end.every(Number.isFinite)) {
    return NextResponse.json({ error: "start/end required: 'lat,lon'" }, { status: 400 });
    }

  const res = await oneMapGET("/api/public/routingsvc/route", {
    start: `${start[0]},${start[1]}`,
    end: `${end[0]},${end[1]}`,
    routeType: type,
  });

  const j = await res.json();
  const geom = j?.route_geometry || j?.route?.route_geometry || "";
  const summary = j?.route_summary || j?.summary || j;
  const totalTimeSec = summary?.total_time ?? summary?.totalTime ?? null;
  const totalDistM   = summary?.total_distance ?? summary?.totalDist ?? null;
  const poly = geom ? decodePolyline(geom) : [];

  return NextResponse.json({ poly, totalTimeSec, totalDistM });
}