"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  type FeaturedItem = {
    town: string;
    block: string;
    street_name: string;
    resale_price: number | string;
    flat_type: string;
    month: string;
    compositeKey: string;
    score: number;
    affordabilityScore?: number;
  };
  const [featuredGroups, setFeaturedGroups] = useState<Record<string, FeaturedItem[]>>({});
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [budgetActive, setBudgetActive] = useState(false);
  const [userInfoIncomplete, setUserInfoIncomplete] = useState(false);

  // Supported flat types for scoring (keep in sync with Finder)
  const FLAT_TYPES = [
    "1 ROOM",
    "2 ROOM",
    "3 ROOM",
    "4 ROOM",
    "5 ROOM",
    "EXECUTIVE",
    "MULTI-GENERATION",
  ];

  function normalizeFlatType(input: any): string | null {
    if (!input) return null;
    const raw = String(input).trim().toUpperCase();
    if (FLAT_TYPES.includes(raw)) return raw;
    if (/EXEC(UTIVE)?/.test(raw)) return "EXECUTIVE";
    if (/MULTI/.test(raw) || /GEN/.test(raw)) return "MULTI-GENERATION";
    const simple = raw.replace(/[-_]/g, "");
    const m = simple.match(/^([1-5])(RM|ROOM)?$/);
    if (m) return `${m[1]} ROOM`;
    const d = raw.match(/([1-5])/);
    if (d) return `${d[1]} ROOM`;
    return null;
  }

  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement | null>(null);

  // ---- Load username (and keep in sync across tabs) ----
  // store `username` as null when not present so we can easily detect guest
  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => {
      const v = localStorage.getItem("username");
      setUsername(v ? v : null);
    };
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
        // Try to get user's preferred info; fallback sensibly
        let flatType = "3 ROOM";
        let preferredArea: string | null = null;
        let budgetNumber: number | null = null;
        try {
          const res = await fetch("/api/userinfo", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            const user = data?.user;
            
            // Check if user info is incomplete (missing critical fields for affordability)
            const hasAge = user?.age !== undefined && user?.age !== null && user?.age !== "";
            const hasIncome = user?.income !== undefined && user?.income !== null && user?.income !== "";
            const hasDownPaymentBudget = user?.downPaymentBudget !== undefined && user?.downPaymentBudget !== null && user?.downPaymentBudget !== "";
            setUserInfoIncomplete(!hasAge || !hasIncome || !hasDownPaymentBudget);
            
            const ft = normalizeFlatType(user?.flatType || user?.flat_type);
            if (ft) flatType = ft;
            const rawArea = (user?.area ?? "").toString();
            if (rawArea) {
              preferredArea = rawArea.trim();
            }
            const rawBudget = (user?.budget ?? "").toString();
            if (rawBudget) {
              const n = Number(rawBudget.replace(/[^0-9.]/g, ""));
              if (Number.isFinite(n) && n > 0) budgetNumber = n;
              setBudgetActive(Number.isFinite(n) && n > 0);
            }
          } else {
            // If no user data at all, mark as incomplete
            setUserInfoIncomplete(true);
          }
        } catch {
          setUserInfoIncomplete(true);
        }

        // Area -> towns mapping (broad, friendly defaults)
        const AREA_TOWNS: Record<string, string[]> = {
          north: ["WOODLANDS", "YISHUN", "SEMBAWANG", "ANG MO KIO"],
          northeast: ["SENGKANG", "PUNGGOL", "HOUGANG"],
          "north-east": ["SENGKANG", "PUNGGOL", "HOUGANG"],
          east: ["TAMPINES", "PASIR RIS", "BEDOK"],
          west: ["JURONG WEST", "JURONG EAST", "BUKIT BATOK", "CHOA CHU KANG", "BUKIT PANJANG", "CLEMENTI"],
          central: ["QUEENSTOWN", "BISHAN", "TOA PAYOH", "BUKIT MERAH", "KALLANG/WHAMPOA", "GEYLANG", "MARINE PARADE"],
        };
        const areaKey = preferredArea ? preferredArea.toLowerCase().replace(/\s+/g, "").replace(/-/g, "") : "";
        const towns = AREA_TOWNS[areaKey] ?? ["ANG MO KIO", "BISHAN", "QUEENSTOWN"];
        const basePayload = {
          weights: { mrt: 7, school: 6, hospital: 3, affordability: 8 },
          towns,
          pricePolicy: "cheapest-recent-24m",
        };
        const runFinder = async (ft: string) => {
          return fetch("/api/finder", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...basePayload, flatType: ft }),
          });
        };

        // First attempt with user's preferred type
        let res = await runFinder(flatType);
        let data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!(res.ok && Array.isArray(data?.results) && data.results.length > 0)) {
          // Fallback to a popular default if no results
          if (flatType !== "3 ROOM") {
            res = await runFinder("3 ROOM");
            data = await res.json().catch(() => ({}));
          }
        }

        if (res.ok && Array.isArray(data?.results) && data.results.length > 0) {
          // Group top ~30 results by town, evenly split across selected towns
          const perTown = Math.ceil(30 / towns.length);

          const groupWithOptionalBudget = (applyBudget: boolean) => {
            const grouped: Record<string, FeaturedItem[]> = {};
            for (const t of towns) grouped[t] = [];
            for (const r of data.results as FeaturedItem[]) {
              const town = (r.town || "").toString().trim().toUpperCase();
              if (!(town in grouped)) continue;
              if (grouped[town].length >= perTown) continue;
              if (applyBudget && budgetNumber && Number.isFinite(budgetNumber)) {
                const price = typeof r.resale_price === "number" ? r.resale_price : Number(r.resale_price);
                if (Number.isFinite(price) && budgetNumber > 0 && price > budgetNumber) {
                  continue; // skip over-budget items
                }
              }
              grouped[town].push(r);
              const total = Object.values(grouped).reduce((a, arr) => a + arr.length, 0);
              if (total >= perTown * towns.length) break;
            }
            return grouped;
          };

          // Only show items under budget if a budget is set; else show all
          const grouped = groupWithOptionalBudget(Boolean(budgetNumber && Number.isFinite(budgetNumber) && budgetNumber > 0));
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
  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("username");
      }
      // Call API to clear server-side cookie
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      // ignore errors
    } finally {
        // Force a full reload to root so the UI is refreshed and username is re-read
        if (typeof window !== "undefined") {
          window.location.href = "/";
        } else {
          router.push("/");
        }
    }
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
          {username ?? "Guest"}
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
              {username ?? "Guest"}
            </div>
            {/* Render different menu items depending on whether user is logged in */}
            {username ? (
              <>
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
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  role="menuitem"
                  style={{ ...menuItemStyle(BLUE), textDecoration: "none", display: "block" }}
                  onClick={() => setDropdownOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  role="menuitem"
                  style={{ ...menuItemStyle(BLUE), textDecoration: "none", display: "block" }}
                  onClick={() => setDropdownOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
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
            href="/userinfo"
            onClick={() => setDrawerOpen(false)}
            style={navLinkStyle}
          >
            Set User Info
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
            Browse all current resale listings in Singapore. One place, every town.
          </p>

          {/* Three CTAs: View all flats, View Bookmarked, and Go to HDB Finder */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/listing" className="super-button super-button-xl" aria-label="View all HDB flats" style={{ minWidth: "200px", paddingLeft: "24px" }}>
              View all flats
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 8 }}><path d="M12 4l1.41 1.41L8.83 10H20v2H8.83l4.58 4.59L12 18l-8-8z"/></svg>
            </Link>
            <Link href="/bookmarks" className="super-button super-button-xl" aria-label="View bookmarked flats" style={{ minWidth: "200px" }}>
              View Bookmarked Flats
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 8 }}><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
            </Link>
            <Link href="/finder" className="super-button super-button-xl" aria-label="Go to HDB Finder" style={{ minWidth: "200px" }}>
              Go to HDB Finder!
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 8 }}><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </Link>
          </div>

          {/* User info incomplete message */}
          {userInfoIncomplete && (
            <div style={{ 
              marginTop: 20, 
              padding: "16px 20px", 
              background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
              borderRadius: 16,
              border: "2px solid #3b82f6",
              textAlign: "center"
            }}>
              <p style={{ margin: 0, color: "#1e3a8a", fontWeight: 600, fontSize: "1rem" }}>
                Want Flat Finding customised to your needs? Fill up info in UserInfo!
              </p>
              <div style={{ marginTop: 12 }}>
                <Link 
                  href="/userinfo" 
                  style={{
                    display: "inline-block",
                    padding: "10px 24px",
                    background: "#3b82f6",
                    color: "white",
                    borderRadius: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#2563eb";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#3b82f6";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  Go to User Info
                </Link>
              </div>
            </div>
          )}

          {/* Removed other quick buttons as requested */}
        </section>

        {/* Featured top-scored HDBs (grouped by town) */}
        <section style={{ marginTop: 28 }}>
          <h3 style={{ margin: 0, fontSize: "1.4rem", color: "#0f172a" }}>Featured neighbourhoods</h3>
          {featuredLoading && (
            <div style={{ marginTop: 12, color: "#475569" }}>Loading top flats…</div>
          )}
          {/* Render by town sections */}
          {(() => {
            // Display towns in the same order we queried
            const queriedOrder = Object.keys(featuredGroups);
            const townsToShow = queriedOrder.filter((t) => (featuredGroups[t]?.length || 0) > 0);
            if (!featuredLoading && townsToShow.length === 0) {
              return (
                <div style={{ marginTop: 12, color: "#475569" }}>
                  {budgetActive ? "No featured flats under your budget." : "No featured flats available at the moment."}
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
                        {/* Affordability score badge */}
                        {typeof r.affordabilityScore === "number" && Number.isFinite(r.affordabilityScore) && (
                          <div style={{ position: "absolute", bottom: 12, right: 12, backgroundColor: "#3b82f6", color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                            Affordability: {r.affordabilityScore.toFixed(1)}/10
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
