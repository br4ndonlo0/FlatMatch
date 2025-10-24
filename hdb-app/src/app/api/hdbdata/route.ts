export const runtime = "nodejs"; // ensures it runs server-side

import { NextResponse } from "next/server";

export async function GET(req: { url: string | URL; }) {
  try {
    const dataset_id = "d_8b84c4ee58e3cfc0ece0d773c8ca6abc";
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const q = searchParams.get("q");
    if (id) {
      // Try to fetch a batch and find the record with the given id
      // (data.gov.sg API does not support direct id lookup, so we fetch a large batch and filter)
      const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${dataset_id}&limit=1000`;
      const res = await fetch(url);
      const data = await res.json();
      const found = data.result.records.find((rec: any) => String(rec._id) === String(id));
      return NextResponse.json({
        success: true,
        count: found ? 1 : 0,
        records: found ? [found] : [],
      });
    } else {
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const offset = parseInt(searchParams.get("offset") || "0", 10);
      const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
      const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${dataset_id}&limit=${limit}&offset=${offset}${qParam}`;
      const res = await fetch(url);
      const data = await res.json();
      return NextResponse.json({
        success: true,
        count: data.result.records.length,
        records: data.result.records,
      });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
