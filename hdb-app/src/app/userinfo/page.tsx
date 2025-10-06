"use client";
import React, { useState } from "react";
import Link from "next/link";
export default function UserInfo() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navOptions = [
    { label: "UserInfo", href: "/userinfo" },
    { label: "Recommended", href: "/recommended" },
    { label: "HDB Listings", href: "/hdb-listings" },
    { label: "Overview", href: "/overview" },
    { label: "PriceTrend", href: "/pricetrend" },
    { label: "Affordability", href: "/affordability" },
    { label: "Amenities", href: "/amenities" },
  ];

  // All form states
  const [income, setIncome] = useState("");
  const [formError, setFormError] = useState("");
  const [citizenship, setCitizenship] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [loanType, setLoanType] = useState("");
  const [flatType, setFlatType] = useState("");
  const [budget, setBudget] = useState("");
  const [area, setArea] = useState("");
  const [lease, setLease] = useState("");

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
          }}>User Information</h1>

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

      {/* 8 fields in 4x2 grid */}
      <form
        onSubmit={async e => {
          e.preventDefault();
          setFormError("");
          if (!/^[0-9]+$/.test(income)) {
            setFormError("Yearly Household Income must be an integer.");
            return;
          }
          try {
            const res = await fetch("/api/userinfo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                income,
                citizenship,
                householdSize,
                loanType,
                flatType,
                budget,
                area,
                lease
              })
            });
            const data = await res.json();
            if (!res.ok) {
              setFormError(data.error || data.message || "Failed to save user info.");
            } else {
              // Optionally show success or redirect
              setFormError("");
            }
          } catch (err) {
            setFormError("Failed to save user info. Please try again.");
          }
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "40px repeat(2, 1fr) 40px repeat(2, 1fr) auto",
          gap: "48px 48px",
          maxWidth: "900px",
          margin: "64px auto 0 auto",
          minHeight: "700px"
        }}
      >
        {/* User Info Section Header */}
        <div style={{ gridColumn: "1 / span 2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ flex: 1, height: 1, background: "#ccc", marginRight: 16 }} />
          <span style={{ fontWeight: 700, fontSize: "1.2rem", color: "#3a4a2b", letterSpacing: 2 }}>User Info</span>
          <div style={{ flex: 1, height: 1, background: "#ccc", marginLeft: 16 }} />
        </div>
        {/* Row 1 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Yearly Household Income</label>
          <input
            type="text"
            value={income}
            onChange={e => {
              // Only allow numbers in input
              if (e.target.value === "" || /^[0-9]+$/.test(e.target.value)) {
                setIncome(e.target.value);
              }
            }}
            placeholder="Enter yearly household income"
            style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Citizenship</label>
          <select value={citizenship} onChange={e => setCitizenship(e.target.value)} style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}>
            <option value="">Select...</option>
            <option value="Singapore">Singapore</option>
            <option value="Permanent Resident">Permanent Resident</option>
            <option value="Foreigner">Foreigner</option>
          </select>
        </div>
        {/* Row 2 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Household Size</label>
          <select value={householdSize} onChange={e => setHouseholdSize(e.target.value)} style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}>
            <option value="">Select...</option>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value=">9">More than 9</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Loan Type</label>
          <select value={loanType} onChange={e => setLoanType(e.target.value)} style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}>
            <option value="">Select...</option>
            <option value="Loan A">Loan A</option>
            <option value="Loan B">Loan B</option>
            <option value="Loan C">Loan C</option>
          </select>
        </div>
        {/* User Preferences Section Header */}
        <div style={{ gridColumn: "1 / span 2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ flex: 1, height: 1, background: "#ccc", marginRight: 16 }} />
          <span style={{ fontWeight: 700, fontSize: "1.2rem", color: "#3a4a2b", letterSpacing: 2 }}>User Preferences</span>
          <div style={{ flex: 1, height: 1, background: "#ccc", marginLeft: 16 }} />
        </div>
        {/* Row 3 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Flat Type</label>
          <select value={flatType} onChange={e => setFlatType(e.target.value)} style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}>
            <option value="">Select...</option>
            <option value="2-room">2-room</option>
            <option value="3-room">3-room</option>
            <option value="4-room">4-room</option>
            <option value="5-room">5-room</option>
            <option value="Executive">Executive</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Budget</label>
          <input
            type="text"
            value={budget}
            onChange={a => {
              // Only allow numbers in input
              if (a.target.value === "" || /^[0-9]+$/.test(a.target.value)) {
                setBudget(a.target.value);
              }
            }}
            placeholder="Enter Budget"
            style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}
          /></div>
        {/* Row 4 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Preferred Area</label>
          <select value={area} onChange={e => setArea(e.target.value)} style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}>
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <label style={{ fontWeight: 600, marginBottom: 12, fontSize: "1.1rem", color: "#3a4a2b" }}>Lease Duration</label>
          <select value={lease} onChange={e => setLease(e.target.value)} style={{ width: "260px", padding: "10px", fontSize: "1rem", borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#000" }}>
            <option value="">Select...</option>
           <option value="0-25">0-25</option>
            <option value="25- 50">25- 50</option>
            <option value="50-75">50-75</option>
            <option value="75-99">75-99</option>
          </select>
        </div>
        {/* Save Button: bottom middle, spans both columns */}
        <div style={{ gridColumn: "1 / span 2", textAlign: "center", marginTop: "32px" }}>
          {formError && <div style={{ color: "red", marginBottom: "16px", fontWeight: 500 }}>{formError}</div>}
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
            Save
          </button>
        </div>
      </form>
    </div>
  );
}