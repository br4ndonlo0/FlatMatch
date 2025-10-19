import { NextRequest, NextResponse } from "next/server";

const DATASET_ID = "d_688b934f82c1059ed0a6993d2a829089";
const API_URL = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}`;

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Unknown error' }, { status: 500 });
  }
}
