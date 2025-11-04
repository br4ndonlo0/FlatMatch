"use client";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState as useClientState } from "react";

interface HDBRecord {
  _id: string | number;
  town: string;
  flat_type: string;
  resale_price: string;
  block: string;
  street_name: string;
  month: string;
  score?: number;
}

const PAGE_SIZE = 20;

async function fetchHDBData(offset: number, limit: number, q?: string, town?: string): Promise<HDBRecord[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
  const townParam = town ? `&town=${encodeURIComponent(town)}` : "";
  const url = baseUrl + `/api/hdbdata?offset=${offset}&limit=${limit}${qParam}${townParam}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.success) {
    return data.records;
  }
  return [];
}

const getUsername = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("username") || "";
  }
  return "";
};

export default function ListingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const townParam = (searchParams.get("town") || "").toString();
  const [records, setRecords] = useState<HDBRecord[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loader = useRef<HTMLDivElement | null>(null);
  const [navOpen, setNavOpen] = useClientState(false);
  const [bookmarkedKeys, setBookmarkedKeys] = useState<string[]>([]);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [townInput, setTownInput] = useState<string>(townParam);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const newRecords = await fetchHDBData(offset, PAGE_SIZE, q.trim() || undefined, (townParam || "").trim() || undefined);

    // Fetch scores for this batch
    try {
      const scoreRes = await fetch("/api/score-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: newRecords }),
      });
      const scoreData = await scoreRes.json();
      if (scoreRes.ok && Array.isArray(scoreData?.results)) {
        const scoreMap = new Map<string, number>();
        for (const r of scoreData.results) {
          if (r?.compositeKey) scoreMap.set(r.compositeKey, r.score);
        }
        for (const rec of newRecords) {
          const compositeKey = [
            encodeURIComponent(rec.block),
            encodeURIComponent(rec.street_name),
            encodeURIComponent(rec.flat_type),
            encodeURIComponent(rec.month),
            "0",
          ].join("__");
          const s = scoreMap.get(compositeKey);
          if (typeof s === "number") (rec as any).score = s;
        }
      }
    } catch {}

    setRecords((prev) => [...prev, ...newRecords]);
    setOffset((prev) => prev + PAGE_SIZE);
    setHasMore(newRecords.length === PAGE_SIZE);
    setLoading(false);
  }, [offset, loading, hasMore, q, townParam]);

  useEffect(() => {
    setRecords([]);
    setOffset(0);
    setHasMore(true);
  }, [q, townParam]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line
  }, [q]);

  useEffect(() => {
    if (!loader.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 1 }
    );
    observer.observe(loader.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  useEffect(() => {
    const fetchBookmarks = async () => {
      const username = getUsername();
      if (!username) return;
      try {
        const res = await fetch(`/api/bookmarks?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.bookmarks)) {
          setBookmarkedKeys(data.bookmarks.map((b: any) => b.compositeKey));
        }
      } catch {}
    };
    fetchBookmarks();
  }, []);

  return (
    <div style={{ background: "#e0f2ff", minHeight: "100vh", width: "100%" }}>
      <div className="w-full bg-blue-900 text-white flex items-center px-6 py-4 relative shadow-md">
        <button
          className="mr-4 focus:outline-none"
          onClick={() => setNavOpen((open) => !open)}
          aria-label="Open navigation menu"
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
  <span className="text-2xl font-bold tracking-wide">FlatMatch</span>
        <Link href="/home" className="absolute right-6 top-1/2 -translate-y-1/2">
          <button className="bg-white text-blue-900 font-bold px-5 py-2 rounded-full shadow hover:bg-blue-100 transition-colors border-2 border-blue-900">
            Home
          </button>
        </Link>
        {navOpen && (
          <div className="absolute left-0 top-full mt-2 w-56 bg-white text-blue-900 rounded-lg shadow-lg z-50 border border-blue-200 animate-fade-in">
            <Link href="/recomended" className="block px-6 py-3 hover:bg-blue-50">
              View Reccomended
            </Link>
            <Link href="/bookmarks" className="block px-6 py-3 hover:bg-blue-50">
              View Bookmarked
            </Link>
            <Link href="/account" className="block px-6 py-3 hover:bg-blue-50">
              Account
            </Link>
            <Link href="/userinfo" className="block px-6 py-3 hover:bg-blue-50">
              User Info
            </Link>
            <Link href="/logout" className="block px-6 py-3 hover:bg-blue-50">
              Logout
            </Link>
          </div>
        )}
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Hero-style search card (like Home) */}
        <section className="glass-card rounded-2xl border mb-5 p-5 md:p-6">
          <h2 className="gradient-text font-extrabold text-2xl md:text-3xl m-0">Find HDBs by neighbourhood</h2>
          <p className="text-slate-600 mt-1 text-sm">Type a town name and we’ll load all listings with infinite scroll.</p>

          <div className="flex items-stretch w-full max-w-xl mt-3">
            <input
              type="text"
              value={townInput}
              onChange={(e) => setTownInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const params = new URLSearchParams();
                  if (q.trim()) params.set("q", q.trim());
                  const t = townInput.trim().toUpperCase();
                  if (t) params.set("town", t);
                  router.push(`/listing${params.toString() ? `?${params.toString()}` : ""}`);
                }
              }}
              placeholder="Search by neighbourhood (e.g., Bishan)"
              className="flex-1 rounded-l-xl border border-blue-200 px-4 py-3 text-sm shadow-sm bg-white text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Link
              href={(() => {
                const params = new URLSearchParams();
                if (q.trim()) params.set("q", q.trim());
                const t = townInput.trim().toUpperCase();
                if (t) params.set("town", t);
                return `/listing${params.toString() ? `?${params.toString()}` : ""}`;
              })()}
              className="rounded-r-xl bg-blue-900 text-white font-bold px-5 py-3 shadow hover:bg-blue-800 border border-blue-900"
            >
              Search
            </Link>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Link href="/finder" className="super-button">
              <span>Go to HDBFinder</span>
              <span className="ml-auto inline-flex">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 7l5 5-5 5" />
                  <path d="M18 12H6" />
                </svg>
              </span>
            </Link>
            {(townParam || "").trim() ? (
              <Link href={`/listing${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`} className="text-sm text-blue-900 underline">
                Clear town
              </Link>
            ) : null}
          </div>
        </section>
        {/* Responsive, dense grid of cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {records.map((rec, i) => {
          // Build a fully encoded 5-part key with dummy offset "0"
          const compositeKey = [
            encodeURIComponent(rec.block),
            encodeURIComponent(rec.street_name),
            encodeURIComponent(rec.flat_type),
            encodeURIComponent(rec.month),
            "0",
          ].join("__");

          const isBookmarked = bookmarkedKeys.includes(decodeURIComponent(compositeKey));
          const username = getUsername();

          const handleAddBookmark = async () => {
            if (!username) return;
            setAddingKey(compositeKey);
            const bookmark = {
              block: rec.block,
              street_name: rec.street_name,
              flat_type: rec.flat_type,
              month: rec.month,
              resale_price: rec.resale_price,
              compositeKey: decodeURIComponent(compositeKey),
            };
            try {
              const res = await fetch("/api/bookmarks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, bookmark }),
              });
              const data = await res.json();
              if (data.success) {
                setBookmarkedKeys((prev) => [...prev, decodeURIComponent(compositeKey)]);
              }
            } catch {}
            setAddingKey(null);
          };

          const handleRemoveBookmark = async () => {
            if (!username) return;
            setAddingKey(compositeKey);
            try {
              const res = await fetch("/api/bookmarks", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, compositeKey: decodeURIComponent(compositeKey) }),
              });
              const data = await res.json();
              if (data.success) {
                setBookmarkedKeys((prev) => prev.filter((k) => k !== decodeURIComponent(compositeKey)));
              }
            } catch {}
            setAddingKey(null);
          };

          return (
            <div
              key={compositeKey + "__" + i}
              className="rounded-xl bg-white shadow-md p-4 pb-12 hover:shadow-lg transition-shadow duration-200 border border-blue-200 relative"
            >
              {/* Score badge bottom-right above bookmark */}
              {typeof rec.score === "number" ? (
                <div className="pill pill-score" style={{ position: "absolute", bottom: 44, right: 12 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>
                  {rec.score.toFixed(1)}
                </div>
              ) : null}
              <button
                className={
                  `absolute bottom-3 right-3 px-3 py-1.5 rounded-full font-semibold text-xs border transition-colors duration-200 ` +
                  (isBookmarked
                    ? "bg-yellow-400 border-yellow-400 text-white shadow"
                    : "bg-white border-yellow-400 text-yellow-600 hover:bg-yellow-100")
                }
                style={{ zIndex: 10 }}
                tabIndex={0}
                aria-label={isBookmarked ? "Remove Bookmark" : "Add to Bookmarks"}
                onClick={
                  addingKey === compositeKey
                    ? undefined
                    : isBookmarked
                    ? handleRemoveBookmark
                    : handleAddBookmark
                }
                disabled={addingKey === compositeKey}
              >
                {addingKey === compositeKey
                  ? isBookmarked
                    ? "Removing..."
                    : "Adding..."
                  : isBookmarked
                  ? "Bookmarked"
                  : "Add to Bookmarks"}
              </button>

              <Link
                href={`/listing/${compositeKey}`}
                className="block"
                style={{ textDecoration: "none" }}
              >
                <div className="text-base font-extrabold text-slate-900 mb-1 truncate">
                  {rec.block} {rec.street_name}
                </div>
                <div className="text-sm font-semibold text-slate-600 mb-1 truncate">
                  {rec.town} • {rec.flat_type}
                </div>
                <div className="text-lg font-bold text-slate-900">
                  ${rec.resale_price}
                </div>
              </Link>
            </div>
          );
        })}
        </div>
        <div ref={loader} style={{ height: 40 }} />
        {loading && <div className="text-base text-gray-500 mt-2">Loading...</div>}
        {!hasMore && <div className="text-base text-gray-400 mt-2">No more listings.</div>}
      </div>
    </div>
  );
}