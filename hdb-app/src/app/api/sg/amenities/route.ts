import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

type Amenity = { id: string; name: string; lat: number; lon: number; type: string };

// Match your actual filenames in /data exactly:
const FILES: Record<string, string[]> = {
  // We keep “Schools” as one option that merges both datasets
  Schools: ["schools_points.geojson", "preschools.geojson"],
  Clinics: ["chas_clinics.geojson"],
  Supermarkets: ["SupermarketsGEOJSON.geojson"],
  HawkerCentres: ["HawkerCentresGEOJSON.geojson"],
  Parks: ["Parks.geojson"],
  Libraries: ["Libraries.geojson"],
  CommunityClubs: ["CommunityClubPAssionWaVeOutlet.geojson"],
};

// --- utilities ---
function haversineMeters(lat1:number, lon1:number, lat2:number, lon2:number) {
  const toRad = (d:number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseGeoJSON(buf: Buffer) {
  try { return JSON.parse(buf.toString("utf-8")); } catch { return null; }
}

function parseDescPairs(html?: string): Record<string,string> {
  if (!html || typeof html !== "string") return {};
  const pairs = Array.from(html.matchAll(
    /<th[^>]*>\s*([^<]+?)\s*<\/th>\s*<td[^>]*>\s*([^<]*?)\s*<\/td>/gi
  ));
  const out: Record<string, string> = {};
  for (const m of pairs) {
    const k = String(m[1] || "").trim();
    const v = String(m[2] || "").trim();
    if (k) out[k] = v;
  }
  return out;
}

// dataset-aware name selection (based on your files’ headers)
function pickNameByType(type: string, props: any): string | null {
  const p = props || {};
  const desc = p.Description || p.DESCRIPTION;
  const table = parseDescPairs(desc);

  switch (type) {
    case "Schools":
      // schools_points.geojson → name; preschools.geojson → Description.CENTRE_NAME
      return (
        p.name ||
        p.NAME ||
        table["CENTRE_NAME"] ||
        null
      );

    case "Clinics":
      // chas_clinics.geojson → Description.HCI_NAME
      return table["HCI_NAME"] || p.HCI_NAME || null;

    case "Supermarkets":
      // SupermarketsGEOJSON.geojson → Description.LIC_NAME
      return table["LIC_NAME"] || p.LIC_NAME || null;

    case "Libraries":
      // Libraries.geojson → Description.NAME
      return table["NAME"] || p.NAME || null;

    case "CommunityClubs":
      // CommunityClubPAssionWaVeOutlet.geojson → Description.NAME
      return table["NAME"] || p.NAME || null;

    case "HawkerCentres":
      // HawkerCentresGEOJSON.geojson → NAME
      return p.NAME || null;

    case "Parks":
      // Parks.geojson → NAME
      return p.NAME || null;

    default:
      return p.NAME || p.Name || p.name || null;
  }
}

function normalizeFeature(f: any, type: string, idx: number): Amenity | null {
  const geom = f?.geometry;
  const coords = geom?.coordinates;
  let lon: number | undefined;
  let lat: number | undefined;

  if (geom?.type === "Point" && Array.isArray(coords) && coords.length >= 2) {
    lon = parseFloat(coords[0]);
    lat = parseFloat(coords[1]);
  }
  if (!Number.isFinite(lat!) || !Number.isFinite(lon!)) return null;

  const props = f?.properties || {};
  const name = pickNameByType(type, props) || "";
  const id = String(
    props.id ?? f.id ?? props.OBJECTID ?? props.FID ?? props.FID_ ?? idx
  );

  return { id, name: name.trim() || id, lat: lat!, lon: lon!, type };
}

export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const type = sp.get("type") || "";
    const lat = parseFloat(sp.get("lat") || "");
    const lon = parseFloat(sp.get("lon") || "");
    const radius = parseInt(sp.get("radius") || "1000", 10);

    if (!type || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "Missing or invalid params" }, { status: 400 });
    }

    const files = FILES[type] || [];
    if (!files.length) {
      return NextResponse.json({ features: [] as Amenity[] });
    }

    const base = path.join(process.cwd(), "data");
    const all: Amenity[] = [];

    for (const fname of files) {
      try {
        const p = path.join(base, fname);
        const buf = await fs.readFile(p);
        const gj = parseGeoJSON(buf);
        const feats: any[] = gj?.features || gj?.Features || [];
        feats.forEach((f: any, i: number) => {
          const a = normalizeFeature(f, type, i);
          if (a) all.push(a);
        });
      } catch {
        // file missing/invalid → skip
      }
    }

    const filtered = all.filter(a => haversineMeters(lat, lon, a.lat, a.lon) <= radius);
    return NextResponse.json({ features: filtered });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}