"use client";
import { useState, useEffect } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState as useClientState } from "react";
import AffordabilityWidget from "@/components/AffordabilityWidget";
import { parseRemainingLeaseYears, parseCurrencyToNumber } from "@/lib/affordability";

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
  // decode entire key once
  const once = decodeURIComponent(key);
  // support 4-part and 5-part (legacy) keys
  const parts = once.split("__").map((seg) => {
    try {
      return decodeURIComponent(seg);
    } catch {
      return seg;
    }
  });

  if (parts.length < 4) {
    return { block: "", street_name: "", flat_type: "", month: "", offset: "0" };
  }

  const [b, s, f, m, o] = [parts[0], parts[1], parts[2], parts[3], parts[4] ?? "0"];
  return { block: b, street_name: s, flat_type: f, month: m, offset: o };
}

async function getHDBRecordByCompositeKey(key: string) {
  const { block, street_name, flat_type, month } = parseCompositeKey(key);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(
    `${baseUrl}/api/hdbdata?lookup=1&block=${encodeURIComponent(block)}&street_name=${encodeURIComponent(
      street_name
    )}&flat_type=${encodeURIComponent(flat_type)}&month=${encodeURIComponent(month)}`,
    { cache: "no-store" }
  );
  const data = await res.json();
  return Array.isArray(data?.records) ? data.records[0] ?? null : null;
}

export default function ListingDetailPage() {
  const params = useParams();
  const id =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const [record, setRecord] = useState<HDBRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useClientState(false);
  const [showAffordabilityError, setShowAffordabilityError] = useState(false);

  const getUsername = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("username") || "";
    }
    return "";
  };
  const router = useRouter();

  const getUsernameNow = () => getUsername();
  // Capture username at render time to determine guest vs logged-in state for the popup
  const usernameNow = getUsernameNow();

  useEffect(() => {
    (async () => {
      const rec = await getHDBRecordByCompositeKey(id);
      setRecord(rec);
      setLoading(false);
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
    const compositeKey = id; // keep the original encoded key
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
        body: JSON.stringify({ username, bookmark }),
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
        body: JSON.stringify({ username, compositeKey }),
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

  if (loading)
    return <div className="min-h-screen flex items-center justify-center bg-[#e0f2ff]">Loading...</div>;
  if (!record) return notFound();

  return (
    <div style={{ background: "#e0f2ff", minHeight: "100vh", width: "100%" }}>
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
        <Link href="/home" className="absolute right-6 top-1/2 -translate-y-1/2">
          <button className="bg-white text-blue-900 font-bold px-5 py-2 rounded-full shadow hover:bg-blue-100 transition-colors border-2 border-blue-900">
            Home
          </button>
        </Link>
        {navOpen && (
          <div className="absolute left-0 top-full mt-2 w-56 bg-white text-blue-900 rounded-lg shadow-lg z-50 border border-blue-200 animate-fade-in">
            {getUsername() ? (
              <>
                <Link href="/account" className="block px-6 py-3 hover:bg-blue-50">Account</Link>
                <Link href="/userinfo" className="block px-6 py-3 hover:bg-blue-50">User Info</Link>
                <Link href="/logout" className="block px-6 py-3 hover:bg-blue-50">Logout</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-6 py-3 hover:bg-blue-50">Login</Link>
                <Link href="/register" className="block px-6 py-3 hover:bg-blue-50">Register</Link>
              </>
            )}
          </div>
        )}
      </div>

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
                  ? "bg-yellow-400 border-yellow-400 text-white shadow-md"
                  : "bg-white border-yellow-400 text-yellow-500 hover:bg-yellow-100")
              }
              style={{ zIndex: 10 }}
              tabIndex={0}
              aria-label={isBookmarked ? "Remove Bookmark" : "Add to Bookmarks"}
              onClick={adding ? undefined : isBookmarked ? handleRemoveBookmark : handleAddBookmark}
              disabled={adding}
            >
              {adding ? (isBookmarked ? "Removing..." : "Adding...") : isBookmarked ? "Bookmarked" : "Add to Bookmarks"}
            </button>
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <div className="text-3xl font-semibold mb-6 text-blue-700">${record.resale_price}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-lg" style={{ color: "#000" }}>
            <div>
              <span className="font-semibold">Block:</span> {record.block}
            </div>
            <div>
              <span className="font-semibold">Street:</span> {record.street_name}
            </div>
            <div>
              <span className="font-semibold">Storey:</span> {record.storey_range}
            </div>
            <div>
              <span className="font-semibold">Floor Area:</span> {record.floor_area_sqm} sqm
            </div>
            <div>
              <span className="font-semibold">Model:</span> {record.flat_model}
            </div>
            <div>
              <span className="font-semibold">Lease Commence:</span> {record.lease_commence_date}
            </div>
            <div>
              <span className="font-semibold">Remaining Lease:</span> {record.remaining_lease}
            </div>
            <div>
              <span className="font-semibold">Month:</span> {record.month}
            </div>
          </div>

          {/* Affordability Widget */}
          <div className="mt-6">
            <AffordabilityWidget
              price={parseCurrencyToNumber(record.resale_price) ?? 0}
              remainingLeaseYears={parseRemainingLeaseYears(record.remaining_lease)}
              onMissingUserInfo={() => setShowAffordabilityError(true)}
            />
          </div>
        </div>

        <div className="flex justify-center gap-8 mt-8">
          <Link href="/listing">
            <button className="px-6 py-3 bg-blue-900 text-white rounded-full font-semibold shadow hover:bg-blue-800 transition-colors">
              View Listings
            </button>
          </Link>
          <Link href="/bookmarks">
            <button className="px-6 py-3 bg-yellow-400 text-blue-900 rounded-full font-semibold shadow hover:bg-yellow-300 transition-colors">
              View Bookmarks
            </button>
          </Link>
        </div>
      </div>

      {/* Affordability Error Popup */}
      {showAffordabilityError && (
        <div
          className="fixed inset-0 bg-blue-900 bg-opacity-20 flex items-center justify-center z-50"
          onClick={() => {
            // For guests, navigate back to previous page. For logged-in users, just close the popup.
            if (!usernameNow) router.back();
            else setShowAffordabilityError(false);
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md shadow-2xl border-2 border-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-blue-700 text-4xl">⚠️</span>
              <h2 className="text-2xl font-bold text-blue-900">
                {usernameNow ? "Missing Information" : "Access denied"}
              </h2>
            </div>
            <p className="text-blue-900 mb-6 text-lg">
              {usernameNow
                ? "Fill up userinfo for affordability score!"
                : "You cannot view unit affordability as a guest. Please log in first."}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (!usernameNow) router.back();
                  else setShowAffordabilityError(false);
                }}
                className="w-full px-6 py-3 bg-blue-900 text-white rounded-full font-semibold shadow hover:bg-blue-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}