export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { oldPassword, newPassword, rePassword } = await req.json();
    if (!oldPassword || !newPassword || !rePassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (String(newPassword).length < 5) {
      return NextResponse.json({ error: "New password must be at least 5 characters." }, { status: 400 });
    }
    if (newPassword !== rePassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    await connectDB();
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;
    if (!username) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const user = await User.findOne({ username: String(username).toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const ok = await bcrypt.compare(String(oldPassword), user.password);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const same = await bcrypt.compare(String(newPassword), user.password);
    if (same) {
      return NextResponse.json({ error: "New password cannot be the same as the current password." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    user.password = passwordHash;
    await user.save();

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
