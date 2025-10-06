export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { username, password, ...rest } = await req.json();
    // 1) Basic validation
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  await connectDB();

  try {
    // 2) Normalize username (prevents case-dup issues)
    const uname = String(username).toLowerCase().trim();

    // 3) Find user
    const user = await User.findOne({ username: uname });
    if (!user) {
      // Do not reveal which part is wrong
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    // 4) Compare password with stored hash
    const ok = await bcrypt.compare(password, user.password); // field must contain the bcrypt hash
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    // 5) Success — set username cookie and return minimal user info
    const response = NextResponse.json({
      message: "Login successful.",
      user: { id: String(user._id), username: user.username },
    });
    response.cookies.set("username", user.username, {
      path: "/",
      httpOnly: false,
      sameSite: "lax"
    });
    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }

}