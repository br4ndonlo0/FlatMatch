# FlatMatch (HDB Finder)

Discover Singapore resale HDB flats with fast search, smart scoring, maps, and bookmarks. Built with Next.js App Router, TypeScript, MongoDB, and Leaflet.

## Features

- Listings with infinite scroll and a dense, responsive grid
- Town search + filters (Rooms, Price Min/Max, Min Score)
	- Filters only apply after you click “Apply filters” (predictable UX)
	- “Search” button updates the town without auto-filtering
- Amenity- and affordability-based scoring (batch scored for performance)
- Bookmarks: save listings and view them with scores
- Detail view with interactive Leaflet map, nearby amenities (≤1 km), and walking routes/time via OneMap
- Personalized Featured on Home using your user info (budget/area/flat type)

## Tech stack

- Framework: Next.js (App Router), React 19, TypeScript
- Styling: Tailwind CSS (globals) + custom utility classes
- Data: data.gov.sg (resale dataset), local CSV/GeoJSON in `/data`
- Maps: Leaflet + react-leaflet (client only)
- Backend: Next.js API routes, MongoDB with Mongoose

## Project layout (high level)

```
2006-Project-HDB-Finder/
	hdb-app/
		src/app/
			(display)/listing/page.tsx         # Listings grid, search & filters
			(display)/listing/[id]/page.tsx    # Listing detail + map/amenities
			(display)/bookmarks/page.tsx       # Bookmarked listings
			home/page.tsx                      # Featured sections
			api/
				hdbdata/route.ts                 # Resale data fetch (paged)
				score-batch/route.ts             # Batch scoring endpoint
				userinfo/route.ts                # Read/update user profile
				bookmarks/route.ts               # Add/list/remove bookmarks
				onemap/                          # Search, nearby, route proxies
				sg/amenities/route.ts            # Local GeoJSON amenity lookup
				coords/route.ts                  # Local CSV-based geocoding
		lib/                                 # Geocode, loaders, scoring, etc.
		models/                              # Mongoose models (User, Bookmark)
		data/                                # CSV/GeoJSON datasets
```

## Getting started

### Prerequisites

- Node.js 18–20 (Windows supported). npm ≥ 9
- A MongoDB connection string (Atlas or local)
- OneMap credentials (recommended) or a static token

### Setup

1) Install dependencies

```powershell
cd hdb-app
npm install
```

2) Create `hdb-app/.env.local`

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# Option A: static token (simplest)
ONEMAP_TOKEN=<token>

# Option B: credentials (token will be fetched and cached)
ONEMAP_EMAIL=<your-email>
ONEMAP_PASSWORD=<your-password>

# Optional
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

3) Run the app

```powershell
npm run dev
```

Build & start (production):

```powershell
npm run build
npm start
```

## Key flows

### Listings

- Use the town input + Search to load listings for a town
- Set Rooms, Price Min/Max, and Min Score, then click “Apply filters”
	- Filters don’t apply until you click Apply
	- Infinite scroll loads subsequent pages
- Score pills appear on cards (computed server-side in batches)

### Bookmarks

- Click “Add to Bookmarks” on a listing card or detail page
- View saved items at `/bookmarks`; scores are fetched in one batch

### Listing detail (maps)

- Leaflet map with: unit marker, nearby amenities (≤ 1 km), and walking route/time
- OneMap APIs are wrapped by server routes to avoid exposing secrets

## API overview

- `GET /api/hdbdata` — Paged resale records
	- Query: `offset`, `limit`, `q?`, `town?`
	- Returns: `records[]`
- `POST /api/score-batch` — Batch scoring
	- Body: `{ items: [{ block, street_name, flat_type, town?, month, resale_price }] }`
	- Returns: `{ results: [{ compositeKey, score }] }`
- `GET /api/userinfo` — Read profile
- `POST /api/userinfo` — Update profile (partial fields OK)
- `GET /api/bookmarks?username=...` — List bookmarks
- `POST /api/bookmarks` — Add `{ username, bookmark }` (prevent duplicates)
- `DELETE /api/bookmarks` — Remove `{ username, compositeKey }`
- OneMap proxies: `/api/onemap/search`, `/api/onemap/nearby`, `/api/onemap/route`
- Local data helpers: `/api/coords`, `/api/sg/amenities`

## Data & scoring

- `/data` contains CSV/GeoJSON used for geocoding and amenity lookups
- `lib/geocode.ts` builds in-memory indexes once (fast repeated lookups)
- `score-batch` caches results (TTL) and memoizes nearest distances per address

## Troubleshooting (Windows tips)

### EPERM: `.next/trace` during dev

This is usually a locked file from a stray Node process.

```powershell
taskkill /F /IM node.exe
Remove-Item -Recurse -Force .next
npm run dev
```

### Leaflet CSS import error

- Do not import `leaflet/dist/leaflet.css` inside a page component
- Load CSS once globally (e.g., via a `<link>` in `app/layout.tsx` head), or use a route-level `head.tsx` for the detail page
- Types: `npm i -D @types/leaflet`

## Security & sessions

- Current demo checks `localStorage` for `username` to simulate a session
- For production, use a proper auth solution (e.g., NextAuth) and secure server-side checks in API routes

## Diagrams (sequence examples)

Bookmark flat:

```mermaid
sequenceDiagram
	autonumber
	actor User
	participant UI as Listings UI
	participant API as /api/bookmarks
	participant Repo as Bookmark Model
	database DB as MongoDB

	User->>UI: Click Add to Bookmarks
	UI->>API: POST { username, bookmark }
	API->>Repo: findOne(username)
	Repo->>DB: Query
	DB-->>Repo: entry or null
	alt Duplicate compositeKey
		API-->>UI: 409 Already bookmarked
		UI->>UI: Mark as Bookmarked
	else New
		Repo->>DB: Insert
		DB-->>Repo: OK
		API-->>UI: { success: true }
		UI->>UI: Mark as Bookmarked
	end
```

Manage user information:

```mermaid
sequenceDiagram
	autonumber
	actor User
	participant UI as User Info Page
	participant API as /api/userinfo
	participant Model as User Model
	database DB as MongoDB

	User->>UI: Open /userinfo
	UI->>API: GET profile
	API->>Model: findOne
	Model->>DB: Query
	DB-->>Model: Profile
	API-->>UI: { success, profile }
	User->>UI: Edit fields
	UI->>API: POST changed fields
	API->>Model: findOneAndUpdate
	Model->>DB: Update
	DB-->>Model: Updated
	API-->>UI: { success, updated }
	UI-->>User: “Saved”
```

## Roadmap / ideas

- Proper auth/session and per-user security on APIs
- Server-side rendering for Featured sections
- Search relevance boosts and sort options
- Unit tests for scoring, geocoding, and API contracts

## License

MIT

# 2006-SCSD-20