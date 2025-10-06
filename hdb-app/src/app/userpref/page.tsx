"use client";
import React, { useState } from "react";
import Link from "next/link";
export default function UserPref() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navOptions = [
    { label: "UserInfo", href: "/userinfo" },
    { label: "UserPreference", href: "/userpreference" },
    { label: "Recommended", href: "/recommended" },
    { label: "HDB Listings", href: "/hdb-listings" },
    { label: "Overview", href: "/overview" },
    { label: "PriceTrend", href: "/pricetrend" },
    { label: "Affordability", href: "/affordability" },
    { label: "Amenities", href: "/amenities" },
  ];

  // Dropdown states
  const [flatType, setFlatType] = useState("");
  const [budget, setbudget] = useState("");
  const [area, setarea] = useState("");
  const [lease, setlease] = useState("");


  return (
    <div style={{ minHeight: "100vh", width: "100vw", background: "#fad3b1ff" }}>
      {/* Top white container for navbar and title */}
      <div style={{
        width: "100%",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        borderBottom: "1px solid #e0e0e0"
      }}>
        <nav style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          position: "relative",
          background: "#fff"
        }}>
          {/* Home Button */}
          <Link href="/" style={{
            background: "#fad3b1ff",
            borderRadius: "16px",
            padding: "8px 24px",
            fontWeight: 500,
            color: "#3a4a2b",
            textDecoration: "none",
            boxShadow: "none",
            border: "1px solid #e0e0e0"
          }}>Home</Link>

          {/* Title */}
          <h1 style={{
            flex: 1,
            textAlign: "center",
            fontSize: "2rem",
            color: "#3a4a2b",
            fontWeight: 600,
            margin: 0,
            letterSpacing: "1px"
          }}>User Preferences</h1>

          {/* Dropdown Menu */}
          <div style={{ position: "relative" }}>
            <button
              style={{
                background: "#fad3b1ff",
                borderRadius: "16px",
                padding: "8px 24px",
                fontWeight: 500,
                color: "#3a4a2b",
                border: "1px solid #e0e0e0",
                cursor: "pointer",
                boxShadow: "none"
              }}
              onClick={() => setDropdownOpen((open) => !open)}
            >
              Navigation ▼
            </button>
            {dropdownOpen && (
              <div style={{
                position: "absolute",
                right: 0,
                top: "110%",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                border: "1px solid #e0e0e0",
                minWidth: "180px",
                zIndex: 10
              }}>
                {navOptions.map((opt) => (
                  <a
                    key={opt.label}
                    href={opt.href}
                    style={{
                      display: "block",
                      padding: "12px 24px",
                      color: "#3a4a2b",
                      textDecoration: "none",
                      fontWeight: 500,
                      borderBottom: "1px solid #f0f0f0"
                    }}
                    onClick={() => setDropdownOpen(false)}
                  >
                    {opt.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Four dropdowns in quadrants */}
      <form
        onSubmit={e => {
          e.preventDefault();
          // TODO: send data to backend
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr auto",
          gap: "64px 64px",
          maxWidth: "900px",
          margin: "64px auto 0 auto",
          minHeight: "400px"
        }}
      >
        {/* Top Left: Yearly household flatType */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Flat Type</label>
          <select value={flatType} onChange={e => setFlatType(e.target.value)} style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}>
            <option value="">Select...</option>
            <option value="1 Room">1 Room</option>
            <option value="2 Room">2 Room</option>
            <option value="3 Room">3 Room</option>
            <option value="4 Room">4 Room</option>
            <option value="5 Room">5 Room</option>
          </select>
        </div>

        {/* Top Right: budget */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Budget</label>
          <select value={budget} onChange={e => setbudget(e.target.value)} style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}>
            <option value="">Select...</option>
            <option value="Below $500k">Below $500k</option>
            <option value="$500k-$750k">$500k-$750k</option>
            <option value="$750k-$1M">$750k-$1M</option>
            <option value="$1M-$1.25M">$1M-$1.25M</option>
            <option value="$1.5M-$2M">$1.5M-$2M</option>
            <option value=">$2M">More than $2M</option>
          </select>
        </div>

        {/* Bottom Left: Household Size */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Area</label>
          <select value={area} onChange={e => setarea(e.target.value)} style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}>
            <option value="">Select...</option>
            <option value="North">North</option>
            <option value="North-East">North-East</option>
            <option value="North-West">North-West</option>
            <option value="East">East</option>
            <option value="West">West</option>
            <option value="South">South</option>
            <option value="South-East">South-East</option>
            <option value="South-West">South-West</option>
            <option value="Central">Central</option>
          </select>
        </div>

        {/* Bottom Right: Loan Type */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Remaining Lease(Years)</label>
          <select value={lease} onChange={e => setlease(e.target.value)} style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}>
            <option value="">Select...</option>
            <option value="0-25">0-25</option>
            <option value="25- 50">25- 50</option>
            <option value="50-75">50-75</option>
            <option value="75-99">75-99</option>
          </select>
        </div>

        {/* Submit Button: bottom middle, spans both columns */}
        <div style={{ gridColumn: "1 / span 2", textAlign: "center", marginTop: "32px" }}>
          <button
            type="submit"
            style={{
              background: "#fff",
              color: "#3a4a2b",
              border: "1px solid #e0e0e0",
              borderRadius: "16px",
              padding: "14px 48px",
              fontSize: "1.2rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              transition: "background 0.2s"
            }}
          >
            Submit
          </button>
        </div>
  </form>
    </div>
  );
}