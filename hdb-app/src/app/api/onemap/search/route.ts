import { NextResponse } from "next/server";
import { oneMapGET } from "../_lib";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  // Tokenised Search (path may be /commonapi/search on either domain)
  const res = await oneMapGET("/commonapi/search", {
    searchVal: query,
    returnGeom: "Y",
    getAddrDetails: "Y",
    pageNum: 1,
  });

  const j = await res.json();
  const first = j?.results?.[0];
  if (!first) return NextResponse.json({ result: null });

  const result = {
    lat: parseFloat(first.LATITUDE),
    lon: parseFloat(first.LONGITUDE),
    raw: first,
  };
  return NextResponse.json({ result });
}
