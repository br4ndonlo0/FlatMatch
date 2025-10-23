"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showRe, setShowRe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const oldRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const reRef = useRef<HTMLInputElement>(null);

  const toggleWithCursor = (
    which: "old" | "new" | "re",
    setShow: React.Dispatch<React.SetStateAction<boolean>>,
    ref: React.RefObject<HTMLInputElement | null>
  ) => {
    if (!ref.current) return;
    const input = ref.current;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    setShow((v) => !v);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start, end);
    }, 0);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword !== rePassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 5) {
      setError("New password must be at least 5 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword, rePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to change password.");
      } else {
        setMessage("Password updated successfully.");
        setOldPassword("");
        setNewPassword("");
        setRePassword("");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full font-sans flex items-center justify-center relative bg-gradient-to-b from-blue-50 to-blue-100">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 bg-blue-800 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-semibold"
      >
        ← Back
      </button>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md border border-blue-100">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-6 text-center">
          Change Password
        </h1>

        {message && (
          <div className="mb-4 text-green-700 text-center" aria-live="polite">{message}</div>
        )}
        {error && (
          <div className="mb-4 text-red-600 text-center" aria-live="assertive">{error}</div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          {/* Current */}
          <div className="relative">
            <input
              ref={oldRef}
              type={showOld ? "text" : "password"}
              placeholder="Current Password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="p-3 w-full rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900 pr-10"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleWithCursor("old", setShowOld, oldRef)}
              className="absolute inset-y-0 right-3 flex items-center text-blue-700 hover:text-blue-900"
              aria-label={showOld ? "Hide password" : "Show password"}
            >
              {showOld ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18m-9-4.5c-3.87 0-7.16-2.53-8.8-6.5a11.77 11.77 0 014.3-5.05M12 5c4.97 0 9.17 3.11 10.8 7.5a12.4 12.4 0 01-1.6 2.9M9.88 9.88a3 3 0 104.24 4.24" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* New */}
          <div className="relative">
            <input
              ref={newRef}
              type={showNew ? "text" : "password"}
              placeholder="New Password (min 5 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="p-3 w-full rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900 pr-10"
              required
              autoComplete="new-password"
              minLength={5}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleWithCursor("new", setShowNew, newRef)}
              className="absolute inset-y-0 right-3 flex items-center text-blue-700 hover:text-blue-900"
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              {showNew ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18m-9-4.5c-3.87 0-7.16-2.53-8.8-6.5a11.77 11.77 0 014.3-5.05M12 5c4.97 0 9.17 3.11 10.8 7.5a12.4 12.4 0 01-1.6 2.9M9.88 9.88a3 3 0 104.24 4.24" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Confirm New */}
          <div className="relative">
            <input
              ref={reRef}
              type={showRe ? "text" : "password"}
              placeholder="Confirm New Password"
              value={rePassword}
              onChange={(e) => setRePassword(e.target.value)}
              className="p-3 w-full rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900 pr-10"
              required
              autoComplete="new-password"
              minLength={5}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleWithCursor("re", setShowRe, reRef)}
              className="absolute inset-y-0 right-3 flex items-center text-blue-700 hover:text-blue-900"
              aria-label={showRe ? "Hide password" : "Show password"}
            >
              {showRe ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18m-9-4.5c-3.87 0-7.16-2.53-8.8-6.5a11.77 11.77 0 014.3-5.05M12 5c4.97 0 9.17 3.11 10.8 7.5a12.4 12.4 0 01-1.6 2.9M9.88 9.88a3 3 0 104.24 4.24" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <button
            type="submit"
            className={`bg-blue-800 text-white px-6 py-3 rounded font-bold shadow hover:bg-blue-700 transition transform hover:scale-[1.02] ${
              loading ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <p className="mt-6 text-center text-blue-900">
          Prefer to review your details?{" "}
          <Link href="/account" className="text-blue-700 font-bold hover:underline hover:text-blue-900">
            Back to Account
          </Link>
        </p>
      </div>
    </div>
  );
}
