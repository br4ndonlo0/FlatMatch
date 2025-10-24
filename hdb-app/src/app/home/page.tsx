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
          <h2
            style={{
              margin: 0,
              fontSize: "1.8rem",
              fontWeight: 800,
              color: BLUE_DARK,
            }}
          >
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

        {/* Featured placeholders (you can wire real data later) */}
        <section style={{ marginTop: 28 }}>
          <h3 style={{ margin: 0, fontSize: "1.4rem", color: "#0f172a" }}>
            Featured neighbourhoods
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
              marginTop: 12,
            }}
          >
            {["Bishan • 3-Room near MRT", "Sengkang • 4-Room Corner", "Pasir Ris • Executive Maisonette"].map(
              (t, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 16,
                    background: "#ffffffcc",
                    backdropFilter: "blur(4px)",
                    border: "1px solid #ffffff",
                    boxShadow: "0 6px 16px rgba(20,61,141,0.08)",
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "16/10",
                      borderRadius: 12,
                      background:
                        "linear-gradient(135deg, #ffffff, rgba(20,61,141,0.08))",
                      marginBottom: 10,
                    }}
                  />
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{t}</div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
                    Sample listing card
                  </div>
                </div>
              )
            )}
          </div>
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
