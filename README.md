# Weather PWA

<p align="center">
  <strong>English</strong> &nbsp;|&nbsp; <a href="README.ru.md"><strong>Русский</strong></a>
</p>

---

A lightweight, high-performance, offline-capable Progressive Web Application (PWA) for weather forecasts inspired by the clean visual density and information hierarchy of modern weather apps. Built with **SvelteKit** (Svelte 5 runes), the open **Open-Meteo API**, and vector **Meteocons**.

Engineered mobile-first for **iOS Safari** (standalone PWA mode) and modern desktop browsers, completely static (zero server-side runtime footprint), with resilient offline caching, and deployable to **GitHub Pages** or any static web server.

---

## Features

- **Home Screen Hero:** Large temperature display in °C with Unicode minus (`−`), weather conditions, feels-like temperature, wind speed in m/s with 8-point compass direction, and atmospheric pressure in mmHg.
- **Expanded Weather Metrics:** UV index, humidity, dew point, and air quality index (Open-Meteo Air Quality API) in a dedicated details card.
- **Near-Term Precipitation Heuristic:** Deterministic 2-hour rain/snow probability heuristic based on hourly data with direct map link, plus an interactive 24-hour precipitation SVG chart.
- **Hourly Forecast Rail:** Smooth horizontal scrolling forecast («Now» + 24+ hours) with current-hour highlighting, day/night weather icons, and precipitation probability badges.
- **10-Day Forecast:** Daily summary on Home and detailed breakdown on the `/forecast/` page.
- **City Search & Geocoding:** Powered by Open-Meteo Geocoding API (300 ms debounce, queries starting at 2 characters, up to 8 results with region/country, automatic request cancellation, localized queries).
- **Favorites:** Fast local storage of favourite locations (`localStorage`), quick switching, and cached temperature previews on `/favorites/`.
- **Settings:** City selection, GPS geolocation request, last updated status with manual refresh trigger, theme (System / Light / Dark), language switcher (English / Russian), weather alerts configuration, and iOS installation guidance.
- **Bilingual Interface (i18n):** English by default with instant Russian switch; localized WMO descriptions, units, compass points, and date/time formatting.
- **Smart Weather Alerts:** In-app and system notifications for approaching precipitation, severe weather, frost, and sudden temperature drops, with quiet hours and rate limiting.
- **Dynamic Favicon & App Badging:** Live temperature rendered in the browser tab favicon (Canvas API) and Home Screen icon badge via `navigator.setAppBadge` (iOS 16.4+ standalone / Android).
- **Platform-Specific PWA Prompts:** Native 1-click install banner on Android (`beforeinstallprompt`) and top banner with animated step-by-step installation instructions for iOS Safari.
- **Interactive Radar Map:** MapLibre GL JS map on `/map/` with RainViewer precipitation radar animation (past + forecast frames) and layer switching.
- **Offline Mode & Caching:** Two-layer cache (in-memory `Map` + versioned `localStorage` with LRU eviction, 8-city cap, and 1 MB budget), SWR strategy (fresh < 15 min, stale < 6 hours, offline fallback with timestamp).
- **Vector Icons:** High-quality SVG Meteocons with dynamic day/night switching based on wall-time solar calculations (sunrise/sunset).

---

## Tech Stack

- **Framework:** [SvelteKit](https://kit.svelte.dev/) 2 with Svelte 5 runes (`$state`, `$derived`, `$effect.root`)
- **Language:** TypeScript (strict mode)
- **Bundler & PWA:** [Vite](https://vitejs.dev/) + [@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/) (Workbox Service Worker, offline fallback)
- **Adapter:** `@sveltejs/adapter-static` (full static prerender of all routes with `trailingSlash: 'always'`)
- **Styling:** Handcrafted CSS with CSS variables, iOS Safe Areas (`env(safe-area-inset-*)`), and zero UI bloat (no Tailwind / bulky component libraries)
- **Weather Data, Geocoding & Air Quality:** [Open-Meteo API](https://open-meteo.com/) (no API keys required)
- **Radar Data:** [RainViewer](https://www.rainviewer.com/) public radar API
- **Maps:** [MapLibre GL JS](https://maplibre.org/) with OpenStreetMap / CARTO basemap tiles
- **Weather Icons:** [Meteocons](https://meteocons.com/) (SVG, MIT License)
- **App Icons:** Original vector SVG + automated PNG generation via `sharp`

---

## Local Development

### Requirements
- Node.js 22+ (see `.nvmrc`)
- npm 10+

### Start Dev Server

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Or start with automatic browser launch
npm run dev -- --open
```

---

## Quality Assurance & Building

```bash
# Typecheck TypeScript and Svelte diagnostics
npm run check

# Run Vitest test suites (26 suites, 300+ tests)
npm test

# Verify PWA icon dimensions and maskable safe-zone invariant (radius <= 0.4 * size)
npm run check:icons

# Regenerate PNG icons from SVG source (static/icons/app/icon-source.svg)
npm run icons

# Build static production bundle (outputs to build/)
npm run build
```

---

## Deployment

### 1. GitHub Pages (Primary)

Live application: **`https://zeklop.github.io/weather/`**

To build for a repository subpath deployment:

```bash
PUBLIC_BASE_PATH=/weather npm run build
```

Automated CI/CD is configured in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It runs on pushes to `main` or manual trigger (`workflow_dispatch`), validates checks and tests, generates static assets, and deploys to GitHub Pages.

Repository configuration: `Settings → Pages → Build and deployment → Source: GitHub Actions`.

### 2. Custom Domain / Root Mode (`PUBLIC_BASE_PATH=''`)

When serving from the root of a domain (e.g. `https://weather.example.com/`):

```bash
PUBLIC_BASE_PATH='' npm run build
# or simply:
npm run build
```

### 3. VPS / Static Web Server (Caddy)

Since the app is 100% static, no Node.js runtime is required on the server. A production-ready [`Caddyfile`](Caddyfile) is included in the repository.

---

## Installing PWA on iOS (Safari)

1. Open **`https://zeklop.github.io/weather/`** in Safari on iPhone.
2. Tap the **Share** button (box with an upward arrow in the bottom toolbar).
3. Scroll down and select **«Add to Home Screen»**.
4. Tap **«Add»** in the top right corner.
5. Launch the app from your Home Screen — the icon is named **«Weather»** — for a native standalone fullscreen experience with offline support. On iOS 16.4+ the icon also shows a live temperature badge (enable in Settings).

---

## Installing PWA on Android (Chrome)

1. Open **`https://zeklop.github.io/weather/`** in Chrome on Android.
2. Tap the menu button (**⋮**) and choose **“Add to Home screen”** / **“Install app”** — or tap the install banner that appears at the top of the app.
3. Confirm the installation.
4. Launch the app from your Home Screen — the icon is named **«Weather»** — for a native standalone fullscreen experience with offline support and a live temperature badge on the icon (badge rendering also depends on your launcher).

---

## Attribution & Licenses

- **Weather data, geocoding & air quality:** [Open-Meteo](https://open-meteo.com/) — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Weather icons:** [Meteocons](https://github.com/basmilius/meteocons) by Bas Milius — MIT License.
- **Interactive maps:** [MapLibre GL JS](https://maplibre.org/) — BSD 3-Clause; basemap tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors and [CARTO](https://carto.com/).
- **Radar precipitation data:** [RainViewer](https://www.rainviewer.com/).
- **Reverse geocoding (GPS → city name):** [BigDataCloud](https://www.bigdatacloud.com/) free client-side API.

Detailed license information is available in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
