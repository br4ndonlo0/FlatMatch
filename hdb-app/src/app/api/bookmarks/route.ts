import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Bookmark from "@/models/Bookmark";

// In-memory fallback store when MongoDB isn't configured or reachable
const MEM_BOOKMARKS = new Map<string, any[]>();

async function ensureDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return false; // no DB configured
  }
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
    return true;
  } catch (e) {
    console.error("[bookmarks] Mongo connect failed, falling back to memory:", (e as any)?.message || e);
    return false;
  }
}

// GET: Get all bookmarks for a user
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ success: false, error: "Username required" }, { status: 400 });
  }
  const hasDB = await ensureDB();
  if (!hasDB) {
    const items = MEM_BOOKMARKS.get(username) || [];
    return NextResponse.json({ success: true, bookmarks: items });
  }
  const entry = await Bookmark.findOne({ username });
  return NextResponse.json({ success: true, bookmarks: entry?.bookmarks || [] });
}

// POST: Add a bookmark for a user
export async function POST(req: NextRequest) {
  let { username, bookmark } = await req.json();
  if (!username || !bookmark) {
    return NextResponse.json({ success: false, error: "Username and bookmark required" }, { status: 400 });
  }
  // Always store the raw, decoded compositeKey
  if (bookmark.compositeKey) {
    try {
      bookmark.compositeKey = decodeURIComponent(bookmark.compositeKey);
    } catch (e) {
      // fallback: if decode fails, keep as is
    }
  }
  const hasDB = await ensureDB();
  if (!hasDB) {
    const arr = MEM_BOOKMARKS.get(username) || [];
    if (arr.some((b: any) => b.compositeKey === bookmark.compositeKey)) {
      return NextResponse.json({ success: false, error: "Already bookmarked" }, { status: 409 });
    }
    MEM_BOOKMARKS.set(username, [...arr, bookmark]);
    return NextResponse.json({ success: true });
  }
  let entry = await Bookmark.findOne({ username });
  if (!entry) {
    entry = new Bookmark({ username, bookmarks: [bookmark] });
  } else {
    // Prevent duplicates by compositeKey
    if (entry.bookmarks.some((b: any) => b.compositeKey === bookmark.compositeKey)) {
      return NextResponse.json({ success: false, error: "Already bookmarked" }, { status: 409 });
    }
    entry.bookmarks.push(bookmark);
  }
  await entry.save();
  return NextResponse.json({ success: true });
}

// DELETE: Remove a bookmark for a user
export async function DELETE(req: NextRequest) {
  const { username, compositeKey } = await req.json();
  if (!username || !compositeKey) {
    return NextResponse.json({ success: false, error: "Username and compositeKey required" }, { status: 400 });
  }
  const hasDB = await ensureDB();
  if (!hasDB) {
    const arr = MEM_BOOKMARKS.get(username) || [];
    const next = arr.filter((b: any) => b.compositeKey !== compositeKey);
    MEM_BOOKMARKS.set(username, next);
    return NextResponse.json({ success: true });
  }
  const entry = await Bookmark.findOne({ username });
  if (!entry) {
    return NextResponse.json({ success: false, error: "No bookmarks found for user" }, { status: 404 });
  }
  entry.bookmarks = entry.bookmarks.filter((b: any) => b.compositeKey !== compositeKey);
  await entry.save();
  return NextResponse.json({ success: true });
}
