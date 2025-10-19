// app/finder/page.tsx
"use client";
import { useState } from "react";

export default function FinderPage() {
  const [w, setW] = useState({ school:5, mrt:8, hospital:0, level:3, price:9, lease:6 });
  const [results, setResults] = useState<any[]|null>(null);
  const [loading, setLoading] = useState(false);
  const [townInput, setTownInput] = useState("");
  const [towns, setTowns] = useState<string[]>([]); // up to 3

  function addTown() {
    const t = townInput.trim().toUpperCase();
    if (!t) return;
    if (towns.includes(t)) return;
    if (towns.length >= 3) return;
    setTowns([...towns, t]);
    setTownInput("");
  }
  function removeTown(t:string) { setTowns(towns.filter(x=>x!==t)); }

  async function run() {
    setLoading(true);
    const res = await fetch("/api/finder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ weights: { ...w, hospital:0 }, towns }),
    });
    const data = await res.json();
    setResults(data.results ?? []);
    setLoading(false);
  }

  function Slider({label, keyName}:{label:string; keyName: keyof typeof w}) {
    return (
      <label className="block">
        <div className="mb-1">{label}: {w[keyName]}</div>
        <input type="range" min={1} max={10} value={w[keyName]}
          onChange={(e)=>setW({...w, [keyName]: Number(e.target.value)})}/>
      </label>
    );
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">HDB Finder</h1>
      <div className="space-y-2">
        <label className="block font-medium">Select up to 3 Towns</label>
        <div className="flex gap-2 flex-wrap">
          {towns.map(t => (
            <span key={t} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1">
              {t}
              <button onClick={()=>removeTown(t)} className="text-red-500 hover:text-red-700">×</button>
            </span>
          ))}
          {towns.length < 3 && (
            <input
              value={townInput}
              onChange={e=>setTownInput(e.target.value)}
              onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); addTown(); } }}
              placeholder="e.g. ANG MO KIO"
              className="border px-2 py-1 rounded"
            />
          )}
          {towns.length < 3 && (
            <button onClick={addTown} className="px-3 py-1 bg-blue-600 text-white rounded">Add</button>
          )}
        </div>
        <p className="text-xs text-gray-500">Town names must match HDB dataset TOWN values (uppercase).</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider label="Proximity to Schools" keyName="school" />
        <Slider label="Proximity to MRT" keyName="mrt" />
        <Slider label="House Level" keyName="level" />
        <Slider label="Price (lower better)" keyName="price" />
        <Slider label="Lease (more better)" keyName="lease" />
      </div>
      <button onClick={run} className="px-4 py-2 rounded bg-blue-600 text-white" disabled={loading || towns.length===0}>
        {loading ? "Scoring…" : towns.length===0 ? "Add at least 1 town" : "Find Flats"}
      </button>

      {results && (
        <ul className="divide-y">
          {results.map(r => (
            <li key={r.id} className="py-3">
              <div className="font-medium">{r.town} {r.block} {r.street_name}</div>
              <div className="text-sm opacity-75">
                Score {(r.score*100).toFixed(1)} · {Math.round(r.distances?.dMrt)}m to MRT
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
