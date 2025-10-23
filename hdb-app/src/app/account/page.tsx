"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type UserInfo = {
  username: string;
  email?: string;
  income?: string;
  citizenship?: string;
  householdSize?: number;
  loan?: string;
  flatType?: string;
  budget?: string;
  area?: string;
  leaseLeft?: string;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showUserInfo, setShowUserInfo] = useState(true);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/userinfo", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to fetch user info");
        }
        if (!ignore) setUser(data.user as UserInfo);
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Failed to load account info");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // Format numbers with a $ prefix, with graceful fallback
  const fmtMoney = (v?: string) => {
    if (v === undefined || v === null || v === "") return "—";
    const str = String(v);
    const n = Number(str.replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(n)) {
      return str.startsWith("$") ? str : `$${str}`;
    }
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen w-full font-sans flex items-center justify-center relative bg-gradient-to-b from-blue-50 to-blue-100 p-6">
      {/* Home button */}
      <Link
        href="/"
        className="absolute top-6 left-6 bg-blue-800 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-semibold"
      >
        ← Home
      </Link>

      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-xl border border-blue-100">
        <h1 className="text-3xl font-extrabold text-blue-900 mb-4">Account</h1>

        {loading && <p className="text-blue-900">Loading your account…</p>}

        {!loading && error && (
          <div className="text-red-600 mb-4">
            {error}
            <div className="mt-2 text-blue-900">
              Please <Link href="/login" className="text-blue-700 font-semibold hover:underline">login</Link> and try again.
            </div>
          </div>
        )}

        {!loading && !error && user && (
          <div className="space-y-4">
            {/* User Info accordion */}
            <div className="border border-blue-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowUserInfo((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold"
                aria-expanded={showUserInfo}
                aria-controls="user-info-section"
              >
                <span>User Info</span>
                <span className="text-xl">{showUserInfo ? "▴" : "▾"}</span>
              </button>
              {showUserInfo && (
                <div id="user-info-section" className="p-4 grid grid-cols-3 gap-2 text-blue-900">
                  <div className="font-semibold">Username</div>
                  <div className="col-span-2">{user.username}</div>
                  <div className="font-semibold">Email</div>
                  <div className="col-span-2">{user.email ?? "—"}</div>
                </div>
              )}
            </div>

            {/* Your Information accordion */}
            <div className="border border-blue-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAccountInfo((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold"
                aria-expanded={showAccountInfo}
                aria-controls="account-info-section"
              >
                <span>Your Information</span>
                <span className="text-xl">{showAccountInfo ? "▴" : "▾"}</span>
              </button>
              {showAccountInfo && (
                <div id="account-info-section" className="p-4 grid grid-cols-3 gap-2 text-blue-900">
                  <div className="font-semibold">Income</div>
                  <div className="col-span-2">{fmtMoney(user.income)}</div>
                  <div className="font-semibold">Citizenship</div>
                  <div className="col-span-2">{user.citizenship ?? "—"}</div>
                  <div className="font-semibold">Household Size</div>
                  <div className="col-span-2">{user.householdSize ?? "—"}</div>
                  <div className="font-semibold">Loan</div>
                  <div className="col-span-2">{user.loan ?? "—"}</div>
                  <div className="font-semibold">Preferred Flat Type</div>
                  <div className="col-span-2">{user.flatType ?? "—"}</div>
                  <div className="font-semibold">Budget</div>
                  <div className="col-span-2">{fmtMoney(user.budget)}</div>
                  <div className="font-semibold">Area</div>
                  <div className="col-span-2">{user.area ?? "—"}</div>
                  <div className="font-semibold">Lease Left</div>
                  <div className="col-span-2">{user.leaseLeft ? `${user.leaseLeft} years` : "—"}</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/userinfo"
                className="bg-blue-800 text-white px-5 py-2 rounded font-bold shadow hover:bg-blue-700"
              >
                Edit Info
              </Link>
              <Link
                href="/auth/change-password"
                className="bg-white text-blue-800 border border-blue-300 px-5 py-2 rounded font-bold shadow hover:bg-blue-50"
              >
                Change Password
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
 
