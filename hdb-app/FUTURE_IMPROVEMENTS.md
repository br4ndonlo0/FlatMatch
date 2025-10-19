## Future Improvements (Finder & Data Layer)

This file lists potential follow‑ups and optimizations that were intentionally deferred to keep the current feature delivery lean and debuggable.

### 1. Hospital / Healthcare Dimension
Currently the hospital weight is hard‑coded to 0 and `loadHospitals()` returns an empty array. To enable:
1. Identify a stable dataset (A&E hospitals or polyclinics) with reliable addresses.
2. Implement `loadHospitals()` mirroring the school loader (with geocode caching).
3. Add a UI slider back for hospital weight only once data quality is verified (avoid misleading scores from noisy locations).

### 2. Geocoding Performance & Rate Management
We use OneMap's public search endpoint. Improvements:
* Batch / queue requests (current simple sequential + small delay 60ms). A token bucket limiter could smooth bursts.
* Add exponential backoff on HTTP 429 instead of single 300ms wait.
* Pre-seed geocode cache with a script: `scripts/geocode-flats.ts` that iterates through most recent months & towns, writing to `data/geocode-cache.json`.
* Consider normalizing keys further (strip punctuation) to increase cache hit rate.

### 3. Parallelism Controls
Right now flats are processed serially per API page. We could safely process, say, 5–8 geocode calls concurrently (Promise pool) to reduce latency while staying polite to the API.

### 4. Data Freshness Strategy
* Persist snapshots of flats per day/month in a lightweight JSON (or Mongo) so finder queries operate on pre-geocoded, denormalized documents.
* Add a revalidation job (cron / serverless) to refresh recent months only.

### 5. Enhanced Scoring Tunables
Potential additional signals:
* Price per sqm percentile (contextual vs static band).
* Lease decay non-linear scaling (e.g. heavier penalty once < 60 years).
* Distance curve smoothing (Gaussian or piecewise) instead of linear clamp.
* Floor level desirability curve (mid-floors vs extremes) instead of linear.

### 6. Explainability & UI
Return per-feature normalized sub-scores so the UI can render a breakdown (bar chart) and help users understand rankings.

### 7. Error Telemetry
Introduce lightweight server-side logging abstraction (e.g. pino) with structured JSON logs for easier filtering of geocode failures vs dataset fetch failures.

### 8. Resilience
If geocode failures exceed threshold for a town, fallback to approximate coordinates derived from the town centroid (precomputed) so a partial score can still be produced.

### 9. Caching Layer Abstraction
Wrap the current file cache behind an interface so switching to Redis / KV store becomes trivial later.

### 10. Security / Quotas
Guard the finder API with basic rate limiting (IP or session based) to avoid accidental hammering from rapid UI changes.

---
Feel free to tag items as accepted / rejected or open GitHub issues referencing the numbered sections above.
