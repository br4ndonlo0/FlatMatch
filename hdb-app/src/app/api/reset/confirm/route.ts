export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: "username and password are required" }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  try {
    await connectDB();
    const uname = String(username).toLowerCase().trim();
    const user = await User.findOne({ username: uname });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const hash = await bcrypt.hash(String(password), 10);
    user.password = hash;
    await user.save();

    return NextResponse.json({ message: "Password updated" });
  } catch (err: any) {
    console.error("reset confirm error:", err);
    const devMessage = err?.message || String(err);
    return NextResponse.json({ error: process.env.NODE_ENV !== 'production' ? `Reset failed: ${devMessage}` : "Reset failed" }, { status: 500 });
  }
}

// Handy GET handler to verify the route is active in the browser.
// Open /api/reset/confirm to confirm this file is being picked up by Next.js.
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/reset/confirm", method: "GET" });
}
