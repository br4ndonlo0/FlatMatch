"use client";
import { useState, useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { useState as useClientState } from "react";

interface HDBRecord {
  _id: string | number;
  month: string;
  town: string;
  flat_type: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: string;
  flat_model: string;
  lease_commence_date: string;
  remaining_lease: string;
  resale_price: string;
}

function parseCompositeKey(key: string) {
  const [block, street_name, flat_type, month, offset] = decodeURIComponent(key).split("__");
  return { block, street_name, flat_type, month, offset };
}

async function getHDBRecordByCompositeKey(key: string) {
  const { block, street_name, flat_type, month, offset } = parseCompositeKey(key);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/hdbdata?limit=1000&offset=${offset}`);
  const data = await res.json();
  return data.records.find(
    (rec: any) =>
      rec.block === block &&
      rec.street_name === street_name &&
      rec.flat_type === flat_type &&
      rec.month === month
  );
}

export default function ListingDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const [record, setRecord] = useState<HDBRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useClientState(false);

  // TODO: Replace with actual user context/session
  const getUsername = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("username") || "";
    }
    return "";
  };

  useEffect(() => {
    (async () => {
      const rec = await getHDBRecordByCompositeKey(id);
      setRecord(rec);
      setLoading(false);
      // Check if already bookmarked
      const username = getUsername();
      if (username && rec) {
        try {
          const res = await fetch(`/api/bookmarks?username=${encodeURIComponent(username)}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.bookmarks)) {
            const decodedId = decodeURIComponent(id);
            const found = data.bookmarks.some((b: any) => b.compositeKey === decodedId);
            setIsBookmarked(found);
          }
        } catch {}
      }
    })();
  }, [id]);

  const handleAddBookmark = async () => {
    if (!record) return;
    const username = getUsername();
    if (!username) {
      setError("Not logged in");
      return;
    }
    setAdding(true);
    setError("");
    const compositeKey = id;
    const bookmark = {
      block: record.block,
      street_name: record.street_name,
      flat_type: record.flat_type,
      month: record.month,
      resale_price: record.resale_price,
      compositeKey,
    };
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, bookmark })
      });
      const data = await res.json();
      if (data.success) {
        setIsBookmarked(true);
      } else {
        setError(data.error || "Failed to add bookmark");
      }
    } catch (e) {
      setError("Failed to add bookmark");
    }
    setAdding(false);
  };

  const handleRemoveBookmark = async () => {
    const username = getUsername();
    if (!username) return;
    setAdding(true);
    setError("");
    const compositeKey = id;
    try {
      const res = await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, compositeKey })
      });
      const data = await res.json();
      if (data.success) {
        setIsBookmarked(false);
      } else {
        setError(data.error || "Failed to remove bookmark");
      }
    } catch (e) {
      setError("Failed to remove bookmark");
    }
    setAdding(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#e0f2ff]">Loading...</div>;
  if (!record) return notFound();

  return (
    <div style={{ background: '#e0f2ff', minHeight: '100vh', width: '100%' }}>
      {/* Top Bar with Dropdown Navigation - sticky at top of viewport */}
      <div className="w-full bg-blue-900 text-white flex items-center px-6 py-4 relative shadow-md sticky top-0 z-50">
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
            <Link href="/recomended" className="block px-6 py-3 hover:bg-blue-50">View Recommended</Link>
            <Link href="/account" className="block px-6 py-3 hover:bg-blue-50">Account</Link>
            <Link href="/userinfo" className="block px-6 py-3 hover:bg-blue-50">User Info</Link>
            <Link href="/logout" className="block px-6 py-3 hover:bg-blue-50">Logout</Link>
          </div>
        )}
      </div>
      {/* Centered Card Below Sticky Nav */}
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-2xl border-2 border-blue-200 relative mt-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-blue-900">
              {record.town}, {record.flat_type}
            </h1>
            <button
              className={
                `ml-4 px-5 py-2 rounded-full font-semibold text-sm border-2 transition-colors duration-200 ` +
                (isBookmarked
                  ? 'bg-yellow-400 border-yellow-400 text-white shadow-md'
                  : 'bg-white border-yellow-400 text-yellow-500 hover:bg-yellow-100')
              }
              style={{ zIndex: 10 }}
              tabIndex={0}
              aria-label={isBookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}
              onClick={
                adding
                  ? undefined
                  : isBookmarked
                    ? handleRemoveBookmark
                    : handleAddBookmark
              }
              disabled={adding}
            >
              {adding
                ? (isBookmarked ? 'Removing...' : 'Adding...')
                : isBookmarked
                  ? 'Bookmarked'
                  : 'Add to Bookmarks'}
            </button>
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <div className="text-3xl font-semibold mb-6 text-blue-700">
            ${record.resale_price}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-lg" style={{ color: '#000' }}>
            <div><span className="font-semibold">Block:</span> {record.block}</div>
            <div><span className="font-semibold">Street:</span> {record.street_name}</div>
            <div><span className="font-semibold">Storey:</span> {record.storey_range}</div>
            <div><span className="font-semibold">Floor Area:</span> {record.floor_area_sqm} sqm</div>
            <div><span className="font-semibold">Model:</span> {record.flat_model}</div>
            <div><span className="font-semibold">Lease Commence:</span> {record.lease_commence_date}</div>
            <div><span className="font-semibold">Remaining Lease:</span> {record.remaining_lease}</div>
            <div><span className="font-semibold">Month:</span> {record.month}</div>
          </div>
        </div>
        {/* Add navigation buttons at the bottom */}
        <div className="flex justify-center gap-8 mt-8">
          <Link href="/listing">
            <button className="px-6 py-3 bg-blue-900 text-white rounded-full font-semibold shadow hover:bg-blue-800 transition-colors">View Listings</button>
          </Link>
          <Link href="/bookmarks">
            <button className="px-6 py-3 bg-yellow-400 text-blue-900 rounded-full font-semibold shadow hover:bg-yellow-300 transition-colors">View Bookmarks</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
