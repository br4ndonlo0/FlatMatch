"use client";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full font-sans">
      {/* Navbar */}
      <nav className="w3-top fixed top-0 left-0 w-full bg-blue-900 text-white shadow z-50">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="font-bold text-2xl tracking-widest">HDB Finder</div>
          <div className="hidden md:flex gap-8">
            <a href="#home" className="hover:text-blue-300">Home</a>
            <a href="#about" className="hover:text-blue-300">About</a>
          </div>
          <div className="md:hidden relative">
            <button onClick={() => setMenuOpen((open) => !open)} className="focus:outline-none">
              <span className="material-icons">menu</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white text-black border rounded shadow-lg flex flex-col z-10">
                <a href="#home" className="px-4 py-2 hover:bg-blue-100">Home</a>
                <a href="#about" className="px-4 py-2 hover:bg-blue-100">About</a>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section with Parallax */}
      <section id="home" className="relative flex items-center justify-center h-[80vh] bg-[url('/public/globe.svg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-blue-900 bg-opacity-60"></div>
        <div className="relative z-10 text-center">
          <h1 className="text-7xl font-extrabold text-white tracking-widest mb-6 drop-shadow-lg">Resale HDB Finder</h1>
          <p className="text-xl text-blue-100 mb-8">Find your dream resale HDB flat in Singapore</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/login"
              className="px-6 py-2 bg-white text-blue-900 font-bold rounded-full shadow hover:bg-blue-100 transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 bg-white text-blue-900 font-bold rounded-full shadow hover:bg-blue-100 transition"
            >
              Register
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-blue-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4 text-blue-900">About</h2>
          <p className="text-lg text-blue-800">
Our website is designed to help Singapore residents make informed decisions when choosing a re-sale HDB flat. By integrating official open datasets, we provide accurate, up-to-date information on flat prices, locations, amenities, and eligibility. With personalized filters and smart recommendations, our goal is to simplify the flat selection process and make home-hunting more efficient and tailored for everyone.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-8 text-center">
        <div className="mb-4">
          <p className="inline-block px-4 py-2 bg-blue-100 text-blue-900 rounded-full font-bold">Thank You!</p>
        </div>
      </footer>
    </div>
  );
}