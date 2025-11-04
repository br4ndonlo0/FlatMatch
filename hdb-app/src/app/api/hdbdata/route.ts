// app/api/hdbdata/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * Data.gov.sg HDB Resale dataset (Jan 2017–present)
 * CKAN resource id (stable): f1765b54-a209-4718-8d38-a39237f502b3
 */
const RESOURCE_ID = "f1765b54-a209-4718-8d38-a39237f502b3";

/**
 * Helpers
 */
function buildUrl(params: Record<string, string | number | undefined>) {
  const u = new URL("https://data.gov.sg/api/action/datastore_search");
  u.searchParams.set("resource_id", RESOURCE_ID);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export async function GET(req: { url: string | URL }) {
  try {
    const { searchParams } = new URL(req.url);

    // MODE 1: exact lookup by fields used in the composite key
    // ?lookup=1&block=...&street_name=...&flat_type=...&month=...
    if (searchParams.get("lookup") === "1") {
      const block = searchParams.get("block") || "";
      const street_name = searchParams.get("street_name") || "";
      const flat_type = searchParams.get("flat_type") || "";
      const month = searchParams.get("month") || "";
      const limit = parseInt(searchParams.get("limit") || "20", 10) || 20;
      const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;

      const filters = {
        block,
        street_name,
        flat_type,
        month,
      };

      const url = buildUrl({
        limit,
        offset,
        filters: JSON.stringify(filters),
      });

      console.log(
        "[hdbdata] Query filters:",
        filters,
        "offset:",
        offset,
        "limit:",
        limit,
        "sort: (none)"
      );
      console.log("[hdbdata] Fetch:", url);

      const res = await fetch(url);
      const data = await res.json();
      const records = data?.result?.records ?? [];
      if (records.length > 0) {
        const s = records[0];
        console.log(
          "[hdbdata] Returned",
          records.length,
          "records. Sample:",
          `{_id:${s._id}, block:${s.block}, street_name:${s.street_name}, flat_type:${s.flat_type}, month:${s.month}}`
        );
      }
      return NextResponse.json({
        success: true,
        count: records.length,
        records,
      });
    }

    // MODE 2: pick a **real** record for a (block, street_name) pair
    // ?pickOne=1&block=...&street_name=...&prefer=first|last
    // Optionally restrict by flat_type (?flat_type=3%20ROOM)
    if (searchParams.get("pickOne") === "1") {
      const block = searchParams.get("block") || "";
      const street_name = searchParams.get("street_name") || "";
      const flat_type = searchParams.get("flat_type") || undefined;
      const prefer = (searchParams.get("prefer") || "first").toLowerCase(); // "first" (oldest) or "last" (newest)

      const filters: Record<string, string> = { block, street_name };
      if (flat_type) filters.flat_type = flat_type;

      const sort =
        prefer === "last" ? "month desc" : "month asc"; // CKAN supports 'sort' = "field asc|desc"

      const url = buildUrl({
        limit: 1,
        offset: 0,
        filters: JSON.stringify(filters),
        sort,
      });

      console.log("[hdbdata] pickOne:", { filters, prefer, url });

      const res = await fetch(url);
      const data = await res.json();
      const records = data?.result?.records ?? [];
      return NextResponse.json({
        success: true,
        count: records.length,
        record: records[0] || null,
      });
    }

    // MODE 3: generic page (used by listing/page.tsx)
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const q = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "";
  const townRaw = searchParams.get("town") || "";
  const town = townRaw.trim().toUpperCase();

    console.log("[hdbdata] Generic page fetch:", { q: q || undefined, town: town || undefined, offset, limit, sort });

    // If a town is provided, prefer using CKAN filters for an exact town match
    const url = buildUrl({
      limit,
      offset,
      ...(q ? { q } : {}),
      ...(sort ? { sort } : {}),
      ...(town ? { filters: JSON.stringify({ town }) } : {}),
    });

    console.log("[hdbdata] Fetch:", url);

    const res = await fetch(url);
    const data = await res.json();
    const records = data?.result?.records ?? [];

    if (records.length > 0) {
      const s = records[0];
      console.log(
        "[hdbdata] Returned",
        records.length,
        "records. Sample:",
        `{_id:${s._id}, block:${s.block}, street_name:${s.street_name}, flat_type:${s.flat_type}, month:${s.month}}`
      );
    }

    return NextResponse.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error("[hdbdata] ERROR:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}