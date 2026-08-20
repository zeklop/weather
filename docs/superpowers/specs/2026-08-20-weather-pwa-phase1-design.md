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
| Dark mode | Deferred to Phase 2 | Spec §36 allows; v1 ships light theme + System/Light toggle stored |
| Persistent cache | `localStorage` (versioned JSON) instead of IndexedDB | Per-city payload ~20–60 KB, well under 5 MB quota; IndexedDB is the documented Phase 2 upgrade path |
| `/day/[date]` route | Not built; days expand inline on `/forecast` | Spec §14 explicitly permits |
| Details, chart, map | Deferred to Phase 2 | Not in Phase 1 per §44 |
| App icons | Original SVG → PNG via devDependency script (192/512/maskable/180 apple-touch) | No proprietary Yandex assets; no hand-made binary PNGs |
| Base path | `PUBLIC_BASE_PATH`, default `/weather`, empty for custom domain | Repo is `weather`, username `zeklop` → `https://zeklop.github.io/weather/` |
| Time handling | Location timezone from Open-Meteo via `Intl.DateTimeFormat` | Spec §23; never phone-local tz |
| Units | Fixed Russian defaults (°C, м/с, mmHg); formatting isolated in `units.ts` for later configurability | Spec §19/§6 |

## Data flow

UI components → `src/lib/api/{openMeteo,geocoding}.ts` (sole `fetch()` callers) → normalized models → Svelte 5 runes stores → components. No `fetch()` in components.

Cache key: `forecast:{latRounded4}:{lonRounded4}`. SWR: fresh <15 min, stale-but-usable <6 h, offline fallback any age with visible timestamp.

## Service worker

`vite-plugin-pwa`. NetworkFirst for `api.open-meteo.com` (timeout ~3 s → cache fallback), CacheFirst for static assets. Versioned caches, obsolete cache cleanup. Scope covers `/weather/`.

## Deploy

`.github/workflows/deploy.yml`: `npm ci → npm run check → npm run test → npm run build → upload-pages-artifact → deploy-pages`. Permissions: `contents: read`, `pages: write`, `id-token: write`.

## Tests (Vitest)

WMO mapping, pressure hPa→mmHg, wind direction mapping, temperature formatting, cache freshness, forecast normalization.

## Omitted from v1 (intentionally)

Details screen, precipitation chart, dark theme, map, air quality, push notifications, analytics (never), accounts (never).
