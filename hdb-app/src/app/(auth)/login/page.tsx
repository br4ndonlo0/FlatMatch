"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #e53935 0%, #1e3a8a 100%)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <h2 style={{ color: '#e53935', background: 'white', padding: '0.5em 1em', borderRadius: '8px', boxShadow: '0 2px 8px rgba(30,58,138,0.1)' }}>
                Login
            </h2>
            <form style={{ marginTop: '2em', background: 'white', padding: '2em', borderRadius: '12px', boxShadow: '0 2px 16px rgba(30,58,138,0.15)', display: 'flex', flexDirection: 'column', gap: '1em', minWidth: '300px' }}>
                <input type="text" placeholder="Username" style={{ padding: '0.75em', borderRadius: '6px', border: '1px solid #e53935' }} />
                <input type="password" placeholder="Password" style={{ padding: '0.75em', borderRadius: '6px', border: '1px solid #1e3a8a' }} />
                <button type="submit" style={{ background: '#e53935', color: 'white', padding: '0.75em', borderRadius: '6px', border: 'none', fontWeight: 'bold' }}>
                    Login
                </button>
            </form>
        </div>
    );
}
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
