"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false); // State to track login progress
  const [showPassword, setShowPassword] = useState(false); // State for toggling password visibility
  const passwordRef = useRef<HTMLInputElement>(null); // Ref for password input
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true); // Set logging in state
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        // ✅ save username for later use (so HomePage can display it)
        localStorage.setItem("username", data.username ?? username);

        // then redirect to home page
        router.push("/home");
      } else {
        setError(data.error || data.message || "Login failed");
        setIsLoggingIn(false); // Reset logging in state only on failure
      }
    } catch (err) {
      setError("Login failed. Please try again.");
      setIsLoggingIn(false); // Reset logging in state only on failure
    }
  };

  // Add event listener to trigger login on Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.currentTarget;
      form.dispatchEvent(
        new Event("submit", { cancelable: true, bubbles: true })
      );
    }
  };

  const togglePasswordVisibility = () => {
    if (passwordRef.current) {
      const input = passwordRef.current;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      setShowPassword((prev) => !prev);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start, end);
      }, 0);
    }
  };

  return (
    <div
      className="min-h-screen w-full font-sans flex items-center justify-center relative bg-gradient-to-b from-blue-50 to-blue-100"
    >
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 bg-blue-800 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-semibold"
      >
        ← Back
      </button>

      {/* Login Card */}
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md border border-blue-100">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-8 text-center">
          Login
        </h1>

        {error && (
          <p className="mb-4 text-red-600 text-center" aria-live="assertive">
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="flex flex-col gap-6"
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900"
            required
          />
          <div className="relative">
            <input
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-3 w-full rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900 pr-10"
              required
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-3 flex items-center text-blue-700 hover:text-blue-900"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l18 18m-9-4.5c-3.87 0-7.16-2.53-8.8-6.5a11.77 11.77 0 014.3-5.05M12 5c4.97 0 9.17 3.11 10.8 7.5a12.4 12.4 0 01-1.6 2.9M9.88 9.88a3 3 0 104.24 4.24"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <div className="text-right -mt-2 -mb-2">
            <Link href="/auth/reset/request" className="text-blue-700 text-sm font-semibold hover:underline hover:text-blue-900">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            className={`bg-blue-800 text-white px-6 py-3 rounded font-bold shadow transition transform hover:scale-[1.02] ${
              isLoggingIn ? "bg-gray-500 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-blue-900">
          Don’t have an account?{" "}
          <Link
            href="/register"
            className="text-blue-700 font-bold hover:underline hover:text-blue-900"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
