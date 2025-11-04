"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  type FeaturedItem = {
    town: string;
    block: string;
    street_name: string;
    resale_price: number | string;
    flat_type: string;
    month: string;
    compositeKey: string;
    score: number;
  };
  const [featuredGroups, setFeaturedGroups] = useState<Record<string, FeaturedItem[]>>({});
  const [featuredLoading, setFeaturedLoading] = useState(false);

  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement | null>(null);

  // ---- Load username (and keep in sync across tabs) ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => setUsername(localStorage.getItem("username") ?? "Guest");
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "username") load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ---- Global ESC key closes drawer & dropdown ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- Focus first item when drawer opens ----
  useEffect(() => {
    if (drawerOpen && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [drawerOpen]);

  // ---- Prevent body scroll when drawer is open ----
  useEffect(() => {
    if (typeof document === "undefined") return;
    const { body } = document;
    if (drawerOpen) {
      const prev = body.style.overflow;
      body.style.overflow = "hidden";
      return () => {
        body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  // ---- Close dropdown on outside click ----
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        dropdownBtnRef.current &&
        !dropdownBtnRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // ---- Load featured top-scored flats for homepage ----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setFeaturedLoading(true);
        // Try to get user's preferred flat type; fallback to 3 ROOM
        let flatType = "3 ROOM";
        try {
          const res = await fetch("/api/userinfo", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            const ft = (data?.user?.flatType || data?.user?.flat_type || "").toString().trim();
            if (ft) flatType = ft;
          }
        } catch {}

        const towns = ["ANG MO KIO", "BISHAN", "QUEENSTOWN"];
        const payload = {
          weights: { mrt: 7, school: 6, hospital: 3, affordability: 8 },
          towns,
          flatType,
          pricePolicy: "cheapest-recent-24m",
        };
        const res = await fetch("/api/finder", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && Array.isArray(data?.results) && data.results.length > 0) {
          // Group top ~30 results by town, evenly split across selected towns
          const perTown = Math.ceil(30 / towns.length);
          const grouped: Record<string, FeaturedItem[]> = {};
          for (const t of towns) grouped[t] = [];
          // results are already sorted by score desc on server
          for (const r of data.results as FeaturedItem[]) {
            const town = (r.town || "").toString().trim().toUpperCase();
            if (!(town in grouped)) continue; // ignore towns not in our list
            if (grouped[town].length < perTown) {
              grouped[town].push(r);
            }
            // stop when we reached our target roughly
            const total = Object.values(grouped).reduce((a, arr) => a + arr.length, 0);
            if (total >= perTown * towns.length) break;
          }
          setFeaturedGroups(grouped);
        } else {
          setFeaturedGroups({});
        }
      } catch {
        if (!alive) return;
        setFeaturedGroups({});
      } finally {
        if (alive) setFeaturedLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ---- Logout ----
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("username");
    }
    router.push("/login");
  };

  // ---- Colors (from your scheme) ----
  const BLUE = "#143D8D";
  const BLUE_DARK = "#0E2B64";
  const SURFACE = "#E9F5FF";

  // Short, friendly neighbourhood blurbs shown above each town's featured list
  const TOWN_BLURBS: Record<string, string> = {
    QUEENSTOWN:
      "A centrally located, mature estate with excellent MRT access, lively dining, and green corridors like the Rail Corridor. Close to the city, one-north, and Alexandra amenities—great balance of convenience and lifestyle.",
    BISHAN:
      "Popular with families for its schools, parks, and connectivity. Home to Bishan–Ang Mo Kio Park and an MRT interchange, it offers a calm neighbourhood feel with city access in minutes.",
    "ANG MO KIO":
      "A classic heartland favourite known for great food, everyday conveniences, and strong transport links. Mature amenities and parks make it practical and comfortable to live in.",
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: SURFACE }}>
      {/* Top Bar */}
      <div
        style={{
          width: "100%",
          background: BLUE,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          position: "relative",
          zIndex: 30,
        }}
      >
        {/* Hamburger + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            aria-label="Open menu"
            aria-controls="drawer"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            style={{
              border: "none",
              background: "transparent",
              color: "#fff",
              fontSize: 24,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ☰
          </button>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              margin: 0,
              letterSpacing: "1px",
            }}
          >
            FlatMatch
          </h1>
        </div>

        {/* User menu with improved icon inside the button */}
        <button
          ref={dropdownBtnRef}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
          onClick={() => setDropdownOpen((open) => !open)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#ffffff",
            borderRadius: "16px",
            padding: "8px 20px",
            fontWeight: 500,
            color: BLUE,
            border: "none",
            cursor: "pointer",
            minWidth: 120,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            style={{ width: "20px", height: "20px" }}
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          {username ?? "Loading..."}
        </button>

        {dropdownOpen && (
          <div
            ref={dropdownRef}
            role="menu"
            style={{
              position: "absolute",
              right: 0,
              top: "110%",
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              border: "1px solid #e0e0e0",
              minWidth: "200px",
              zIndex: 40,
              padding: "8px 0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 20px",
                fontWeight: 700,
                color: BLUE,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              {username}
            </div>
            <Link
              href="/account"
              role="menuitem"
              style={{ ...menuItemStyle(BLUE), textDecoration: "none", display: "block" }}
              onClick={() => setDropdownOpen(false)}
            >
              Account
            </Link>
            <Link
              href="/userinfo"
              role="menuitem"
              style={{ ...menuItemStyle(BLUE), textDecoration: "none", display: "block" }}
              onClick={() => setDropdownOpen(false)}
            >
              User Info
            </Link>
            <button
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                handleLogout();
              }}
              style={{ ...menuItemStyle(BLUE), fontWeight: 600 }}
            >
              Logout
            </button>
          </div>
        )}
      </div>


      {/* Drawer overlay */}
      {drawerOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            border: "none",
            cursor: "pointer",
            zIndex: 25,
          }}
        />
      )}

      {/* Drawer panel */}
      <aside
        id="drawer"
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: 300,
          background: "#ffffff",
          boxShadow: "4px 0 18px rgba(0,0,0,0.12)",
          borderRight: "1px solid #d0e5ff",
          transform: drawerOpen ? "translateX(0)" : "translateX(-110%)",
          transition: "transform 240ms ease",
          zIndex: 35,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            background: BLUE,
            color: "#fff",
            padding: "16px 18px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Menu
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            style={{
              border: "none",
              background: "transparent",
              color: "#fff",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <nav style={{ padding: "12px 10px", display: "grid", gap: 10 }}>
          <Link
            ref={firstLinkRef}
            href="/listing"
            onClick={() => setDrawerOpen(false)}
            style={navLinkStyle}
          >
            View all Flats
          </Link>

          <Link
            href="/recommended"
            onClick={() => setDrawerOpen(false)}
            style={navLinkStyle}
          >
            View recommended flats
          </Link>

          <Link
            href="/bookmarks"
            onClick={() => setDrawerOpen(false)}
            style={navLinkStyle}
          >
            View Bookmarked Flats
          </Link>
        </nav>
      </aside>

      {/* Search & quick links */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
        {/* Card overlapping the blue strip */}
        <section
          style={{
            marginTop: 15,
            background: "#ffffffcc",
            backdropFilter: "blur(6px)",
            border: "1px solid #ffffff",
            boxShadow: "0 12px 24px rgba(20,61,141,0.10)",
            borderRadius: 24,
            padding: 24,
          }}
        >
          <h2 className="title-underline gradient-text" style={{ margin: 0, fontSize: "1.9rem", fontWeight: 900 }}>
            Find your next HDB home
          </h2>
          <p style={{ marginTop: 6, color: "#334155" }}>
            Search listings by town, flat type, lease, and price. Built for Singapore buyers and tenants.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              maxWidth: 680,
              marginTop: 16,
            }}
          >
            <input
              type="text"
              placeholder="Search for flats..."
              aria-label="Search for flats"
              style={{
                flex: 1,
                padding: "14px 20px",
                fontSize: "1.05rem",
                borderRadius: "14px 0 0 14px",
                border: "1px solid #cbd5e1",
                outline: "none",
                background: "#fff",
                color: "#0f172a",
              }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const q = searchText.trim();
                  router.push(q ? `/listing?q=${encodeURIComponent(q)}` : "/listing");
                }
              }}
            />
            <button
              style={{
                background: BLUE,
                color: "#fff",
                border: "none",
                borderRadius: "0 14px 14px 0",
                padding: "14px 22px",
                fontWeight: 700,
                fontSize: "1.05rem",
                cursor: "pointer",
              }}
              onClick={() => {
                const q = searchText.trim();
                router.push(q ? `/listing?q=${encodeURIComponent(q)}` : "/listing");
              }}
            >
              Search
            </button>
          </div>

          {/* Quick buttons */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 18,
            }}
          >
            {[
              { text: "View all Flats", href: "/listing" },
              { text: "View recommended flats", href: "/recommended" },
              { text: "View Bookmarked Flats", href: "/bookmarks" },
            ].map((btn) => (
              <Link
                key={btn.href}
                href={btn.href}
                style={pillLinkStyle(BLUE)}
              >
                {btn.text}
              </Link>
            ))}
          </div>
        </section>

        {/* Featured top-scored HDBs (grouped by town) */}
        <section style={{ marginTop: 28 }}>
          <h3 style={{ margin: 0, fontSize: "1.4rem", color: "#0f172a" }}>Featured neighbourhoods</h3>
          {featuredLoading && (
            <div style={{ marginTop: 12, color: "#475569" }}>Loading top flats…</div>
          )}
          {/* Render by town sections */}
          {(() => {
            const order = ["QUEENSTOWN", "BISHAN", "ANG MO KIO"]; // preferred display order
            const townsToShow = order.filter((t) => (featuredGroups[t]?.length || 0) > 0);
            if (!featuredLoading && townsToShow.length === 0) {
              return (
                <div style={{ marginTop: 12, color: "#475569" }}>
                  No featured flats available at the moment.
                </div>
              );
            }
            return townsToShow.map((town) => (
              <div key={town} style={{ marginTop: 16 }}>
                <div className="gradient-text" style={{ fontWeight: 900, fontSize: 20, marginBottom: 6 }}>{town}</div>
                <div style={{ color: "#475569", fontSize: 14, marginBottom: 10 }}>
                  {TOWN_BLURBS[town] || "A well-loved neighbourhood with handy amenities, transport links, and green spaces."}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                  {(featuredGroups[town] || []).map((r, i) => (
                    <Link
                      key={(r.compositeKey || "") + "_" + i}
                      href={`/listing/${encodeURIComponent(r.compositeKey)}`}
                      style={{ textDecoration: "none" }}
                    >
                      <div className="glass-card" style={{ padding: 16, paddingBottom: 48, position: "relative" }}>
                        {/* Score badge */}
                        {Number.isFinite(r.score) && (
                          <div className="pill pill-score" style={{ position: "absolute", bottom: 12, right: 12 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>
                            {Number(r.score).toFixed(1)}
                          </div>
                        )}
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>
                          {r.block} {r.street_name} • {r.flat_type}
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>
                          {typeof r.resale_price === "number" ? `$${r.resale_price.toLocaleString()}` : `$${Number(r.resale_price).toLocaleString()}`}
                        </div>
                        <div style={{ marginTop: 10, fontSize: 12, color: "#1e293b", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                          View details
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l1.41 1.41L8.83 10H20v2H8.83l4.58 4.59L12 18l-8-8z"/></svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ));
          })()}
        </section>

        <footer style={{ padding: "28px 0 36px", color: "#475569", fontSize: 14 }}>
            {/* Footer removed as requested */}
        </footer>
      </main>
    </div>
  );
}

/* ---------- tiny style helpers ---------- */
const navLinkStyle: React.CSSProperties = {
  outline: "none",
  background: "#ffffff",
  color: "#143D8D",
  borderRadius: 12,
  padding: "14px 16px",
  fontWeight: 600,
  textDecoration: "none",
  border: "1px solid #d0e5ff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

function menuItemStyle(color: string): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    padding: "12px 20px",
    color,
    fontWeight: 500,
    cursor: "pointer",
  };
}

function pillLinkStyle(color: string): React.CSSProperties {
  return {
    background: "#ffffff",
    color,
    borderRadius: 999,
    padding: "12px 20px",
    fontWeight: 600,
    fontSize: "1rem",
    textDecoration: "none",
    display: "inline-block",
    border: "1px solid #d0e5ff",
    boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
  };
}
