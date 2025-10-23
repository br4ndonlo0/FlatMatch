"use client";
import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"check" | "reset">("check");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [done, setDone] = useState(false);

  async function checkUsername(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!username) { setError("Please enter your username."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/reset/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to check username");
      if (!data.exists) {
        setError("Username not found.");
        return;
      }
      setInfo("User found. Please enter a new password.");
      setStep("reset");
    } catch (e:any) {
      setError(e.message || "Failed to check username");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!pwd || !pwd2) { setError("Please fill in both password fields."); return; }
    if (pwd !== pwd2) { setError("Passwords do not match."); return; }
    if (pwd.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: pwd })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setDone(true);
      setInfo("Password updated. You can now log in.");
    } catch (e:any) {
      setError(e.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-6">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md border border-blue-100">
        <h1 className="text-2xl font-extrabold text-blue-900 mb-4 text-center">Forgot password</h1>

        {!!error && (<div className="text-red-600 font-semibold mb-3" role="alert">{error}</div>)}
        {!!info && (<div className="text-green-700 font-semibold mb-3" role="status">{info}</div>)}

        {step === "check" && (
          <form onSubmit={checkUsername} className="grid gap-4">
            <label className="grid gap-2">
              <span className="font-semibold text-blue-900">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-800 text-white px-5 py-3 rounded font-bold shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Checking…" : "Next"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword} className="grid gap-4">
            <div className="text-sm text-blue-900">Resetting password for <b>{username}</b></div>
            <label className="grid gap-2">
              <span className="font-semibold text-blue-900">New Password</span>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900" />
            </label>
            <label className="grid gap-2">
              <span className="font-semibold text-blue-900">Confirm Password</span>
              <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900" />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-800 text-white px-5 py-3 rounded font-bold shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Update Password"}
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          {done ? (
            <Link href="/login" className="text-blue-700 font-bold hover:underline">Go to Login</Link>
          ) : (
            <Link href="/login" className="text-blue-700 hover:underline">Back to Login</Link>
          )}
        </div>
      </div>
    </div>
  );
}
