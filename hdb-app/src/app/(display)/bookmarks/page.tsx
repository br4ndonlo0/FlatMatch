"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useState as useClientState } from "react";

interface Bookmark {
  block: string;
  street_name: string;
  flat_type: string;
  month: string;
  resale_price: string;
  compositeKey: string;
}

// TODO: Replace with actual user context/session
const getUsername = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("username") || "";
  }
  return "";
};

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useClientState(false);

  useEffect(() => {
    const fetchBookmarks = async () => {
      setLoading(true);
      setError("");
      const username = getUsername();
      if (!username) {
        setError("Not logged in");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/bookmarks?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (data.success) {
          setBookmarks(data.bookmarks);
        } else {
          setError(data.error || "Failed to fetch bookmarks");
        }
      } catch (e) {
        setError("Failed to fetch bookmarks");
      }
      setLoading(false);
    };
    fetchBookmarks();
  }, []);

  const removeBookmark = async (compositeKey: string) => {
    const username = getUsername();
    if (!username) return;
    setRemoving(compositeKey);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, compositeKey })
      });
      const data = await res.json();
      if (data.success) {
        setBookmarks((prev) => prev.filter((b) => b.compositeKey !== compositeKey));
      } else {
        alert(data.error || "Failed to remove bookmark");
      }
    } catch (e) {
      alert("Failed to remove bookmark");
    }
    setRemoving(null);
  };

  return (
    <div style={{ background: '#e0f2ff', minHeight: '100vh', width: '100%' }}>
      {/* Top Bar with Dropdown Navigation */}
      <div className="w-full bg-blue-900 text-white flex items-center px-6 py-4 relative shadow-md">
        <button
          className="mr-4 focus:outline-none"
          onClick={() => setNavOpen((open: boolean) => !open)}
          aria-label="Open navigation menu"
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-2xl font-bold tracking-wide">HDBFinder</span>
        {/* Home button top right */}
        <Link href="/home" className="absolute right-6 top-1/2 -translate-y-1/2">
          <button className="bg-white text-blue-900 font-bold px-5 py-2 rounded-full shadow hover:bg-blue-100 transition-colors border-2 border-blue-900">Home</button>
        </Link>
        {navOpen && (
          <div className="absolute left-0 top-full mt-2 w-56 bg-white text-blue-900 rounded-lg shadow-lg z-50 border border-blue-200 animate-fade-in">
            <Link href="/listing" className="block px-6 py-3 hover:bg-blue-50">View All Listings</Link>
            <Link href="/recomended" className="block px-6 py-3 hover:bg-blue-50">View Recommended</Link>
            <Link href="/account" className="block px-6 py-3 hover:bg-blue-50">Account</Link>
            <Link href="/userinfo" className="block px-6 py-3 hover:bg-blue-50">User Info</Link>
            <Link href="/logout" className="block px-6 py-3 hover:bg-blue-50">Logout</Link>
          </div>
        )}
      </div>
      {/* Centered Title with Lines */}
      <div className="flex items-center justify-center my-8 w-full">
        <div className="flex-1 border-t border-blue-300 mx-4" />
        <span className="text-3xl font-bold text-blue-900 whitespace-nowrap">Bookmarked Listings</span>
        <div className="flex-1 border-t border-blue-300 mx-4" />
      </div>
      <div className="flex flex-col items-center py-8 gap-8">
        {loading && <div className="text-lg text-gray-500">Loading...</div>}
        {error && <div className="text-lg text-red-500">{error}</div>}
        {!loading && !error && bookmarks.length === 0 && (
          <div className="text-lg text-gray-400">No bookmarks found.</div>
        )}
        {bookmarks.map((rec, i) => (
          <div
            key={rec.compositeKey + "__" + i}
            className="w-3/4 rounded-3xl bg-white shadow-lg p-8 flex flex-col items-start border-2 border-blue-200 relative"
            style={{ minHeight: "16vh", minWidth: "75vw", maxWidth: "75vw" }}
          >
            <Link
              href={`/listing/${encodeURIComponent(rec.compositeKey)}`}
              className="w-full flex flex-col items-start"
              style={{ textDecoration: 'none' }}
            >
              <div className="text-3xl font-bold mb-2" style={{ color: '#000' }}>
                {rec.street_name}, {rec.flat_type}
              </div>
              <div className="text-2xl font-semibold" style={{ color: '#000' }}>
                ${rec.resale_price}
              </div>
              <div className="text-lg" style={{ color: '#000' }}>
                Block: {rec.block} | Month: {rec.month}
              </div>
            </Link>
            <button
              className={
                `absolute bottom-4 right-4 px-4 py-2 rounded-full font-semibold text-sm border-2 transition-colors duration-200 bg-red-500 border-red-500 text-white shadow-md` +
                (removing === rec.compositeKey ? ' opacity-50 cursor-not-allowed' : '')
              }
              style={{ zIndex: 10 }}
              tabIndex={0}
              aria-label="Remove Bookmark"
              disabled={removing === rec.compositeKey}
              onClick={() => removeBookmark(rec.compositeKey)}
            >
              {removing === rec.compositeKey ? 'Removing...' : 'Remove'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
