export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";

export async function POST(req: Request) {
  const { username } = await req.json().catch(() => ({}));
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }
  try {
    await connectDB();
    const uname = String(username).toLowerCase().trim();
    const user = await User.findOne({ username: uname }).select({ _id: 1 });
    if (!user) return NextResponse.json({ exists: false });
    return NextResponse.json({ exists: true });
  } catch (err: any) {
    console.error("reset check error:", err);
    const devMessage = err?.message || String(err);
    return NextResponse.json({ error: process.env.NODE_ENV !== 'production' ? `Failed: ${devMessage}` : "Failed" }, { status: 500 });
  }
}
