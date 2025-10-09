"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

/** Full-page blue UI with global styles applied */
export default function UserInfo() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const navOptions = [
    { label: "UserInfo", href: "/userinfo" },
    { label: "Recommended", href: "/recommended" },
    { label: "HDB Listings", href: "/hdb-listings" },
    { label: "Overview", href: "/overview" },
    { label: "PriceTrend", href: "/pricetrend" },
    { label: "Affordability", href: "/affordability" },
    { label: "Amenities", href: "/amenities" },
  ];

  // ---------------- Form state ----------------
  const [income, setIncome] = useState("");
  const [citizenship, setCitizenship] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [loanType, setLoanType] = useState("");
  const [flatType, setFlatType] = useState("");
  const [budget, setBudget] = useState("");
  const [area, setArea] = useState("");
  const [lease, setLease] = useState("");

  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ---------------- Effects: dropdown listeners ----------------
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // ---------------- Effects: fetch user info ----------------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/userinfo", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        const user = data.user;
        if (user) {
          setIncome(user.income ? String(user.income) : "");
          setCitizenship(user.citizenship || "");
          setHouseholdSize(user.householdSize ? String(user.householdSize) : "");
          setLoanType(user.loan || "");
          setFlatType(user.flatType || "");
          setBudget(user.budget ? String(user.budget) : "");
          setArea(user.area || "");
          setLease(user.leaseLeft ? String(user.leaseLeft) : "");
        }
      } catch {
        // ignore; show empty form
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ---------------- Validation helpers ----------------
  const onlyDigits = (s: string) => /^\d+$/.test(s);
  const prettyNumber = (s: string) => {
    if (!s) return "";
    const n = Number(s);
    return Number.isFinite(n) ? n.toLocaleString() : s;
    };

  // ---------------- Submit ----------------
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    if (!income || !onlyDigits(income)) {
      setFormError("Yearly household income must be an integer.");
      return;
    }
    if (budget && !onlyDigits(budget)) {
      setFormError("Budget must be an integer if provided.");
      return;
    }

    setIsSaving(true);
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
          lease,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || data.message || "Failed to save user info.");
      } else {
        setSuccessMsg("Saved successfully ✔");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch {
      setFormError("Failed to save user info. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // ---------------- Unified BLUE palette ----------------
  const c = {
    bg1: "#E9F5FF",   // light blue
    bg2: "#F7FBFF",   // extra-soft blue
    ink: "#143D8D",   // main blue
    brand: "#0E2B64", // dark blue
    card: "#ffffff",
    line: "#d0e5ff",
    chip: "#F2F7FF",
    focus: "#3B82F6",
  } as const;

  const cardShadow = "0 8px 30px rgba(16, 57, 130, 0.10)";

  return (
    <>
      {/* GLOBAL styles — colors the WHOLE page, not just this component */}
      <style jsx global>{`
        html, body, #__next { height: 100%; }
        html, body { margin: 0; }
        body {
          min-height: 100dvh;
          background: linear-gradient(180deg, ${c.bg1} 0%, ${c.bg2} 100%);
          background-attachment: fixed;
          color: ${c.brand};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        @media (max-width: 860px) {
          .gridTwoCols { grid-template-columns: 1fr !important; }
        }
        /* Optional: smooth focus outline for keyboard users */
        :focus-visible { outline: 2px solid ${c.focus}; outline-offset: 2px; }
      `}</style>

      <div style={{ minHeight: "100dvh", width: "100%" }}>
        {/* Top bar */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: c.card,
            borderBottom: `1px solid ${c.line}`,
          }}
        >
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 24px",
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            <Link
              href="/home"
              style={{
                textDecoration: "none",
                background: c.chip,
                border: `1px solid ${c.line}`,
                padding: "8px 16px",
                borderRadius: 12,
                fontWeight: 800,
                color: c.brand,
              }}
            >
              ← Home
            </Link>

            <h1
              style={{
                margin: 0,
                fontSize: 24,
                letterSpacing: 0.4,
                fontWeight: 900,
                color: c.ink,
              }}
            >
              User Information
            </h1>

            {/* Dropdown */}
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen((v) => !v)}
                style={{
                  border: `1px solid ${c.line}`,
                  background: c.chip,
                  borderRadius: 12,
                  padding: "8px 14px",
                  fontWeight: 800,
                  cursor: "pointer",
                  color: c.ink,
                  boxShadow: "0 1px 0 rgba(20,61,141,0.05)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.boxShadow = `0 0 0 3px ${c.focus}33`)
                }
                onBlur={(e) =>
                  (e.currentTarget.style.boxShadow = "0 1px 0 rgba(20,61,141,0.05)")
                }
              >
                Navigation ▾
              </button>
              {dropdownOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: 220,
                    background: c.card,
                    border: `1px solid ${c.line}`,
                    borderRadius: 12,
                    boxShadow: cardShadow,
                    overflow: "hidden",
                  }}
                >
                  {navOptions.map((opt, i) => (
                    <Link
                      key={opt.label}
                      href={opt.href}
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "block",
                        padding: "12px 16px",
                        textDecoration: "none",
                        color: c.ink,
                        fontWeight: 700,
                        borderBottom:
                          i === navOptions.length - 1 ? "none" : `1px solid ${c.line}`,
                      }}
                    >
                      {opt.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </header>

        {/* Main card */}
        <main style={{ maxWidth: 1100, margin: "32px auto", padding: "0 16px" }}>
          <section
            style={{
              background: c.card,
              border: `1px solid ${c.line}`,
              borderRadius: 16,
              boxShadow: cardShadow,
              padding: 24,
            }}
          >
            {/* Status messages */}
            {isLoading && (
              <div
                role="status"
                style={{
                  background: "#EFF6FF",
                  border: `1px solid ${c.line}`,
                  color: c.ink,
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontWeight: 800,
                }}
              >
                Loading your info…
              </div>
            )}
            {!!formError && (
              <div
                role="alert"
                style={{
                  background: "#FDF2F2",
                  border: "1px solid #F9D2D2",
                  color: "#7A1E1E",
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontWeight: 800,
                }}
              >
                {formError}
              </div>
            )}
            {!!successMsg && (
              <div
                role="status"
                style={{
                  background: "#ECFDF3",
                  border: "1px solid #C6F6D5",
                  color: "#065F46",
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontWeight: 900,
                }}
              >
                {successMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 20 }}>
              {/* Section: User Info */}
              <SectionTitle title="User Info" ink={c.brand} line={c.line} />
              <div className="gridTwoCols" style={gridTwoCols}>
                <Field label="Yearly Household Income" hint={`Numbers only • e.g. ${prettyNumber("120000")}`} required>
                  <InputNumeric value={income} onChange={setIncome} placeholder="e.g. 120000" />
                </Field>

                <Field label="Citizenship">
                  <Select value={citizenship} onChange={setCitizenship}>
                    <option value="">Select…</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Permanent Resident">Permanent Resident</option>
                    <option value="Foreigner">Foreigner</option>
                  </Select>
                </Field>

                <Field label="Household Size">
                  <Select value={householdSize} onChange={setHouseholdSize}>
                    <option value="">Select…</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                    <option value=">9">More than 9</option>
                  </Select>
                </Field>

                <Field label="Loan Type">
                  <Select value={loanType} onChange={setLoanType}>
                    <option value="">Select…</option>
                    <option value="Loan A">Loan A</option>
                    <option value="Loan B">Loan B</option>
                    <option value="Loan C">Loan C</option>
                  </Select>
                </Field>
              </div>

              {/* Section: Preferences */}
              <SectionTitle title="User Preferences" ink={c.brand} line={c.line} />
              <div className="gridTwoCols" style={gridTwoCols}>
                <Field label="Flat Type">
                  <Select value={flatType} onChange={setFlatType}>
                    <option value="">Select…</option>
                    <option value="2-room">2-room</option>
                    <option value="3-room">3-room</option>
                    <option value="4-room">4-room</option>
                    <option value="5-room">5-room</option>
                    <option value="Executive">Executive</option>
                  </Select>
                </Field>

                <Field label="Budget" hint={`Optional • e.g. ${prettyNumber("600000")}`}>
                  <InputNumeric value={budget} onChange={setBudget} placeholder="e.g. 600000" />
                </Field>

                <Field label="Preferred Area">
                  <Select value={area} onChange={setArea}>
                    <option value="">Select…</option>
                    <option value="North">North</option>
                    <option value="North-East">North-East</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="Central">Central</option>
                  </Select>
                </Field>

                <Field label="Lease Duration (years left)">
                  <Select value={lease} onChange={setLease}>
                    <option value="">Select…</option>
                    <option value="0-25">0–25</option>
                    <option value="25-50">25–50</option>
                    <option value="50-75">50–75</option>
                    <option value="75-99">75–99</option>
                  </Select>
                </Field>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={isSaving || isLoading}
                  style={{
                    background: isSaving ? "#EAF2FF" : c.ink,
                    color: "#fff",
                    border: `1px solid ${c.ink}`,
                    borderRadius: 16,
                    padding: "14px 32px",
                    fontSize: 16,
                    fontWeight: 900,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    boxShadow: "0 6px 22px rgba(20,61,141,0.25)",
                    transition: "transform 120ms ease, filter 120ms ease",
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${c.focus}55`)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "0 6px 22px rgba(20,61,141,0.25)")}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1.0)")}
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </section>

          {/* Tiny footer */}
          <footer style={{ textAlign: "center", color: c.brand, fontSize: 12, marginTop: 16 }}>
            Tip: You can come back anytime to update your preferences.
          </footer>
        </main>
      </div>
    </>
  );
}

/* ---------------- Small UI helpers ---------------- */
function SectionTitle({ title, ink, line }: { title: string; ink: string; line: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 4px" }}>
      <div style={{ flex: 1, height: 1, background: line }} />
      <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: 1, color: ink }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: line }} />
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontWeight: 900, color: "#0E2B64" }}>
        {label} {required && <span style={{ color: "#B91C1C" }}>*</span>}
      </span>
      {children}
      {hint && <span style={{ fontSize: 12, color: "#5B6B91" }}>{hint}</span>}
    </label>
  );
}

const baseInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 14,
  borderRadius: 12,
  border: "1px solid #d0e5ff",
  background: "#fff",
  color: "#0E2B64",
  outline: "none",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
};

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={baseInput}
      onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.35)")}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.02)")}
    >
      {children}
    </select>
  );
}

function InputNumeric({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={baseInput}
      onFocus={(e) =>
        (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.35)")
      }
      onBlur={(e) =>
        (e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.02)")
      }
    />
  );
}


const gridTwoCols: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};
