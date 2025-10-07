"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  // Load username from localStorage (and keep it in sync if it changes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => setUsername(localStorage.getItem("username") ?? "Guest");
    load();
    // keep in sync across tabs/windows
    const onStorage = (e: StorageEvent) => {
      if (e.key === "username") load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Close with ESC
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

  // Focus first item when drawer opens
  useEffect(() => {
    if (drawerOpen && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [drawerOpen]);

  // Logout: clear storage and go to login
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("username");
    }
    router.push("/login"); // change if your login route is different
  };

  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#e9f5ff" }}>
      {/* Top Bar */}
      <div
        style={{
          width: "100%",
          background: "#143D8D",
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
            HDBFinder
          </h1>
        </div>

        {/* User menu */}
        <div style={{ position: "relative" }}>
          <button
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "8px 20px",
              fontWeight: 500,
              color: "#143D8D",
              border: "none",
              cursor: "pointer",
              minWidth: 120,
            }}
            onClick={() => setDropdownOpen((open) => !open)}
          >
            {username ?? "Loading..."}
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "110%",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                border: "1px solid #e0e0e0",
                minWidth: "180px",
                zIndex: 40,
                padding: "8px 0",
              }}
            >
              <div
                style={{
                  padding: "12px 24px",
                  fontWeight: 700,
                  color: "#143D8D",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                {username}
              </div>
              <div
                style={{
                  padding: "12px 24px",
                  color: "#143D8D",
                  borderBottom: "1px solid #f0f0f0",
                  cursor: "pointer",
                }}
              >
                Account
              </div>
              <Link
                href="/userinfo"
                style={{
                  display: "block",
                  padding: "12px 24px",
                  color: "#143D8D",
                  textDecoration: "none",
                  fontWeight: 500,
                  borderBottom: "1px solid #f0f0f0",
                }}
                onClick={() => setDropdownOpen(false)}
              >
                User Info
              </Link>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  handleLogout();
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: "12px 24px",
                  color: "#143D8D",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
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
            background: "#143D8D",
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
            style={{
              outline: "none",
              background: "#ffffff",
              color: "#143D8D",
              borderRadius: 12,
              padding: "14px 16px",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #d0e5ff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            View all Flats
          </Link>

          <Link
            href="/recommended"
            onClick={() => setDrawerOpen(false)}
            style={{
              background: "#ffffff",
              color: "#143D8D",
              borderRadius: 12,
              padding: "14px 16px",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #d0e5ff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            View recommended flats
          </Link>

          <Link
            href="/bookmarks"
            onClick={() => setDrawerOpen(false)}
            style={{
              background: "#ffffff",
              color: "#143D8D",
              borderRadius: 12,
              padding: "14px 16px",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #d0e5ff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            View Bookmarked Flats
          </Link>
        </nav>
      </aside>

      {/* Search Bar & quick links (kept) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            maxWidth: 600,
          }}
        >
          <input
            type="text"
            placeholder="Search for flats..."
            style={{
              flex: 1,
              padding: "14px 20px",
              fontSize: "1.1rem",
              borderRadius: "16px 0 0 16px",
              border: "1px solid #ccc",
              outline: "none",
              background: "#fff",
            }}
          />
          <button
            style={{
              background: "#143D8D",
              color: "#fff",
              border: "none",
              borderRadius: "0 16px 16px 0",
              padding: "14px 32px",
              fontWeight: 600,
              fontSize: "1.1rem",
              cursor: "pointer",
            }}
          >
            Filter
          </button>
        </div>

        {/* Optional: quick buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            marginTop: 32,
          }}
        >
          {[
            { text: "View all Flats", href: "/listing" },
            { text: "View recommended flats", href: "/recommended" },
            { text: "View Bookmarked Flats", href: "/bookmarks" },
          ].map((btn, idx) => (
            <Link
              key={idx}
              href={btn.href}
              style={{
                background: "#ffffff",
                color: "#143D8D",
                borderRadius: "32px",
                padding: "14px 32px",
                fontWeight: 600,
                fontSize: "1.1rem",
                marginBottom: 16,
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
                textDecoration: "none",
                display: "inline-block",
                border: "1px solid #d0e5ff",
              }}
            >
              {btn.text}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
