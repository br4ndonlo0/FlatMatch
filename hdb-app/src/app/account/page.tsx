"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function AccountPage() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement | null>(null);

  // close dropdown when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        dropdownBtnRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !dropdownBtnRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const navOptions = [
    { label: "UserInfo", href: "/userinfo" },
    { label: "Recommended", href: "/recommended" },
    { label: "HDB Listings", href: "/hdb-listings" },
    { label: "Overview", href: "/overview" },
    { label: "PriceTrend", href: "/pricetrend" },
    { label: "Affordability", href: "/affordability" },
    { label: "Amenities", href: "/amenities" },
    { label: "Account", href: "/account" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fbff", // off-white background from screenshot
        color: "#0b295c",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Top blue header */}
      <header
        style={{
          backgroundColor: "#123b91", // deep royal blue (screenshot)
          height: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
        }}
      >
        <Link
          href="/"
          style={{
            color: "white",
            fontWeight: 700,
            fontSize: 20,
            textDecoration: "none",
          }}
        >
          Resale HDB Finder
        </Link>

        <div style={{ display: "flex", gap: 16 }}>
          {navOptions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                color: "white",
                fontWeight: item.href === "/account" ? 700 : 500,
                opacity: item.href === "/account" ? 1 : 0.85,
                textDecoration: "none",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.opacity = "1")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.opacity =
                  item.href === "/account" ? "1" : "0.85")
              }
            >
              {item.label}
            </Link>
          ))}

          {/* Dropdown */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              ref={dropdownBtnRef}
              onClick={() => setDropdownOpen((o) => !o)}
              style={{
                background: "white",
                color: "#123b91",
                border: "none",
                borderRadius: 6,
                padding: "6px 12px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              👤 Account
            </button>
            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "110%",
                  background: "white",
                  borderRadius: 6,
                  boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
                  overflow: "hidden",
                }}
              >
                <Link
                  href="/account"
                  style={{
                    display: "block",
                    padding: "10px 16px",
                    textDecoration: "none",
                    color: "#123b91",
                    fontWeight: 500,
                  }}
                >
                  Profile
                </Link>
                <Link
                  href="/security"
                  style={{
                    display: "block",
                    padding: "10px 16px",
                    textDecoration: "none",
                    color: "#123b91",
                    fontWeight: 500,
                  }}
                >
                  Security
                </Link>
                <button
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    textAlign: "left",
                    border: "none",
                    background: "#f0f5ff",
                    color: "#c62828",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* light blue separator */}
      <div
        style={{
          height: 10,
          backgroundColor: "#e3eefb", // light divider
        }}
      />

      {/* Content */}
      <main
        style={{
          maxWidth: 1000,
          margin: "40px auto",
          background: "white",
          borderRadius: 12,
          padding: "24px 32px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
        }}
      >
        <h1 style={{ color: "#123b91", fontSize: 26, marginBottom: 16 }}>
          Account Settings
        </h1>
        <p style={{ color: "#4a648c", marginBottom: 28 }}>
          Manage your personal information and housing preferences here.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                color: "#123b91",
                marginBottom: 6,
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              style={{
                width: "100%",
                border: "1px solid #d0ddf5",
                borderRadius: 6,
                padding: "10px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                color: "#123b91",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              style={{
                width: "100%",
                border: "1px solid #d0ddf5",
                borderRadius: 6,
                padding: "10px",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                color: "#123b91",
                marginBottom: 6,
              }}
            >
              Citizenship
            </label>
            <select
              style={{
                width: "100%",
                border: "1px solid #d0ddf5",
                borderRadius: 6,
                padding: "10px",
              }}
            >
              <option>Singaporean</option>
              <option>Singapore PR</option>
              <option>Foreigner</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                color: "#123b91",
                marginBottom: 6,
              }}
            >
              Household Income (S$)
            </label>
            <input
              type="number"
              placeholder="e.g. 80000"
              style={{
                width: "100%",
                border: "1px solid #d0ddf5",
                borderRadius: 6,
                padding: "10px",
              }}
            />
          </div>
        </div>

        <button
          style={{
            marginTop: 24,
            background: "#123b91",
            color: "white",
            border: "none",
            padding: "12px 22px",
            borderRadius: 6,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save Changes
        </button>
      </main>
    </div>
  );
}
