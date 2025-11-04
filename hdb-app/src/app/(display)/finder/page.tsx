// app/finder/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RawResult = {
  town: string;
  block: string;
  street_name: string;
  resale_price: number | string;
  score: number; // 0..100
  affordabilityScore?: number; // 0..10 (from our affordability library)
  flat_type?: string;
  month?: string;
  distances?: { dMrt?: number; dSchool?: number; dHospital?: number; dHosp?: number };
  compositeKey?: string; // 5-part from API
};

type FinderResult = {
  town: string;
  block: string;
  street_name: string;
  resale_price: number | string;
  score: number; // 0..100
  affordabilityScore?: number; // 0..10
  flat_type: string;
  month: string;
  distances: { dMrt?: number; dSchool?: number; dHospital?: number };
  compositeKey: string; // BLOCK__STREET__FLAT_TYPE__MONTH__0
};

const FLAT_TYPES = [
  "1 ROOM",
  "2 ROOM",
  "3 ROOM",
  "4 ROOM",
  "5 ROOM",
  "EXECUTIVE",
  "MULTI-GENERATION",
];

const BLUE = "#1e3a8a";

function menuItemStyle() {
  return "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors";
}

export default function FinderPage() {
  const router = useRouter();
  
  const [weights, setWeights] = useState({
    mrt: 7,
    school: 6,
    hospital: 3,
    affordability: 8,
  });

  // Menu dropdown state
  const [username, setUsername] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuDropdownRef = useRef<HTMLDivElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  const [allTowns, setAllTowns] = useState<string[]>([]);
  const [townQuery, setTownQuery] = useState("");
  const [selectedTowns, setSelectedTowns] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const suggestRef = useRef<HTMLDivElement | null>(null);

  // NEW: selected flat type (default 3 ROOM)
  const [flatType, setFlatType] = useState<string>("3 ROOM");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FinderResult[] | null>(null);
  const [error, setError] = useState<string>("");

  // Get username from localStorage
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  // Close menu dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuDropdownRef.current || !menuBtnRef.current) return;
      if (!menuDropdownRef.current.contains(e.target as Node) && !menuBtnRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    localStorage.removeItem("username");
    setUsername("");
    setMenuOpen(false);
    router.push("/login");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/finder?op=towns", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (alive && data?.ok && Array.isArray(data.towns)) {
          setAllTowns(data.towns);
        } else if (alive) {
          setAllTowns(["ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "QUEENSTOWN", "TOA PAYOH"]);
        }
      } catch {
        if (alive) {
          setAllTowns(["ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "QUEENSTOWN", "TOA PAYOH"]);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!suggestRef.current) return;
      if (!suggestRef.current.contains(e.target as Node)) setShowSuggest(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filteredSuggestions = useMemo(() => {
    const q = townQuery.trim().toUpperCase();
    if (!q) return allTowns.filter((t) => !selectedTowns.includes(t)).slice(0, 10);
    return allTowns.filter((t) => t.includes(q) && !selectedTowns.includes(t)).slice(0, 10);
  }, [townQuery, allTowns, selectedTowns]);

  function addTown(t?: string) {
    const name = (t ?? townQuery).trim().toUpperCase();
    if (!name) return;
    if (!allTowns.includes(name)) return; // only allow known towns
    if (selectedTowns.includes(name)) return;
    if (selectedTowns.length >= 3) return;
    setSelectedTowns((prev) => [...prev, name]);
    setTownQuery("");
    setShowSuggest(false);
  }
  function removeTown(t: string) {
    setSelectedTowns((prev) => prev.filter((x) => x !== t));
  }

  function Slider({
    label,
    value,
    onChange,
    ariaLabel,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    ariaLabel?: string;
  }) {
    return (
      <label className="block">
        <div className="mb-1 font-medium text-blue-900">
          {label}: <span className="font-bold">{value}</span>
        </div>
        <input
          aria-label={ariaLabel ?? label}
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-blue-800"
        />
      </label>
    );
  }

  function normalizeResults(rows: RawResult[] | undefined | null): FinderResult[] {
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => {
      const dMrt = r.distances?.dMrt;
      const dSchool = r.distances?.dSchool;
      const dHospital = (r.distances?.dHospital ?? r.distances?.dHosp) as number | undefined;

      return {
        town: r.town,
        block: r.block,
        street_name: r.street_name,
        resale_price: r.resale_price,
        score: r.score,
        affordabilityScore: r.affordabilityScore,
        flat_type: r.flat_type || flatType,
        month: r.month || "",
        compositeKey: r.compositeKey!, // server builds 5-part
        distances: { dMrt, dSchool, dHospital },
      };
    });
  }

  async function runFinder() {
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const weightsForApi = {
        mrt: weights.mrt,
        school: weights.school,
        hospital: weights.hospital,
        affordability: weights.affordability,
      };

      const res = await fetch("/api/finder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          weights: weightsForApi,
          towns: selectedTowns,
          flatType, // NEW
          pricePolicy: "cheapest-recent-24m", // doc/debugging tag; server enforces window
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        setError(data?.error || `Sorry, something went wrong while scoring flats (HTTP ${res.status}).`);
        setResults([]);
      } else {
        setResults(normalizeResults(data.results));
      }
    } catch (e) {
      setError("Network error. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function formatMeters(m?: number) {
    if (!Number.isFinite(m)) return "—";
    const v = m as number;
    if (v >= 1000) return `${(v / 1000).toFixed(1)} km`;
    return `${Math.round(v)} m`;
  }

  return (
    <div className="min-h-screen w-full" style={{ background: "#e0f2ff" }}>
      {/* Top Bar */}
      <div className="w-full bg-blue-900 text-white flex items-center px-6 py-4 relative shadow-md">
        {/* Menu Dropdown on the left */}
        <button
          ref={menuBtnRef}
          className="mr-4 focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Open navigation menu"
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <span className="text-2xl font-bold tracking-wide">FlatMatch</span>
        
        {menuOpen && (
          <div
            ref={menuDropdownRef}
            className="absolute left-0 top-full mt-2 w-56 bg-white text-blue-900 rounded-lg shadow-lg z-50 border border-blue-200 animate-fade-in"
          >
            <Link
              href="/listing"
              className="block px-6 py-3 hover:bg-blue-50"
              onClick={() => setMenuOpen(false)}
            >
              Listing
            </Link>
            
            <Link
              href="/bookmarked"
              className="block px-6 py-3 hover:bg-blue-50"
              onClick={() => setMenuOpen(false)}
            >
              View Bookmarked
            </Link>
            
            {username ? (
              <>
                <Link
                  href="/account"
                  className="block px-6 py-3 hover:bg-blue-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Account
                </Link>
                
                <Link
                  href="/userinfo"
                  className="block px-6 py-3 hover:bg-blue-50"
                  onClick={() => setMenuOpen(false)}
                >
                  User Info
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="block px-6 py-3 hover:bg-blue-50 w-full text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-6 py-3 hover:bg-blue-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                
                <Link
                  href="/register"
                  className="block px-6 py-3 hover:bg-blue-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        )}
        
        <div className="ml-auto flex items-center gap-2">
          <Link href="/home" className="bg-white text-blue-900 font-bold px-4 py-2 rounded-full shadow hover:bg-blue-100 transition-colors border-2 border-blue-900">
            Home
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-blue-900">FlatMatch</h1>
        </header>

        {/* Town picker */}
        <section className="bg-white rounded-2xl shadow p-5 border border-blue-200">
          <h2 className="text-xl font-bold text-blue-900 mb-3">Choose up to 3 towns</h2>

          <div className="flex flex-wrap gap-2 mb-3">
            {selectedTowns.map((t) => (
              <span key={t} className="inline-flex items-center gap-2 bg-blue-100 text-blue-900 rounded-full px-3 py-1 border border-blue-300">
                {t}
                <button onClick={() => removeTown(t)} className="text-red-600 hover:text-red-800 font-bold" aria-label={`Remove ${t}`} title="Remove">
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Town input + suggestions */}
            <div className="relative" ref={suggestRef}>
              <label className="block text-sm font-medium text-blue-900 mb-1">Add town (autocomplete shows valid towns)</label>
              <div className="flex gap-2">
                <input
                  value={townQuery}
                  onChange={(e) => { setTownQuery(e.target.value); setShowSuggest(true); }}
                  onFocus={() => setShowSuggest(true)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTown(); } }}
                  placeholder="e.g. ANG MO KIO"
                  className="flex-1 rounded-lg border border-blue-300 bg-white text-blue-900 placeholder:text-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => addTown()}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
                  disabled={selectedTowns.length >= 3}
                >
                  Add
                </button>
              </div>

              {showSuggest && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white text-blue-900 border border-blue-200 rounded-lg shadow max-h-64 overflow-auto">
                  {filteredSuggestions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="block w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-100"
                      onClick={() => addTown(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-700 mt-2">
                Tip: town names must match HDB dataset values (UPPERCASE). Max 3.
              </p>
            </div>

            {/* NEW: Flat type select */}
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-1">Flat Type</label>
              <select
                value={flatType}
                onChange={(e) => setFlatType(e.target.value)}
                className="w-full rounded-lg border border-blue-300 bg-white text-blue-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FLAT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <p className="text-xs text-gray-700 mt-2">Finder will filter to this flat type.</p>
            </div>
          </div>
        </section>

        {/* Weights */}
        <section className="bg-white rounded-2xl shadow p-5 border border-blue-200">
          <h2 className="text-xl font-bold text-blue-900 mb-3">Set your priorities (0–10)</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Slider label="Distance to MRT" value={weights.mrt} onChange={(v) => setWeights({ ...weights, mrt: v })} />
            <Slider label="Distance to Schools" value={weights.school} onChange={(v) => setWeights({ ...weights, school: v })} />
            <Slider label="Distance to Medical" value={weights.hospital} onChange={(v) => setWeights({ ...weights, hospital: v })} />
            <Slider label="Affordability" value={weights.affordability} onChange={(v) => setWeights({ ...weights, affordability: v })} />
          </div>

          <div className="mt-5">
            <button
              onClick={runFinder}
              className="px-5 py-3 bg-blue-900 text-white rounded-xl font-semibold shadow hover:bg-blue-800 transition disabled:opacity-60"
              disabled={loading || selectedTowns.length === 0}
            >
              {loading ? "Scoring…" : selectedTowns.length === 0 ? "Add at least 1 town" : "Find Flats"}
            </button>
            {error && <div className="text-red-600 mt-3 font-medium">{error}</div>}
          </div>
        </section>

        {/* Results */}
        {results && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-blue-900">Results ({results.length})</h2>

            {results.length === 0 && (
              <div className="text-blue-900/80">No results. Try adjusting your towns or flat type.</div>
            )}

            <ul className="grid gap-4 md:grid-cols-2">
              {results.map((r, idx) => {
                const priceNum = Number(r.resale_price);
                const priceText = Number.isFinite(priceNum) ? `$${priceNum.toLocaleString()}` : `${r.resale_price}`;
                const scoreText = Number.isFinite(r.score) ? r.score.toFixed(1) : "-";
                return (
                  <li key={r.compositeKey + "_" + idx} className="bg-white rounded-2xl shadow p-5 border border-blue-200 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-blue-900">
                        <div className="text-lg font-bold">
                          {r.town} • {r.block} {r.street_name} • {r.flat_type}
                        </div>
                        <div className="text-blue-700 font-semibold">{priceText} <span className="text-sm text-blue-900/70">({r.month})</span></div>
                        <div className="text-sm mt-1">Score {scoreText}</div>
                        <div className="text-sm mt-2 space-y-0.5">
                          <div>MRT: {formatMeters(r.distances?.dMrt)}</div>
                          <div>Schools: {formatMeters(r.distances?.dSchool)}</div>
                          <div>Hospitals/Clinics: {formatMeters(r.distances?.dHospital)}</div>
                          {r.affordabilityScore !== undefined && (
                            <div>Affordability: {r.affordabilityScore.toFixed(1)}/10</div>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/listing/${encodeURIComponent(r.compositeKey)}`}
                        className="shrink-0 px-4 py-2 bg-blue-900 text-white rounded-full font-semibold shadow hover:bg-blue-800 transition"
                      >
                        View details
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}