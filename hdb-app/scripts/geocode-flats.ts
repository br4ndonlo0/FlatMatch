// scripts/geocode-flats.ts (run with ts-node or as a Node script)
import { geocodeHdbAddress } from "@/lib/geocode";
import fs from "node:fs/promises";

type Flat = { block:string; street_name:string; town?:string };

async function sleep(ms:number){ return new Promise(r=>setTimeout(r, ms)); }

async function geocodeMany(flats: Flat[]) {
  const cachePath = "data/geocode-cache.json";
  let cache: Record<string, {lat:number;lng:number;postal?:string}> = {};
  try { cache = JSON.parse(await fs.readFile(cachePath, "utf8")); } catch {}

  const keyOf = (b:string,s:string)=> `${b}|${s}`.toUpperCase();

  for (const f of flats) {
    const key = keyOf(f.block, f.street_name);
    if (cache[key]) continue;

    const hit = await geocodeHdbAddress(f.block, f.street_name, f.town);
    if (hit) {
      cache[key] = { lat: hit.lat, lng: hit.lng, postal: hit.postal };
      console.log("OK", key, hit.postal);
    } else {
      console.warn("MISS", key);
    }
    await sleep(120); // be polite; avoid rate limits
  }

  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
  return cache;
}
