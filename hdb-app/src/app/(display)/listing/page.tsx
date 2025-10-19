"use client";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useState as useClientState } from "react";

interface HDBRecord {
  _id: string | number;
  town: string;
  flat_type: string;
  resale_price: string;
  block: string;
  street_name: string;
  month: string;
}

const PAGE_SIZE = 20;

async function fetchHDBData(offset: number, limit: number): Promise<HDBRecord[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const url = baseUrl + `/api/hdbdata?offset=${offset}&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.success) {
    return data.records;
  }
  return [];
}

// Helper to get username
const getUsername = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("username") || "";
  }
  return "";
};

export default function ListingPage() {
  const [records, setRecords] = useState<HDBRecord[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loader = useRef<HTMLDivElement | null>(null);
  const [navOpen, setNavOpen] = useClientState(false);
  const [bookmarkedKeys, setBookmarkedKeys] = useState<string[]>([]);
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const newRecords = await fetchHDBData(offset, PAGE_SIZE);
    setRecords((prev) => [...prev, ...newRecords]);
    setOffset((prev) => prev + PAGE_SIZE);
    setHasMore(newRecords.length === PAGE_SIZE);
    setLoading(false);
  }, [offset, loading, hasMore]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line
  }, []);

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

  // Fetch bookmarks on mount
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
    <div style={{ background: '#e0f2ff', minHeight: '100vh', width: '100%' }}> {/* #e0f2ff is a light blue, change as desired */}
      {/* Top Bar */}
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
        <span className="text-2xl font-bold tracking-wide">HDBFinder</span>
        {/* Home button top right */}
        <Link href="/home" className="absolute right-6 top-1/2 -translate-y-1/2">
          <button className="bg-white text-blue-900 font-bold px-5 py-2 rounded-full shadow hover:bg-blue-100 transition-colors border-2 border-blue-900">Home</button>
        </Link>
        {/* Dropdown Navigation */}
        {navOpen && (
          <div className="absolute left-0 top-full mt-2 w-56 bg-white text-blue-900 rounded-lg shadow-lg z-50 border border-blue-200 animate-fade-in">
            <Link href="/recomended" className="block px-6 py-3 hover:bg-blue-50">View Reccomended</Link>
            <Link href="/bookmarks" className="block px-6 py-3 hover:bg-blue-50">View Bookmarked</Link>
            <Link href="/account" className="block px-6 py-3 hover:bg-blue-50">Account</Link>
            <Link href="/userinfo" className="block px-6 py-3 hover:bg-blue-50">User Info</Link>
            <Link href="/logout" className="block px-6 py-3 hover:bg-blue-50">Logout</Link>
          </div>
        )}
      </div>

  {/* Listing Content */}
  <div className="flex flex-col items-center py-8 gap-8">
    {records.map((rec, i) => {
      // Calculate the global index of this record
            const globalIndex = offset - records.length + i + 1;
            // Offset should be the largest multiple of 1000 <= globalIndex
            const offsetForKey = Math.floor(globalIndex / 1000) * 1000;
            const compositeKey = `${rec.block}__${rec.street_name}__${rec.flat_type}__${rec.month}__${offsetForKey}`;
            const isBookmarked = bookmarkedKeys.includes(compositeKey);
            const handleAddBookmark = async () => {
              const username = getUsername();
              if (!username) return;
              setAddingKey(compositeKey);
              const bookmark = {
                block: rec.block,
                street_name: rec.street_name,
                flat_type: rec.flat_type,
                month: rec.month,
                resale_price: rec.resale_price,
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
                  setBookmarkedKeys((prev) => [...prev, compositeKey]);
                }
              } catch {}
              setAddingKey(null);
            };
      const handleRemoveBookmark = async () => {
        const username = getUsername();
        if (!username) return;
        setAddingKey(compositeKey);
        try {
          const res = await fetch("/api/bookmarks", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, compositeKey })
          });
          const data = await res.json();
          if (data.success) {
            setBookmarkedKeys((prev) => prev.filter((k) => k !== compositeKey));
          }
        } catch {}
        setAddingKey(null);
      };
      return (
        <div
          key={compositeKey + '__' + i}
          className="w-3/4 rounded-3xl bg-white shadow-lg p-8 flex flex-col items-start hover:scale-105 transition-transform duration-200 border-2 border-blue-200 relative"
          style={{ minHeight: "16vh", minWidth: "75vw", maxWidth: "75vw" }}
        >
          {/* Add/Remove Bookmarks button */}
          <button
            className={
              `absolute top-4 right-4 px-4 py-2 rounded-full font-semibold text-sm border-2 transition-colors duration-200 ` +
              (isBookmarked
                ? 'bg-yellow-400 border-yellow-400 text-white shadow-md'
                : 'bg-white border-yellow-400 text-yellow-500 hover:bg-yellow-100')
            }
            style={{ zIndex: 10 }}
            tabIndex={0}
            aria-label={isBookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}
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
              ? (isBookmarked ? 'Removing...' : 'Adding...')
              : isBookmarked
                ? 'Bookmarked'
                : 'Add to Bookmarks'}
          </button>
          <Link
            href={`listing/${encodeURIComponent(compositeKey)}`}
            className="w-full flex flex-col items-start"
            style={{ textDecoration: 'none' }}
          >
            <div className="text-3xl font-bold mb-2" style={{ color: '#000' }}>
              {rec.town}, {rec.flat_type}
            </div>
            <div className="text-2xl font-semibold" style={{ color: '#000' }}>
              ${rec.resale_price}
            </div>
          </Link>
        </div>
      );
    })}
        <div ref={loader} style={{ height: 40 }} />
        {loading && <div className="text-lg text-gray-500">Loading...</div>}
        {!hasMore && <div className="text-lg text-gray-400">No more listings.</div>}
      </div>
    </div>
  );
}
