import { NextRequest, NextResponse } from "next/server";

const DATASET_ID = "d_8d886e3a83934d7447acdf5bc6959999";
const API_URL = `https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET_ID}/poll-download`;

export async function GET(req: NextRequest) {
  try {
    const pollRes = await fetch(API_URL);
    const jsonData = await pollRes.json();
    if (jsonData['code'] !== 0) {
      return NextResponse.json({ success: false, error: jsonData['errMsg'] }, { status: 500 });
    }
    const downloadUrl = jsonData['data']['url'];
    const dataRes = await fetch(downloadUrl);
    const text = await dataRes.text();
    return NextResponse.json({ success: true, data: text });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Unknown error' }, { status: 500 });
  }
}
