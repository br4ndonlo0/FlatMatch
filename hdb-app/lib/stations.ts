// lib/stations.ts
import 'server-only';

type StationPoint = { name: string; lat: number; lng: number; railType?: string };

function parseDescHTML(desc: string) {
  const map: Record<string,string> = {};
  const re = /<th>([^<]+)<\/th>\s*<td>([^<]+)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(desc))) map[m[1].trim().toUpperCase()] = m[2].trim();
  return { name: map["NAME"] ?? "", railType: map["RAIL_TYPE"], grnd: map["GRND_LEVEL"] };
}

function polygonCentroidLngLat(ring: number[][]) {
  let twiceArea = 0, cx = 0, cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i+1];
    const cross = x1*y2 - x2*y1;
    twiceArea += cross; cx += (x1 + x2) * cross; cy += (y1 + y2) * cross;
  }
  if (twiceArea === 0) {
    const lng = ring.reduce((s,p)=>s+p[0],0)/ring.length;
    const lat = ring.reduce((s,p)=>s+p[1],0)/ring.length;
    return { lng, lat };
  }
  return { lng: cx/(3*twiceArea), lat: cy/(3*twiceArea) };
}

let _cache: StationPoint[] | null = null;
let _loadedFile: string | null = null;

async function resolveStationsFile(): Promise<string> {
  const fs = await import('node:fs/promises');
  const path = (await import('node:path')).default;
  const dataDir = path.join(process.cwd(), 'data');
  const primary = path.join(dataDir, 'stations.geojson');
  try {
    await fs.access(primary);
    return primary;
  } catch {}
  // Fallback: look for any geojson containing "railstation" or "stationlayer"
  const entries = await fs.readdir(dataDir);
  const candidate = entries.find(f => /railstation|stationlayer/i.test(f) && f.toLowerCase().endsWith('.geojson'))
                 || entries.find(f => /station/.test(f) && f.toLowerCase().endsWith('.geojson'));
  if (candidate) {
    const resolved = path.join(dataDir, candidate);
    console.warn('[stations] Using fallback GeoJSON file:', candidate);
    return resolved;
  }
  throw new Error('No stations geojson file found in /data');
}

export async function loadStations(): Promise<StationPoint[]> {
  if (_cache) return _cache;
  const fs = await import('node:fs/promises');

  const filePath = _loadedFile ?? await resolveStationsFile();
  _loadedFile = filePath;

  const raw = await fs.readFile(filePath, 'utf8');
  const gj = JSON.parse(raw);

  const pts: StationPoint[] = gj.features.map((f: any) => {
    const desc = f.properties?.Description ?? '';
    const parsed = parseDescHTML(desc);
    if (f.geometry?.type === 'Point') {
      const [lng, lat] = f.geometry.coordinates; // GeoJSON [lng,lat]
      // Prefer parsed name (from Description) over placeholder Name (kml_*)
      let name = (parsed.name || f.properties?.NAME || f.properties?.Name || '').trim();
      if (/^kml_/i.test(name)) name = parsed.name || name;
      return { name, railType: parsed.railType || f.properties?.['Rail Type'], lat, lng };
    }
    if (f.geometry?.type === 'Polygon') {
      const { name: parsedName, railType } = parsed;
      const ring: number[][] = f.geometry.coordinates[0].map((pt: number[]) => [pt[0], pt[1]]);
      const { lng, lat } = polygonCentroidLngLat(ring);
      const name = (parsedName || f.properties?.NAME || f.properties?.Name || '').trim();
      return { name, railType, lat, lng };
    }
    if (f.geometry?.type === 'MultiPolygon') {
      // Compute a naive centroid across all rings of all polygons (sufficient for station label placement)
      try {
        const { name: parsedName, railType } = parsed;
        const polys: number[][][][] = f.geometry.coordinates;
        let sumLat = 0, sumLng = 0, count = 0;
        for (const poly of polys) {
          const ring = poly[0];
            for (const pt of ring) {
              if (Array.isArray(pt) && pt.length >= 2) {
                sumLng += pt[0];
                sumLat += pt[1];
                count++;
              }
            }
        }
        if (count > 0) {
          const lat = sumLat / count;
          const lng = sumLng / count;
          const name = (parsedName || f.properties?.NAME || f.properties?.Name || '').trim();
          return { name, railType, lat, lng };
        }
      } catch (e) {
        console.warn('[stations] failed MultiPolygon centroid', (e as any)?.message);
      }
      // fall through to skip if centroid computation failed
    }
    console.warn('[stations] skipping unsupported geometry', f.geometry?.type);
    return null;
  });

  const filtered = pts.filter(Boolean) as StationPoint[];
  if (process.env.NODE_ENV !== 'production') {
    console.log('[stations] loaded', filtered.length, 'stations. Sample:', filtered.slice(0,5).map(s=>s.name));
  }
  _cache = filtered;
  return filtered;
}
