"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Refs for inputs to control cursor position
  const passwordRef = useRef<HTMLInputElement>(null);
  const rePasswordRef = useRef<HTMLInputElement>(null);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 5) {
      setError("Password must be at least 5 characters long.");
      return;
    }

    if (password !== rePassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rePassword }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push("/login");
      } else {
        setError(data.message || data.error || "Registration failed.");
      }
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Toggle with cursor preservation
  const togglePasswordVisibility = (field: "password" | "rePassword") => {
    if (field === "password" && passwordRef.current) {
      const input = passwordRef.current;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      setShowPassword((prev) => !prev);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start, end);
      }, 0);
    } else if (field === "rePassword" && rePasswordRef.current) {
      const input = rePasswordRef.current;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      setShowRePassword((prev) => !prev);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start, end);
      }, 0);
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

      {/* Registration Card */}
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md border border-blue-100">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-6 text-center">Register</h1>

        {error && (
          <p className="mb-4 text-red-600 text-center font-medium" aria-live="assertive">
            {error}
          </p>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-5">
          {/* Username */}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900"
            required
            autoComplete="username"
          />

          {/* Password Field */}
          <div className="relative">
            <input
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 5 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-3 w-full rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900 pr-10"
              required
              autoComplete="new-password"
              minLength={5}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => togglePasswordVisibility("password")}
              className="absolute inset-y-0 right-3 flex items-center text-blue-700 hover:text-blue-900"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                // Eye-off icon
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18m-9-4.5c-3.87 0-7.16-2.53-8.8-6.5a11.77 11.77 0 014.3-5.05M12 5c4.97 0 9.17 3.11 10.8 7.5a12.4 12.4 0 01-1.6 2.9M9.88 9.88a3 3 0 104.24 4.24" />
                </svg>
              ) : (
                // Eye icon
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Re-enter Password Field */}
          <div className="relative">
            <input
              ref={rePasswordRef}
              type={showRePassword ? "text" : "password"}
              placeholder="Re-enter Password"
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
              onClick={() => togglePasswordVisibility("rePassword")}
              className="absolute inset-y-0 right-3 flex items-center text-blue-700 hover:text-blue-900"
              aria-label={showRePassword ? "Hide password" : "Show password"}
            >
              {showRePassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18m-9-4.5c-3.87 0-7.16-2.53-8.8-6.5a11.77 11.77 0 014.3-5.05M12 5c4.97 0 9.17 3.11 10.8 7.5a12.4 12.4 0 01-1.6 2.9M9.88 9.88a3 3 0 104.24 4.24" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`bg-blue-800 text-white px-6 py-3 rounded font-bold shadow hover:bg-blue-700 transition transform hover:scale-[1.02] ${
              loading ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-blue-900">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-700 font-bold hover:underline hover:text-blue-900">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
