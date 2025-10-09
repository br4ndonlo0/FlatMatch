"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

type UserDoc = {
  username?: string;
  email?: string;
  phone?: string;
  address?: string;
  income?: number | string;
  citizenship?: string;
  householdSize?: string;
  loan?: string;
  flatType?: string;
  budget?: number | string;
  area?: string;
  leaseLeft?: string;
};

export default function AccountPage() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement | null>(null);

  const [userInfoOpen, setUserInfoOpen] = useState(false); // accordion toggle

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

  const navOptions: never[] = []; // Removed all navigation options from the top bar and explicitly typed as 'never[]'

  const [user, setUser] = useState<UserDoc | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/userinfo", { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j?.error || "Failed to fetch user info");
          return;
        }
        const data = await res.json();
        setUser(data.user ?? null);
      } catch {
        setError("Failed to fetch user info");
      }
    })();
  }, []);

  const prettyNumber = (v?: number | string) => {
    if (v === undefined || v === null || v === "") return "—";
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString() : String(v);
  };

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
        <p style={{ color: "#c62828", fontWeight: 700 }}>{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fbff",
        color: "#0b295c",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Top blue header */}
      <header
        style={{
          backgroundColor: "#123b91",
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
          FlatMatch
        </Link>

        <div style={{ display: "flex", gap: 16 }}>
          {/* Account Dropdown */}
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
                  onClick={() => {
                    window.location.href = "/logout";
                  }}
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
      <div style={{ height: 10, backgroundColor: "#e3eefb" }} />

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
        <h1 style={{ color: "#123b91", fontSize: 26, marginBottom: 6 }}>
          Account
        </h1>
        <p style={{ color: "#4a648c", marginBottom: 24 }}>
          Manage your account settings. Click the section below to view your
          stored user information.
        </p>

        {/* === USER INFO DROPDOWN SECTION === */}
        <section
          style={{
            border: "1px solid #d0ddf5",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 20,
            background: "#f9fbff",
          }}
        >
          <button
            onClick={() => setUserInfoOpen((v) => !v)}
            aria-expanded={userInfoOpen}
            aria-controls="user-info-disclosure"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              background: "#eef4ff",
              color: "#123b91",
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            <span>User Info</span>
            <span style={{ fontWeight: 900 }}>{userInfoOpen ? "▴" : "▾"}</span>
          </button>

          <div
            id="user-info-disclosure"
            style={{
              transition: "max-height 220ms ease",
              maxHeight: userInfoOpen ? 900 : 0,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 18px" }}>
              <Section title="Profile">
                <KV label="Username" value={user.username ?? "—"} />
                <KV label="Email" value={user.email ?? "—"} />
                <KV label="Phone" value={user.phone ?? "—"} />
                <KV label="Address" value={user.address ?? "—"} />
              </Section>

              <Section title="Housing Preferences">
                <KV label="Citizenship" value={user.citizenship ?? "—"} />
                <KV label="Household Size" value={user.householdSize ?? "—"} />
                <KV label="Loan Type" value={user.loan ?? "—"} />
                <KV label="Flat Type" value={user.flatType ?? "—"} />
                <KV label="Preferred Area" value={user.area ?? "—"} />
                <KV label="Lease Duration Left" value={user.leaseLeft ?? "—"} />
              </Section>

              <Section title="Financials">
                <KV label="Household Income (S$)" value={prettyNumber(user.income)} />
                <KV label="Budget (S$)" value={prettyNumber(user.budget)} />
              </Section>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------- Helpers ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <h2 style={{ fontSize: 16, color: "#123b91", margin: "0 0 10px", fontWeight: 800 }}>
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", alignItems: "center", gap: 10 }}>
      <div style={{ color: "#123b91", fontWeight: 700 }}>{label}</div>
      <div
        style={{
          border: "1px solid #d0ddf5",
          borderRadius: 8,
          padding: "10px 12px",
          background: "#fff",
          minHeight: 40,
          display: "flex",
          alignItems: "center",
        }}
      >
        {value}
      </div>
    </div>
  );
}
