# Implementation Notes — Weather PWA (Phase 1)

This document records the architectural decisions, implemented features, intentional Phase 2 deferrals, documented deviations from the initial specification, API/caching contracts, and build metrics for **Phase 1** of the Weather PWA.

---

## 1. What Was Implemented (Phase 1)

1. **App Shell & Layout:**
   - SvelteKit 5 architecture using runes (`$state`, `$derived`, `$effect.root`).
   - Mobile-first responsive layout tailored for iOS Safari (tested on 390×844 iPhone viewport) with full `env(safe-area-inset-*)` support.
   - Desktop view centering with constrained maximum width (780–980px).
   - Bottom navigation bar with 4 tabs (Главная, Карта, Избранное, Настройки).

2. **Current Weather Hero:**
   - Large temperature display in °C with Unicode minus sign (`−`).
   - Russian weather condition description derived from WMO weather interpretation codes.
   - Dynamic day/night Meteocons SVG icons based on location sunrise/sunset times.
   - Feels-like temperature, wind speed in m/s with 8-point Russian compass direction, and barometric pressure in mmHg.

3. **Near-Term Precipitation Heuristic:**
   - Deterministic 2-hour precipitation forecast heuristic based on hourly precipitation sums and probabilities.
   - Honest status messages («Без осадков», «Осадки в ближайшие N ч») and a working direct CTA to the `/map` route.

4. **Hourly Rail:**
   - Horizontal scrolling forecast rail featuring «Сейчас» and ≥24 hourly entries.
   - Current hour highlighting, weather condition icons, temperature, and precipitation probability badges.

5. **Forecast View (`/forecast`):**
   - Detailed hourly breakdown table (time, icon, temperature, precipitation, wind).
   - 10-day forecast overview with daily min/max temperatures and condition summaries.

6. **City Search & Geocoding:**
   - `SearchSheet` modal component with 300ms input debounce, activation on ≥2 characters, and maximum 8 results.
   - Location naming formatting (City, Region, Country).
   - Keyboard navigation, request cancellation (`AbortController`) to avoid stale results, and smooth city switching.

7. **Favorites System (`/favorites`):**
   - City storage in `localStorage` storing complete `Location` objects (including timezone and coordinates).
   - Header star toggle on the home screen to add/remove the current location.
   - Favorites list displaying cached temperatures with on-demand background refresh and quick tap-to-select navigation.

8. **Settings Screen (`/settings`):**
   - Location switcher with GPS Geolocation request integration.
   - "Last updated" timestamp display with a manual refresh trigger.
   - Informative About section with license attributions.
   - Contextual iOS Safari PWA installation instructions.

9. **Two-Layer Caching & Offline Support:**
   - Layer 1: Memory-bounded runtime `Map` (capacity cap: 32 entries).
   - Layer 2: Versioned `localStorage` with LRU eviction, capacity cap of 8 cities, and 1 MB storage budget limit.
   - Stale-While-Revalidate (SWR) lifecycle: fresh < 15 min, stale-with-background-refresh < 6 hours, offline display for any age with clear ISO timestamp indication.
   - Robust recovery for malformed JSON and graceful fallback to memory cache on `QuotaExceededError`.

10. **PWA Manifest & Service Worker:**
    - Single-source PWA configuration via `@vite-pwa/sveltekit`.
    - Workbox caching strategy: `NetworkFirst` (3s timeout) for `api.open-meteo.com` API requests, `CacheFirst` for static assets (icons, fonts, images).
    - Standalone display mode, `#F5F7FA` theme color, and offline navigation fallback to the app shell.

11. **Icons & Assets:**
    - Bundled static SVG weather icons from Bas Milius' Meteocons subset in `static/icons/weather/`.
    - Original app icon SVG (`static/icons/app/icon-source.svg`) rendered to PNGs (180x180 Apple touch icon, 192x192, 512x512, and 512x512 maskable with safe-zone inset).
    - CI automated validation script (`scripts/check-icons.mjs` / `npm run check:icons`) enforcing numeric safe-zone pixel limits (radius ≤ 0.4 × size).

12. **Deployment Automation:**
    - GitHub Actions workflow (`.github/workflows/deploy.yml`) for automated testing, linting/checking, and artifact deployment to GitHub Pages.
    - Example `Caddyfile` for zero-Node.js static server / VPS fallback.

---

## 2. Intentionally Deferred to Phase 2

As specified in Phase 1 scope (§44) and the Phase 1 Design Document:

- **Details Screen Metrics Card:** Expanded atmospheric metrics (UV index, air quality index, detailed humidity / dew point breakdown) deferred to Phase 2.
- **Precipitation SVG Chart:** Interactive 24-hour precipitation curve chart deferred to Phase 2.
- **Dark Theme:** v1 ships with a polished, consistent Light Theme; dark mode toggle deferred to Phase 2 (settings state structure is prepared for Phase 2).
- **MapLibre Interactive Map:** Interactive radar map is deferred to Phase 2. In Phase 1, the `/map` route is a prerendered placeholder displaying an honest message («Карта — в следующей версии») with functional navigation, preventing 404 errors while keeping MapLibre GL JS out of the Phase 1 bundle.
- **Inline Day Accordion Expansion:** Deep accordion drill-down on `/forecast` deferred to Phase 2.

---

## 3. Documented Deviations

1. **Service Worker Filename (`sw.js` vs `service-worker.js`):**
   - *Specification (§4.4):* Mentions `service-worker.js`.
   - *Implementation:* Uses `sw.js` (and Workbox chunk `workbox-*.js`).
   - *Rationale:* `@vite-pwa/sveltekit` standardizes on `sw.js`. Using the default plugin filename eliminates custom build workarounds, prevents duplicate service worker registrations, and ensures clean PWA lifecycle management.

2. **Screenshots for Details & Map Screens:**
   - *Specification (§46):* Mentions screenshots for Details and Map.
   - *Implementation:* Details and Map screenshots are deferred along with their Phase 2 feature implementations (per §46 explicit exception in the design spec). Phase 1 covers Home, Forecast, Favorites, and Settings.

---

## 4. API Contract & Limitations

- **Open-Meteo Free Tier:**
  - Used for weather forecast and geocoding without proprietary API keys.
  - Usage conforms to the Open-Meteo fair-use terms (non-commercial, under 10,000 calls/day).
  - Attribution is maintained according to CC BY 4.0 in UI and documentation.

- **Wall-Time Timezone Contract:**
  - All timestamps from Open-Meteo (`current.time`, `hourly.time`, `daily.time`, `daily.sunrise`, `daily.sunset`) are formatted in the target location's local wall time ISO format (`YYYY-MM-DDTHH:MM`).
  - **No `new Date(isoString)` conversions** are used for display formatting. Doing so would incorrectly shift times according to the user's phone timezone.
  - Time formatting (`HH:MM`) is extracted via direct ISO string slicing.
  - Date and weekday formatting uses `Intl.DateTimeFormat` with `Date.UTC(...)` and `timeZone: 'UTC'` to treat wall-time as UTC and prevent timezone offsets.

- **Day/Night Calculation & Polar Conditions:**
  - `isDay(at, sunrise, sunset)` returns `{ isDay: boolean, source: 'calculated' | 'fallback' }`.
  - Normal day/night: `sunrise <= at <= sunset`.
  - Cross-midnight (midnight sun / polar daylight): `at >= sunrise || at <= sunset`.
  - Missing/null sunrise/sunset (polar night or polar day edge-cases): falls back to an established 07:00–19:00 wall-time window with `source: 'fallback'`.

- **Minimal Payload Querying:**
  - API queries explicitly list only required variables (`temperature_2m`, `relative_humidity_2m`, `apparent_temperature`, `precipitation`, `weather_code`, `pressure_msl`, `wind_speed_10m`, `wind_direction_10m`) to minimize payload bandwidth.

---

## 5. Base Path Contract

The application supports both repository subpath deployment and custom domain / root deployment via the single `PUBLIC_BASE_PATH` environment variable:

- **GitHub Pages Subpath Deployment (`PUBLIC_BASE_PATH=/weather`):**
  - `KIT_BASE = '/weather'` → passed to SvelteKit `paths.base`.
  - `URL_BASE = '/weather/'` → used for PWA manifest `start_url`, `scope`, `navigateFallback`, and icon paths.
  - Deployed URL: `https://zeklop.github.io/weather/`

- **Custom Domain / Root Deployment (`PUBLIC_BASE_PATH=''` or default):**
  - `KIT_BASE = ''` → root base path.
  - `URL_BASE = '/'` → root scope and manifest URLs.
  - Deployed URL: `https://weather.example.com/`

All internal asset references in Svelte templates use `%sveltekit.assets%` or relative paths to prevent broken links across different base path configurations.

---

## 6. Cache Bounds & Storage Policy

- **Constants (`src/lib/cache/limits.ts`):**
  - `MAX_CACHED_CITIES = 8`
  - `CACHE_BUDGET_BYTES = 1048576` (1 MB)
  - `RUNTIME_CACHE_CAP = 32`
- **LRU Eviction:** Both city count and byte size are bounded. When limits are exceeded, least-recently-accessed forecasts are pruned.
- **Resilience:** Unparseable localStorage data is cleared automatically without crashing. `QuotaExceededError` triggers cache pruning, falling back to runtime memory caching if storage remains unavailable.

---

## 7. Build Output & Bundle Metrics

- **Static Output (`build/`):**
  - Prerendered HTML for all routes: `index.html`, `forecast/index.html`, `favorites/index.html`, `settings/index.html`, `map/index.html`.
  - PWA assets: `manifest.webmanifest`, `sw.js`, `workbox-*.js`.
  - Static icons: 19 SVG Meteocons (`icons/weather/`) + 4 PNG app icons (`icons/app/`).
- **Bundle Sizes (Production Build):**
  - Total Client JS: ~120 KB uncompressed (~40 KB gzipped) across all chunks.
  - Total Client CSS: ~20 KB uncompressed (~6 KB gzipped).
  - Precache Manifest: 58 entries (~304 KiB total assets pre-cached for full offline support).
  - Initial JS bundle footprint for Home screen excludes any map rendering engine.
- **Server Requirements:** Zero runtime dependencies. 100% static hosting compatible.
