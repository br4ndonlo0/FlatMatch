"use client";
import { useState, useEffect, useMemo } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState as useClientState } from "react";
import AffordabilityWidget from "@/components/AffordabilityWidget";
import { parseRemainingLeaseYears, parseCurrencyToNumber } from "@/lib/affordability";

// === Mapping libs (client only) ===
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression } from "leaflet";
import { useMap } from "react-leaflet";

// lazy-load react-leaflet to avoid SSR issues
const MapContainer  = dynamic(() => import("react-leaflet").then(m => m.MapContainer),  { ssr: false });
const TileLayer     = dynamic(() => import("react-leaflet").then(m => m.TileLayer),      { ssr: false });
const Marker        = dynamic(() => import("react-leaflet").then(m => m.Marker),         { ssr: false });
const Tooltip       = dynamic(() => import("react-leaflet").then(m => m.Tooltip),        { ssr: false });
const Polyline      = dynamic(() => import("react-leaflet").then(m => m.Polyline),       { ssr: false });
const CircleMarker  = dynamic(() => import("react-leaflet").then(m => m.CircleMarker),   { ssr: false });

import L from "leaflet";
// fix default marker icon paths in Next
// @ts-ignore
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
// @ts-ignore
import markerIcon from "leaflet/dist/images/marker-icon.png";
// @ts-ignore
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: (markerIcon2x as any)?.src ?? markerIcon2x,
  iconUrl: (markerIcon as any)?.src ?? markerIcon,
  shadowUrl: (markerShadow as any)?.src ?? markerShadow,
});

function makePin(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 25 41">
      <path d="M12.5 0c6.9 0 12.5 5.6 12.5 12.5 0 9.4-12.5 28.5-12.5 28.5S0 21.9 0 12.5C0 5.6 5.6 0 12.5 0z" fill="${color}"/>
      <circle cx="12.5" cy="12.5" r="5.5" fill="white"/>
    </svg>`;
  return new L.Icon({
    iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [1, -34],
  });
}

interface HDBRecord {
  _id: string | number;
  month: string;
  town: string;
  flat_type: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: string;
  flat_model: string;
  lease_commence_date: string;
  remaining_lease: string;
  resale_price: string;
}

function parseCompositeKey(key: string) {
  // decode entire key once
  const once = decodeURIComponent(key);
  // support 4-part and 5-part (legacy) keys
  const parts = once.split("__").map((seg) => {
    try {
      return decodeURIComponent(seg);
    } catch {
      return seg;
    }
  });

  if (parts.length < 4) {
    return { block: "", street_name: "", flat_type: "", month: "", offset: "0" };
  }

  const [b, s, f, m, o] = [parts[0], parts[1], parts[2], parts[3], parts[4] ?? "0"];
  return { block: b, street_name: s, flat_type: f, month: m, offset: o };
}

async function getHDBRecordByCompositeKey(key: string) {
  const { block, street_name, flat_type, month } = parseCompositeKey(key);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(
    `${baseUrl}/api/hdbdata?lookup=1&block=${encodeURIComponent(block)}&street_name=${encodeURIComponent(
      street_name
    )}&flat_type=${encodeURIComponent(flat_type)}&month=${encodeURIComponent(month)}`,
    { cache: "no-store" }
  );
  const data = await res.json();
  return Array.isArray(data?.records) ? data.records[0] ?? null : null;
}

// ===== Map helpers & server APIs =====
type NearbyStop = { id: string; name: string; lat: number; lon: number; road?: string };
type GenericAmenity = { id: string; name: string; lat: number; lon: number; type: string };

/** Local-first geocoder via your CSV; optional OneMap fallback if you created it */
async function geocodeLocalFirst(block: string, street: string) {
  try {
    const r = await fetch(`/api/coords?block=${encodeURIComponent(block)}&street=${encodeURIComponent(street)}`);
    if (r.ok) {
      const j = await r.json();
      if (j?.result) return j.result as { lat: number; lon: number };
    }
  } catch {}
  try {
    const addr = `${block} ${street}, Singapore`;
    const r2 = await fetch(`/api/onemap/search?query=${encodeURIComponent(addr)}`);
    if (r2.ok) {
      const j2 = await r2.json();
      if (j2?.result) return j2.result as { lat: number; lon: number };
    }
  } catch {}
  return null;
}

// OneMap transport + routing (server proxies)
async function fetchNearbyTransportServer(lat: number, lon: number, radius = 1000) {
  const r = await fetch(`/api/onemap/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
  if (!r.ok) return { bus: [], mrt: [] };
  return (await r.json()) as { bus: NearbyStop[]; mrt: NearbyStop[] };
}
async function fetchWalkRouteServer(from: {lat:number;lon:number}, to: {lat:number;lon:number}) {
  const r = await fetch(`/api/onemap/route?start=${from.lat},${from.lon}&end=${to.lat},${to.lon}&type=walk`);
  if (!r.ok) return { poly: [], totalTimeSec: null, totalDistM: null };
  return await r.json();
}

// data.gov (local GeoJSON files in /data), normalized by your /api/sg/amenities route
async function fetchDataGovAmenitiesServer(type: string, lat: number, lon: number, radius = 1000) {
  const r = await fetch(`/api/sg/amenities?type=${encodeURIComponent(type)}&lat=${lat}&lon=${lon}&radius=${radius}`);
  if (!r.ok) return { features: [] as GenericAmenity[] };
  return (await r.json()) as { features: GenericAmenity[] };
}

// Haversine (meters)
function haversineMeters(lat1:number, lon1:number, lat2:number, lon2:number) {
  const toRad = (d:number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// recenter helper
function RecenterOnUnit({ center, zoom = 17 }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, zoom, { animate: true }); }, [center, zoom, map]);
  return null;
}

// colors (malls & carparks skipped)
const COLOR = {
  bus: "#2E7D32",
  mrt: "#D32F2F",
  Schools: "#1565C0",
  Clinics: "#EF6C00",
  Supermarkets: "#1B5E20",
  HawkerCentres: "#795548",
  Parks: "#2E7D32",
  Libraries: "#00838F",
  CommunityClubs: "#F9A825",
} as const;

// icons for amenity pins (MRT has its own red pin)
const ICONS = {
  Schools: makePin(COLOR.Schools),
  Clinics: makePin(COLOR.Clinics),
  Supermarkets: makePin(COLOR.Supermarkets),
  HawkerCentres: makePin(COLOR.HawkerCentres),
  Parks: makePin(COLOR.Parks),
  Libraries: makePin(COLOR.Libraries),
  CommunityClubs: makePin(COLOR.CommunityClubs),
};

export default function ListingDetailPage() {
  const params = useParams();
  const id =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const [record, setRecord] = useState<HDBRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useClientState(false);
  const [showAffordabilityError, setShowAffordabilityError] = useState(false);

  const getUsername = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("username") || "";
    }
    return "";
  };
  const router = useRouter();

  const getUsernameNow = () => getUsername();
  const usernameNow = getUsernameNow();

  // === Map & amenities state ===
  const [amenity, setAmenity] = useState<
    "Transport" | "Schools" | "Clinics" | "Supermarkets" | "HawkerCentres" | "Parks" | "Libraries" | "CommunityClubs"
  >("Transport");

  const [unitPos, setUnitPos] = useState<{lat:number;lon:number}|null>(null);
  const [busStops, setBusStops] = useState<NearbyStop[]>([]);
  const [mrtStops, setMrtStops] = useState<NearbyStop[]>([]);
  const [themeFeatures, setThemeFeatures] = useState<GenericAmenity[]>([]);
  const [routeLine, setRouteLine] = useState<[number,number][]>([]);
  const [selected, setSelected] = useState<{id:string; name:string; type:string; timeMin:number; distM:number} | null>(null);

  // loading flags for "no amenities within 1km" alert
  const [transportLoaded, setTransportLoaded] = useState(false);
  const [amenityLoaded, setAmenityLoaded] = useState(false);

  const mapCenter = useMemo<LatLngExpression>(() => {
    if (unitPos) return [unitPos.lat, unitPos.lon] as LatLngExpression;
    return [1.3521, 103.8198] as LatLngExpression; // SG fallback
  }, [unitPos]);

  const mrtIcon = useMemo(() => makePin(COLOR.mrt), []);

  useEffect(() => {
    (async () => {
      const rec = await getHDBRecordByCompositeKey(id);
      setRecord(rec);
      setLoading(false);
      const username = getUsername();
      if (username && rec) {
        try {
          const res = await fetch(`/api/bookmarks?username=${encodeURIComponent(username)}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.bookmarks)) {
            const decodedId = decodeURIComponent(id);
            const found = data.bookmarks.some((b: any) => b.compositeKey === decodedId);
            setIsBookmarked(found);
          }
        } catch {}
      }

      // Map bootstrap
      if (rec) {
        const pos = await geocodeLocalFirst(rec.block, rec.street_name);
        if (pos) {
          setUnitPos(pos);
          try {
            const t = await fetchNearbyTransportServer(pos.lat, pos.lon, 1000);
            const within1km = (s: NearbyStop) => {
              try { return haversineMeters(pos.lat, pos.lon, s.lat, s.lon) <= 1000; }
              catch { return true; }
            };
            setBusStops((t.bus || []).filter(within1km));
            setMrtStops((t.mrt || []).filter(within1km));
          } finally {
            setTransportLoaded(true);
          }
        } else {
          setTransportLoaded(true);
          setError("Could not geocode flat address from local dataset or OneMap.");
        }
      }
    })();
  }, [id]);

  // Fetch data.gov amenities when amenity changes (non-transport)
  useEffect(() => {
    (async () => {
      if (!unitPos) return;
      if (amenity === "Transport") {
        setThemeFeatures([]);
        setAmenityLoaded(false);
        return;
      }
      setAmenityLoaded(false);
      const res = await fetchDataGovAmenitiesServer(amenity, unitPos.lat, unitPos.lon, 1000);
      const feats = (res.features || []).filter(f => haversineMeters(unitPos.lat, unitPos.lon, f.lat, f.lon) <= 1000);
      setThemeFeatures(feats);
      setRouteLine([]);
      setSelected(null);
      setAmenityLoaded(true);
    })();
  }, [amenity, unitPos]);

  async function computeAndShowRoute(target: {id:string; name:string; lat:number; lon:number}, type: string) {
    if (!unitPos) return;
    const r = await fetchWalkRouteServer(unitPos, { lat: target.lat, lon: target.lon });
    if (r.totalTimeSec != null && r.totalDistM != null) {
      setSelected({
        id: target.id,
        name: target.name,
        type,
        timeMin: Math.round(r.totalTimeSec / 60),
        distM: Math.round(r.totalDistM),
      });
    }
    setRouteLine(r.poly || []);
  }

  const handleAddBookmark = async () => {
    if (!record) return;
    const username = getUsername();
    if (!username) {
      setError("Not logged in");
      return;
    }
    setAdding(true);
    setError("");
    const compositeKey = id; // keep the original encoded key
    const bookmark = {
      block: record.block,
      street_name: record.street_name,
      flat_type: record.flat_type,
      month: record.month,
      resale_price: record.resale_price,
      compositeKey,
    };
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, bookmark }),
      });
      const data = await res.json();
      if (data.success) {
        setIsBookmarked(true);
      } else {
        setError(data.error || "Failed to add bookmark");
      }
    } catch (e) {
      setError("Failed to add bookmark");
    }
    setAdding(false);
  };

  const handleRemoveBookmark = async () => {
    const username = getUsername();
    if (!username) return;
    setAdding(true);
    setError("");
    const compositeKey = id;
    try {
      const res = await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, compositeKey }),
      });
      const data = await res.json();
      if (data.success) {
        setIsBookmarked(false);
      } else {
        setError(data.error || "Failed to remove bookmark");
      }
    } catch (e) {
      setError("Failed to remove bookmark");
    }
    setAdding(false);
  };

  if (loading)
    return <div className="min-h-screen flex items-center justify-center bg-[#e0f2ff]">Loading...</div>;
  if (!record) return notFound();

  // ===== no-results alert logic =====
  const transportCount = busStops.length + mrtStops.length;
  const nonTransportCount = themeFeatures.length;
  const showNoResults =
    unitPos &&
    ((amenity === "Transport" && transportLoaded && transportCount === 0) ||
     (amenity !== "Transport" && amenityLoaded && nonTransportCount === 0));

  return (
    <div style={{ background: "#e0f2ff", minHeight: "100vh", width: "100%" }}>
      {/* Top Bar with Dropdown Navigation - sticky at top of viewport */}
      <div className="w-full bg-blue-900 text-white flex items-center px-6 py-4 relative shadow-md sticky top-0 z-50">
        <button
          className="mr-4 focus:outline-none"
          onClick={() => setNavOpen((open: boolean) => !open)}
          aria-label="Open navigation menu"
        >
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-2xl font-bold tracking-wide">HDBFinder</span>
        <Link href="/home" className="absolute right-6 top-1/2 -translate-y-1/2">
          <button className="bg-white text-blue-900 font-bold px-5 py-2 rounded-full shadow hover:bg-blue-100 transition-colors border-2 border-blue-900">
            Home
          </button>
        </Link>
        {navOpen && (
          <div className="absolute left-0 top-full mt-2 w-56 bg-white text-blue-900 rounded-lg shadow-lg z-50 border border-blue-200 animate-fade-in">
            {getUsername() ? (
              <>
                <Link href="/account" className="block px-6 py-3 hover:bg-blue-50">Account</Link>
                <Link href="/userinfo" className="block px-6 py-3 hover:bg-blue-50">User Info</Link>
                <Link href="/logout" className="block px-6 py-3 hover:bg-blue-50">Logout</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-6 py-3 hover:bg-blue-50">Login</Link>
                <Link href="/register" className="block px-6 py-3 hover:bg-blue-50">Register</Link>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-12 px-4">
        {/* Details Card */}
        <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-2xl border-2 border-blue-200 relative mt-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-blue-900">
              {record.town}, {record.flat_type}
            </h1>
            <button
              className={
                `ml-4 px-5 py-2 rounded-full font-semibold text-sm border-2 transition-colors duration-200 ` +
                (isBookmarked
                  ? "bg-yellow-400 border-yellow-400 text-white shadow-md"
                  : "bg-white border-yellow-400 text-yellow-500 hover:bg-yellow-100")
              }
              style={{ zIndex: 10 }}
              tabIndex={0}
              aria-label={isBookmarked ? "Remove Bookmark" : "Add to Bookmarks"}
              onClick={adding ? undefined : isBookmarked ? handleRemoveBookmark : handleAddBookmark}
              disabled={adding}
            >
              {adding ? (isBookmarked ? "Removing..." : "Adding...") : isBookmarked ? "Bookmarked" : "Add to Bookmarks"}
            </button>
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <div className="text-3xl font-semibold mb-6 text-blue-700">${record.resale_price}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-lg" style={{ color: "#000" }}>
            <div>
              <span className="font-semibold">Block:</span> {record.block}
            </div>
            <div>
              <span className="font-semibold">Street:</span> {record.street_name}
            </div>
            <div>
              <span className="font-semibold">Storey:</span> {record.storey_range}
            </div>
            <div>
              <span className="font-semibold">Floor Area:</span> {record.floor_area_sqm} sqm
            </div>
            <div>
              <span className="font-semibold">Model:</span> {record.flat_model}
            </div>
            <div>
              <span className="font-semibold">Lease Commence:</span> {record.lease_commence_date}
            </div>
            <div>
              <span className="font-semibold">Remaining Lease:</span> {record.remaining_lease}
            </div>
            <div>
              <span className="font-semibold">Month:</span> {record.month}
            </div>
          </div>

          {/* Affordability Widget */}
          <div className="mt-6">
            <AffordabilityWidget
              price={parseCurrencyToNumber(record.resale_price) ?? 0}
              remainingLeaseYears={parseRemainingLeaseYears(record.remaining_lease)}
              onMissingUserInfo={() => setShowAffordabilityError(true)}
            />
          </div>
        </div>

        {/* ===== INTERACTIVE MAP (between details card and buttons) ===== */}
        <div className="w-full max-w-5xl mt-10">
          {/* Header row(s) + Route card side-by-side (desktop); aligns top with "Amenity type" and bottom with nearby header */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] grid-rows-[auto_auto] gap-3 items-start">
            {/* Amenity selector (row 1, col 1) */}
            <div className="mb-1">
              <label className="block font-semibold text-blue-900 mb-1">Amenity type</label>
              <select
                className="px-3 py-2 border border-blue-300 rounded-lg bg-white text-blue-900"
                value={amenity}
                onChange={(e) => setAmenity(e.target.value as any)}
              >
                <option value="Transport">Transport (MRT & Bus)</option>
                <option value="Schools">Schools</option>
                <option value="Clinics">Clinics / Polyclinics</option>
                <option value="Supermarkets">Supermarkets</option>
                <option value="HawkerCentres">Hawker Centres</option>
                <option value="Parks">Parks</option>
                <option value="Libraries">Libraries</option>
                <option value="CommunityClubs">Community Clubs</option>
              </select>
            </div>

            {/* Route Summary card (row-span 2, col 2) */}
            <div className="md:row-span-2 md:col-start-2">
              <div className="h-full min-h-[92px] rounded-2xl border-2 border-blue-200 bg-white shadow px-4 py-3">
                <div className="text-blue-900 font-semibold">Route summary</div>
                {selected ? (
                  <div className="mt-1 text-blue-900">
                    <div className="font-medium truncate">{selected.name}</div>
                    <div className="text-sm opacity-70 mb-1">{selected.type}</div>
                    <div>
                      Walk: <span className="font-semibold">{selected.timeMin} min</span>
                      {" • "}
                      <span className="font-semibold">{selected.distM} m</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-blue-900/80">Click any marker to see walking time & distance.</div>
                )}
              </div>
            </div>

            {/* Nearby header (row 2, col 1) */}
            <h2 className="text-2xl font-bold text-blue-900 mb-1">
              {amenity === "Transport" ? "Nearby Transport (≤ 1 km)" : "Nearby Amenities (≤ 1 km)"}
            </h2>
          </div>

          {/* No-results callout */}
          {showNoResults && (
            <div className="mt-2 mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
              No <span className="font-semibold">{amenity}</span> found within 1 km of this flat.
            </div>
          )}

          <div className="rounded-2xl overflow-hidden border-2 border-blue-200 shadow">
            <div style={{ height: 460, width: "100%", background: "#cfe8ff" }}>
              {typeof window !== "undefined" && (
                <MapContainer
                  key={unitPos ? `${unitPos.lat},${unitPos.lon}:${amenity}` : `init:${amenity}`}
                  center={mapCenter}
                  zoom={16}
                  style={{ height: "100%", width: "100%" }}
                >
                  {/* Recenter on unit */}
                  {unitPos && <RecenterOnUnit center={[unitPos.lat, unitPos.lon]} zoom={17} />}

                  {/* OneMap raster tiles */}
                  <TileLayer
                    attribution="&copy; OneMap, SLA"
                    url="https://www.onemap.gov.sg/maps/tiles/Original/{z}/{x}/{y}.png"
                  />

                  {/* Unit marker */}
                  {unitPos && (
                    <Marker position={[unitPos.lat, unitPos.lon]}>
                      <Tooltip direction="top" offset={[0, -10]} permanent>
                        {record.block} {record.street_name}
                      </Tooltip>
                    </Marker>
                  )}

                  {/* Transport (bus: circle markers, MRT: red pin markers) */}
                  {amenity === "Transport" && (
                    <>
                      {busStops.map((b) => (
                        <CircleMarker
                          key={`bus-${b.id}`}
                          center={[b.lat, b.lon]}
                          radius={5}
                          pathOptions={{ color: COLOR.bus, fillColor: COLOR.bus, fillOpacity: 0.9 }}
                          eventHandlers={{ click: () => computeAndShowRoute({ id: b.id, name: b.name, lat: b.lat, lon: b.lon }, "Bus Stop") }}
                        >
                          <Tooltip>{`Bus stop: ${b.name}${b.road ? ` (${b.road})` : ""}`}</Tooltip>
                        </CircleMarker>
                      ))}

                      {mrtStops.map((m) => (
                        <Marker
                          key={`mrt-${m.id}`}
                          position={[m.lat, m.lon]}
                          icon={mrtIcon}
                          eventHandlers={{ click: () => computeAndShowRoute({ id: m.id, name: m.name, lat: m.lat, lon: m.lon }, "MRT Station") }}
                        >
                          <Tooltip direction="top">
                            <div className="text-sm">
                              <div className="font-semibold">{m.name}</div>
                              <div>Click to show walking route</div>
                            </div>
                          </Tooltip>
                        </Marker>
                      ))}
                    </>
                  )}

                  {/* Other amenities via data.gov (pin markers like MRT) */}
                  {amenity !== "Transport" && themeFeatures.map((f) => (
                    <Marker
                      key={`${amenity}-${f.id}`}
                      position={[f.lat, f.lon]}
                      icon={ICONS[amenity] ?? undefined}
                      eventHandlers={{ click: () => computeAndShowRoute(f, amenity) }}
                    >
                      <Tooltip>{f.name}</Tooltip>
                    </Marker>
                  ))}

                  {/* Route polyline (from last click) */}
                  {routeLine.length > 0 && (
                    <Polyline positions={routeLine as unknown as LatLngExpression[]} />
                  )}
                </MapContainer>
              )}
            </div>
          </div>

          <p className="text-sm text-blue-900 mt-2">
            Data sources: OneMap tiles & Nearby (MRT/Bus); data.gov.sg (local GeoJSON for other amenities); OneMap walking route/time.
          </p>
        </div>
        {/* ===== END MAP ===== */}

        {/* Buttons (kept after the map) */}
        <div className="flex justify-center gap-8 mt-8">
          <Link href="/listing">
            <button className="px-6 py-3 bg-blue-900 text-white rounded-full font-semibold shadow hover:bg-blue-800 transition-colors">
              View Listings
            </button>
          </Link>
          <Link href="/bookmarks">
            <button className="px-6 py-3 bg-yellow-400 text-blue-900 rounded-full font-semibold shadow hover:bg-yellow-300 transition-colors">
              View Bookmarks
            </button>
          </Link>
        </div>
      </div>

      {/* Affordability Error Popup (preserved, incl. guest back-navigation) */}
      {showAffordabilityError && (
        <div
          className="fixed inset-0 bg-blue-900 bg-opacity-20 flex items-center justify-center z-50"
          onClick={() => {
            if (!usernameNow) router.back();
            else setShowAffordabilityError(false);
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md shadow-2xl border-2 border-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-blue-700 text-4xl">⚠️</span>
              <h2 className="text-2xl font-bold text-blue-900">
                {usernameNow ? "Missing Information" : "Access denied"}
              </h2>
            </div>
            <p className="text-blue-900 mb-6 text-lg">
              {usernameNow
                ? "Fill up userinfo for affordability score!"
                : "You cannot view unit affordability as a guest. Please log in first."}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (!usernameNow) router.back();
                  else setShowAffordabilityError(false);
                }}
                className="w-full px-6 py-3 bg-blue-900 text-white rounded-full font-semibold shadow hover:bg-blue-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}