import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

type Coords = { lat: number; lon: number };

declare global {
  // eslint-disable-next-line no-var
  var __coordsCache: Map<string, Coords> | undefined;
}

function expandAbbrev(s: string) {
  return s
    .replace(/\bAVE\b/g, "AVENUE")
    .replace(/\bRD\b/g, "ROAD")
    .replace(/\bDR\b/g, "DRIVE")
    .replace(/\bST\b/g, "STREET");
}

function normKey(block: string, street: string) {
  const joined = `${block} ${street}`.toUpperCase();
  return expandAbbrev(joined)
    .replace(/\bBLK\b/g, "")
    .replace(/\bBLOCK\b/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// very small CSV parser that handles quotes and commas
function splitCsv(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function findIndex(cols: string[], candidates: string[]) {
  const set = new Set(candidates.map((c) => c.toLowerCase()));
  const idx = cols.findIndex((c) => set.has(c.toLowerCase()));
  return idx >= 0 ? idx : -1;
}

async function loadCoordsMap(): Promise<Map<string, Coords>> {
  if (global.__coordsCache) return global.__coordsCache;

  const file = path.join(process.cwd(), "data", "hdb_property_information_ll.csv");
  const text = await fs.readFile(file, "utf8");

  const lines = text.split(/\r?\n/);
  const header = lines.shift() ?? "";
  const headerParts = splitCsv(header);
  const cols = headerParts.map((h) => h.trim().toLowerCase());

  const iBlock = findIndex(cols, ["block", "blk_no", "blk", "blkno"]);
  const iStreet = findIndex(cols, ["street_name", "street", "road_name", "road"]);
  const iLat = findIndex(cols, ["lat", "latitude", "y", "y_coord", "ycoord"]);
  const iLon = findIndex(cols, ["lon", "lng", "longitude", "x", "x_coord", "xcoord"]);

  if ([iBlock, iStreet, iLat, iLon].some((i) => i < 0)) {
    throw new Error("CSV missing required columns (block/street/lat/lon).");
  }

  const map = new Map<string, Coords>();
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = splitCsv(line);
    const b = parts[iBlock];
    const s = parts[iStreet];
    const latStr = parts[iLat];
    const lonStr = parts[iLon];
    if (!b || !s || !latStr || !lonStr) continue;

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const key = normKey(b, s);
    if (!map.has(key)) map.set(key, { lat, lon });
  }

  global.__coordsCache = map;
  return map;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const block = (searchParams.get("block") || "").trim();
  const street = (searchParams.get("street") || "").trim();

  if (!block || !street) {
    return NextResponse.json({ error: "Missing block/street" }, { status: 400 });
  }

  try {
    const map = await loadCoordsMap();
    const key = normKey(block, street);
    const result = map.get(key) || null;
    if (!result) return NextResponse.json({ result: null }, { status: 404 });
    return NextResponse.json({ result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Lookup failed" }, { status: 500 });
  }
}