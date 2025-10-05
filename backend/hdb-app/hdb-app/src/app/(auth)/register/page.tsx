"use client";
import Link from "next/link";
import { useState } from "react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== rePassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Registration failed.");
        return;
      }

      // Handle successful registration (e.g., redirect to login)
      // window.location.href = "/login"; // Uncomment to redirect
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full font-sans flex items-center justify-center bg-blue-100">
      <div className="bg-white bg-opacity-90 rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-8 text-center">Register</h1>
        {error && <p className="mb-4 text-red-500 text-center">{error}</p>}
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400 text-black"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400 text-black"
            required
          />
          <input
            type="password"
            placeholder="Re-enter Password"
            value={rePassword}
            onChange={(e) => setRePassword(e.target.value)}
            className="p-3 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-400 text-black"
            required
          />
          <button
            type="submit"
            className="bg-blue-900 text-white px-6 py-2 rounded font-bold shadow hover:bg-blue-800 transition"
          >
            Register
          </button>
        </form>
        <p className="mt-6 text-center text-blue-800">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-900 font-bold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}