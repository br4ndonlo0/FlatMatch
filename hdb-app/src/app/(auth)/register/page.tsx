"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    // Client-side password validation
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
        router.push("/home");
      } else {
        setError(data.message || data.error || "Registration failed.");
      }
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
        <h1 className="text-4xl font-extrabold text-blue-900 mb-6 text-center">
          Register
        </h1>

        {error && (
          <p
            className="mb-4 text-red-600 text-center font-medium"
            aria-live="assertive"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-5">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900"
            required
            autoComplete="username"
          />

          <input
            type="password"
            placeholder="Password (min 5 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900"
            required
            autoComplete="new-password"
            minLength={5} // ✅ changed from 8 to 5
          />

          <input
            type="password"
            placeholder="Re-enter Password"
            value={rePassword}
            onChange={(e) => setRePassword(e.target.value)}
            className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900"
            required
            autoComplete="new-password"
            minLength={5} // ✅ changed from 8 to 5
          />

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
          <Link
            href="/login"
            className="text-blue-700 font-bold hover:underline hover:text-blue-900"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
