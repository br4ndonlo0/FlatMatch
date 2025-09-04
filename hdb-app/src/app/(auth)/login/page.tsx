"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        // Add authentication logic here
    };

    return (
        <div className="min-h-screen w-full font-sans flex items-center justify-center bg-blue-100">
            <div className="bg-white bg-opacity-90 rounded-xl shadow-lg p-8 w-full max-w-md">
                <h1 className="text-4xl font-extrabold text-blue-900 mb-8 text-center">Login</h1>
                {error && <p className="mb-4 text-red-500 text-center">{error}</p>}
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
                    <button
                        type="submit"
                        className="bg-blue-900 text-white px-6 py-2 rounded font-bold shadow hover:bg-blue-800 transition"
                    >
                        Login
                    </button>
                </form>
                <p className="mt-6 text-center text-blue-800">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-blue-900 font-bold hover:underline">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}
