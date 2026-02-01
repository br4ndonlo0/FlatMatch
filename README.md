# FlatMatch – HDB Flat Finder

> **Smart HDB flat discovery for Singaporeans** — Fast search, AI-powered scoring, interactive maps, and instant bookmarks.

**FlatMatch** helps you find your perfect resale HDB flat in Singapore with an intelligent scoring system that evaluates affordability and nearby amenities. Built with modern web technologies: Next.js, TypeScript, MongoDB, and Leaflet maps.

## Key Features

- **Smart Search & Filters** — Find flats by town, rooms, price, and custom score thresholds. Filters apply only when you click "Apply" for predictable UX.
- **Intelligent Scoring** — Composite scoring based on affordability metrics and nearby amenities (evaluated server-side in batches for performance).
- **Interactive Maps** — Leaflet-powered detail pages with unit markers, nearby amenities (≤1 km), and OneMap walking routes with estimated times.
- **Bookmarks** — Save your favorite listings and compare them at a glance with computed scores.
- **Responsive Grid** — Infinite-scroll listings with dense, mobile-friendly layout.
- **Personalized Home** — Featured flat recommendations based on your saved preferences (budget, location, flat type).

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS + custom utility classes |
| **Maps & Routing** | Leaflet + react-leaflet (client-side) |
| **Backend** | Next.js API routes, MongoDB with Mongoose |
| **Data Sources** | data.gov.sg (resale dataset), local CSV/GeoJSON |
| **Location Services** | OneMap API (search, routing, proximity) |
| **Auth** | bcryptjs (hashing), jose (JWT/crypto) |

## Dependencies & Requirements

### Prerequisites
- **Node.js** 18–20 (Windows supported)  
- **npm** ≥ 9  
- **MongoDB** connection string (Atlas or local)  
- **OneMap** credentials (recommended for search/routing)

### Installation

```powershell
cd hdb-app
npm install
```

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `next`, `react`, `react-dom` | Core framework |
| `mongoose` | MongoDB ODM |
| `leaflet`, `react-leaflet` | Interactive maps |
| `axios`, `papaparse` | HTTP & CSV parsing |
| `proj4` | Coordinate transforms (SVY21 ↔ WGS84) |
| `bcryptjs`, `jose` | Security (hashing, JWT) |
| `dotenv` | Environment variables |

### Development Dependencies

```bash
typescript, eslint, @types/node, @types/react
tailwindcss, @tailwindcss/postcss
tsx, csv-parse, p-limit
@types/leaflet  # Optional but recommended
```

**Note:** If you see missing type hints for Leaflet, run:
```powershell
npm i -D @types/leaflet
```

## Project Structure

```
2006-Project-HDB-Finder/
├── hdb-app/
│   ├── src/app/
│   │   ├── (display)/
│   │   │   ├── listing/page.tsx          # Listings grid + search/filters
│   │   │   ├── listing/[id]/page.tsx     # Detail view + Leaflet map
│   │   │   └── bookmarks/page.tsx        # Saved flats
│   │   ├── home/page.tsx                 # Featured sections
│   │   ├── api/
│   │   │   ├── hdbdata/route.ts          # Resale data (paged)
│   │   │   ├── score-batch/route.ts      # Batch scoring
│   │   │   ├── userinfo/route.ts         # User profiles
│   │   │   ├── bookmarks/route.ts        # Bookmark CRUD
│   │   │   ├── onemap/                   # OneMap API proxies
│   │   │   ├── sg/amenities/route.ts     # Local amenity lookups
│   │   │   └── coords/route.ts           # Geocoding helpers
│   │   ├── (auth)/, auth/, logout/       # Authentication flows
│   │   └── globals.css
│   ├── lib/                              # Utilities: geocoding, scoring, loaders
│   ├── models/                           # Mongoose schemas (User, Bookmark)
│   ├── data/                             # CSV/GeoJSON datasets
│   ├── components/                       # React components
│   └── package.json
└── README.md
```

## Quick Start

### 1. Install Dependencies
```powershell
cd hdb-app
npm install
```

### 2. Configure Environment
Create `hdb-app/.env.local`:

```env
# MongoDB connection (required)
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# OneMap API – Choose ONE approach:

# Option A: Static Token (simplest)
ONEMAP_TOKEN=<your-static-token>

# Option B: Credentials (token auto-fetched & cached)
ONEMAP_EMAIL=<your-email>
ONEMAP_PASSWORD=<your-password>

# Optional
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Allow MongoDB Atlas IP
If using **MongoDB Atlas**, whitelist your IP:
1. Log in to Atlas → Your Project → **Network Access**
2. Click **"Add IP Address"** → **"Add Current IP Address"**
3. (Optional) Name it (e.g., `dev-laptop`)
4. Save and wait 30 seconds

> **Note:** Residential IPs change; re-whitelist if connectivity drops.  
> **Security:** Avoid `0.0.0.0/0` except for quick testing.

### 4. Start Development Server
```powershell
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```powershell
npm run build
npm start
```

### OneMap API Setup

#### Step 1 - Register
Visit [https://www.onemap.gov.sg/](https://www.onemap.gov.sg/) and create a free account.

#### Step 2 - Choose Your Approach
| Approach | Setup Time | Pros | Cons |
|----------|-----------|------|------|
| **Static Token** | 5 min | Simple, no dependencies | Manual renewal needed |
| **Credentials** | 2 min | Auto-refreshed token | Stores email/password |

#### Step 3 - Verify Your Credentials (Optional)
Test with PowerShell (no app needed):
```powershell
$body = @{ email = '<your-email>'; password = '<your-password>' } | ConvertTo-Json
Invoke-RestMethod `
  -Uri 'https://www.onemap.gov.sg/api/auth/post/getToken' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body
```

You should see an `access_token` in the response.

#### Step 4 - Use in Your App
The backend automatically calls OneMap APIs via proxied endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/onemap/search?query=<text>` | Search locations |
| `GET /api/onemap/nearby?lat=<lat>&lng=<lng>&dist=<meters>` | Find nearby amenities |
| `GET /api/onemap/route?start=<lat,lng>&end=<lat,lng>&routeType=walk` | Walking route & time |

**Note on Token Renewal:** On 401/403 from OneMap, the app refreshes (static) or re-verifies credentials (dynamic). For production, consider periodic proactive refresh.

For full OneMap docs, see:
- [Authentication](https://www.onemap.gov.sg/docs/#authentication)
- [Search API](https://www.onemap.gov.sg/docs/#search)
- [Route Planning](https://www.onemap.gov.sg/docs/#route-planning)

## How It Works

### Search & Filter Workflow
1. Enter a **town name** and click **"Search"** to load listings
2. Set **Rooms**, **Price (Min/Max)**, and **Min Score**
3. Click **"Apply filters"** — filters only apply now (predictable UX)
4. Scroll infinitely to load more results
5. Scores appear on each card (computed in batches server-side)

### Bookmarks
1. Click **"Add to Bookmarks"** on any listing card or detail page
2. View all bookmarks at `/bookmarks`
3. Scores are fetched in a single batch request

### Detail View with Maps
1. Click a flat to view full details
2. See an **interactive Leaflet map** with:
   - Exact unit location
   - Nearby amenities (≤ 1 km: MRT, hawker, parks, schools, etc.)
   - Walking route & estimated time via OneMap
3. All OneMap calls are proxied through the backend (secrets stay safe)

## API Reference

### Core Endpoints

| Method | Endpoint | Purpose | Query/Body |
|--------|----------|---------|-----------|
| `GET` | `/api/hdbdata` | Fetch resale records (paged) | `offset`, `limit`, `town?`, `q?` |
| `POST` | `/api/score-batch` | Score multiple flats | `{ items: [...] }` |
| `GET` | `/api/userinfo` | Read user profile | — |
| `POST` | `/api/userinfo` | Update user profile | `{ field: value }` |
| `GET` | `/api/bookmarks` | List saved flats | `username=<username>` |
| `POST` | `/api/bookmarks` | Add bookmark | `{ username, bookmark }` |
| `DELETE` | `/api/bookmarks` | Remove bookmark | `{ username, compositeKey }` |

### OneMap Proxies

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/onemap/search` | Search locations by name |
| `GET` | `/api/onemap/nearby` | Find amenities near a point |
| `GET` | `/api/onemap/route` | Calculate walking route & time |

### Local Data Helpers

| Endpoint | Purpose |
|----------|---------|
| `/api/sg/amenities` | GeoJSON-based amenity lookup |
| `/api/coords` | CSV-based geocoding |

**See `/lib`** for utility functions: scoring, geocoding, batch loading, etc.

## Data & Scoring

- **Data Sources:** `/data` contains CSV and GeoJSON files for geocoding and amenity lookups
- **Fast Lookups:** `lib/geocode.ts` builds in-memory indexes once (subsequent lookups are O(1))
- **Smart Caching:** `score-batch` endpoint caches results (with TTL) and memoizes nearest distances per address
- **Scoring Algorithm:** Composite score based on:
  - **Affordability:** Proximity to price thresholds
  - **Amenities:** Distance to schools, MRT, parks, healthcare, hawker centers, etc.

## Troubleshooting

### Windows: EPERM Error on `.next/trace`
**Problem:** Locked file from stray Node process during development.

**Solution:**
```powershell
# Kill all Node processes
taskkill /F /IM node.exe

# Remove build cache
Remove-Item -Recurse -Force .next

# Restart dev server
npm run dev
```

### Leaflet CSS Not Loading
**Problem:** Styles missing from Leaflet map; CSS import errors in console.

**Solution:**
- **Don't** import `leaflet/dist/leaflet.css` inside page components
- **Do** load CSS globally (via `<link>` in `app/layout.tsx`) or use a route-level `head.tsx`
- **Do** install types: `npm i -D @types/leaflet`

### MongoDB Connection Fails
**Problem:** `MongooseError` or `getaddrinfo ENOTFOUND` when connecting to Atlas.

**Checklist:**
- IP address whitelisted in MongoDB Atlas **Network Access**
- Connection string format: `mongodb+srv://user:pass@cluster.mongodb.net/db`
- Credentials have no special characters (URL-encode if needed: `@` → `%40`)
- `.env.local` has `MONGODB_URI` (not `DATABASE_URL`)
- Network allows outbound HTTPS (port 443)

### OneMap 401/403 Errors
**Problem:** Unauthorized access to OneMap API.

**Solution:**
- Verify credentials: run PowerShell test (see OneMap setup section)
- Check token expiry (static tokens may need manual renewal)
- For dynamic credentials, ensure email/password are correct and account is active

## Security & Sessions

### Current Implementation
- Demo mode: **localStorage** simulation (stores `username` in browser)
- **Not suitable for production**

### Production Recommendations
- Use a proper auth library (e.g., **NextAuth.js**, **Auth0**, **Supabase**)
- Implement **secure server-side session checks** in API routes
- Store sensitive tokens in **HTTP-only cookies**
- Add CSRF protection and rate limiting
- Use environment variables for API secrets (never expose in frontend)

## Workflow Diagrams

### Bookmark a Flat

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Listings UI
    participant API as /api/bookmarks
    participant Repo as Bookmark Model
    participant DB as MongoDB

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
	participant DB as MongoDB

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

## Roadmap & Future Improvements

- [ ] **Proper Authentication** — Integrate NextAuth.js or similar
- [ ] **Server-Side Rendering** — Pre-render Featured sections for better SEO
- [ ] **Advanced Sorting** — Sort by price, date, score, or distance to location
- [ ] **Search Relevance** — Boost scores based on user preferences
- [ ] **Unit Tests** — Coverage for scoring, geocoding, and API contracts
- [ ] **CI/CD Pipeline** — GitHub Actions for automated testing and deployment
- [ ] **Performance** — Implement data pagination and caching strategies
- [ ] **Amenity Customization** — Let users weight amenities differently in scoring

See [FUTURE_IMPROVEMENTS.md](./hdb-app/FUTURE_IMPROVEMENTS.md) for detailed ideas.

## License

MIT © 2025 SCSD-20

---

**Built for Singapore HDB seekers** | [Report an issue](https://github.com/YAROUDIO/2006-Project-HDB-Finder/issues)