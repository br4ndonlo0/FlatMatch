"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/home");
      } else {
        setError(data.error || data.message || "Login failed");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-blue-900"
            required
          />
          <button
            type="submit"
            className="bg-blue-800 text-white px-6 py-3 rounded font-bold shadow hover:bg-blue-700 transition transform hover:scale-[1.02]"
          >
            Login
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
