# Weather PWA — Phase 1 Design (2026-08-20)

Source of truth: `weather_pwa_spec.md` in repo root. This document records Phase 1 scope and the decisions made during design; it does not restate the full spec.

## Scope

Phase 1 per spec §44:

- app shell (SvelteKit + adapter-static + handcrafted CSS);
- PWA manifest, service worker, app icons;
- current weather hero;
- near-term precipitation card (deterministic heuristic over hourly data, no invented nowcasting);
- hourly horizontal rail («Сейчас», 24 h, scroll, current-hour highlight);
- today summary card;
- 5–7 day preview on Home + full 10-day forecast on `/forecast`;
- city search (debounce, ≥2 chars, max 8 results);
- favorites (localStorage);
- two-layer cache (runtime Map + localStorage);
- offline fallback (last cached forecast + timestamp);
- Meteocons bundled locally;
- deployment: GitHub Actions → GitHub Pages at `/weather/`.

## Decisions and deviations

| Topic | Decision | Rationale |
|---|---|---|
| Styling | Handcrafted CSS, CSS variables, no Tailwind | Bespoke Yandex-like design, minimal bundle, full control |
| Dark mode | Deferred to Phase 2; v1 ships light theme only (no System/Light toggle that would look identical) | Spec §36 allows; settings structure ready for Phase 2 |
| Persistent cache | `localStorage` (versioned JSON) with hard bounds: max entries, ~1 MB budget, LRU eviction, corrupt-JSON recovery, `QuotaExceededError` → eviction → runtime-only mode | IndexedDB remains documented Phase 2 upgrade path; per-city payload estimate is not a limit |
| State approach | Svelte 5 runes in `src/lib/stores/*.svelte.ts` (browser-only, listener cleanup). No plain `.ts` stores | Single consistent state model, no hybrid |
| Manifest/SW owner | `@vite-pwa/sveltekit` as single source (manifest + SW); no separate hand-written `static/manifest.webmanifest` | Avoids duplicate/root-path URL drift; one base path everywhere |
| `/day/[date]` route | Not built; days expand inline on `/forecast` | Spec §14 explicitly permits |
| `/map` route | Static prerendered placeholder, no MapLibre, honest «Карта — в следующей версии» message, working navigation | §45 requires graceful `/map`, tab and CTA must never 404; MapLibre still excluded from Home bundle |
| Details, chart, map implementation | Deferred to Phase 2 | Not in Phase 1 per §44; §46 screenshots for Details/Map documented as an explicit exception in IMPLEMENTATION_NOTES.md |
| App icons | Original SVG → PNG via devDependency generator (192/512/maskable+apple-touch 180); maskable has its own safe-zone composition; committed PNGs as fallback + CI size check | No proprietary Yandex assets; reproducible, verifiable |
| Base path | `PUBLIC_BASE_PATH` = `'' \| '/weather'` (no trailing slash). Derived pair: `KIT_BASE` = PUBLIC_BASE_PATH → `kit.paths.base`; `URL_BASE` = PUBLIC_BASE_PATH + `'/'` → manifest `start_url`/`scope`/`navigateFallback`/icons (`/` in root mode). CI builds `/weather`, separate smoke for root mode | Repo is `weather`, username `zeklop` → `https://zeklop.github.io/weather/` |
| Time handling | `response.timezone` stored in payload. Open-Meteo values are wall-time ISO in location tz; compare them directly as local wall-time (HH:MM string compare), no `new Date()` conversion — DST-safe by construction. `isDay(at, sunrise, sunset)`, polar day/night as always-day/night. Tests: DST, cross-midnight, polar, foreign tz | Spec §23; never phone-local tz |
| Units | Fixed Russian defaults (°C, м/с, mmHg); formatting isolated in `units.ts` for later configurability | Spec §19/§6 |

## Data flow

UI components → `src/lib/api/{openMeteo,geocoding}.ts` (sole `fetch()` callers) → normalized models → Svelte 5 runes stores → components. No `fetch()` in components.

Cache key: `forecast:{latRounded4}:{lonRounded4}`. SWR: fresh <15 min, stale-but-usable <6 h, offline fallback any age with visible timestamp. Runtime `Map` capped; localStorage bounded (max entries, budget, LRU), handles corrupt JSON and quota errors.

## Service worker

`@vite-pwa/sveltekit` (manifest + SW single source). NetworkFirst for `api.open-meteo.com` (`networkTimeoutSeconds: 3`, cache only successful responses, `maxEntries`/expiry), CacheFirst for static assets. Versioned caches, obsolete cache cleanup. Scope covers `URL_BASE` (`/weather/`). SW filename is `sw.js` (vite-plugin-pwa default; spec §4.4 mentions `service-worker.js` — recorded as a documented deviation, no duplicate file). App-level API failures (timeouts, malformed, geocoding) handled outside SW via `AbortController` in the api layer.

## Deploy

`.github/workflows/deploy.yml`: `npm ci → npm run check → npm run test → npm run build → upload-pages-artifact → deploy-pages`. Permissions: `contents: read`, `pages: write`, `id-token: write`.

## Tests (Vitest)

WMO mapping, pressure hPa→mmHg, wind direction mapping, temperature formatting, cache freshness, forecast normalization.

## Omitted from v1 (intentionally)

Details screen, precipitation chart, dark theme, map, air quality, push notifications, analytics (never), accounts (never).
