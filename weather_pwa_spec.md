# Weather PWA — Implementation Specification

## 0. Role and execution mode

You are a senior frontend engineer and UI implementer. Build the application, do not merely propose architecture.

The goal is a **very lightweight, self-hosted weather PWA for iPhone/iOS**, visually and functionally inspired by the information density, hierarchy, spacing, cards and forecast presentation of Yandex Weather, while using original/open-source assets and no advertising, trackers, analytics SDKs or proprietary Yandex assets.

The final result must be deployable primarily to **GitHub Pages** as a fully static site, with a small VPS static deployment kept only as a fallback option.

Do not overengineer. Do not add a database, Node server, Redis, authentication, Dockerized backend, SSR, telemetry, ad SDK, cookie banner, account system or other infrastructure unless explicitly required below.

---

# 1. Product goal

Create a fast personal weather dashboard that:

- opens instantly from the iOS Home Screen as a PWA;
- looks and behaves like a native iOS weather application;
- is visually close in spirit to Yandex Weather;
- has no advertising;
- shows current weather, hourly forecast, daily forecast, detailed metrics and precipitation map;
- remembers favorite locations;
- continues showing the last downloaded forecast when offline;
- runs almost entirely client-side;
- consumes minimal RAM/CPU/disk on the VPS.

Primary device: modern iPhone Safari / standalone PWA.

Secondary targets:

- desktop Safari;
- desktop Chrome;
- Android Chrome.

Primary language: **Russian**.

Default city: **Москва**.

Units:

- temperature: °C;
- wind: м/с;
- pressure: мм рт. ст.;
- precipitation: мм;
- visibility: км;
- time: 24-hour format.

---

# 2. Non-goals

Do NOT implement:

- registration or accounts;
- ads;
- analytics;
- push notifications in v1;
- server-side weather aggregation;
- a SQL database;
- a general-purpose admin panel;
- social features;
- news;
- recommendations;
- AI-generated weather text;
- Yandex proprietary API calls;
- copying Yandex logos, icons, fonts, CSS, JavaScript or image assets.

The design may closely reproduce layout ideas and interaction patterns, but visual assets must be original or open-source.

---

# 3. Recommended technology

Use:

- **Svelte 5**
- **SvelteKit**
- **TypeScript**
- `@sveltejs/adapter-static`
- Tailwind CSS 4 or compact handcrafted CSS
- Vite
- `vite-plugin-pwa` or equivalent Workbox-based PWA integration
- Open-Meteo APIs
- Meteocons static SVG icons
- MapLibre GL JS only on the map screen and loaded lazily
- optional lightweight chart implementation using SVG rather than a large chart library

Prefer native browser APIs.

Avoid large UI frameworks.

Do not use React unless an unavoidable technical problem exists.

Production output must be a static build.

Primary deployment:

```text
Browser / iPhone PWA
  |
  +-- HTML/CSS/JS/icons --> GitHub Pages CDN
  |
  +-- weather API -------> Open-Meteo
  |
  +-- geocoding API -----> Open-Meteo
  |
  +-- map data ----------> Open-Meteo / MapLibre-compatible sources
```

Fallback deployment:

```text
Browser
  |
  +-- static HTML/CSS/JS --> Caddy or nginx on a small VPS
  |
  +-- weather API -------> Open-Meteo
  |
  +-- geocoding API -----> Open-Meteo
  |
  +-- map data ----------> Open-Meteo / MapLibre-compatible sources
```

There must be **no application backend** in the normal architecture. Forecast requests must go directly from the browser to Open-Meteo.

---

# 4. Hosting and deployment footprint

## 4.1 Primary hosting: GitHub Pages

GitHub Pages is the **default production target**.

Requirements:

- deploy static SvelteKit output;
- use GitHub Actions for build and deployment;
- no server runtime;
- no Node.js process in production;
- HTTPS provided by GitHub Pages;
- PWA must work from GitHub Pages;
- Service Worker paths must work correctly both on project subpaths and custom domains.

Default project-style URL example:

```text
https://USERNAME.github.io/weather/
```

Custom domain example:

```text
https://weather.example.com/
```

If the application is hosted at:

```text
https://USERNAME.github.io/weather/
```

configure the SvelteKit base path correctly:

```ts
paths: {
  base: process.env.NODE_ENV === 'production' ? '/weather' : ''
}
```

Do not hardcode `/weather` if the repository name may change. Prefer an environment variable, for example:

```text
PUBLIC_BASE_PATH=/weather
```

or derive it from GitHub Actions configuration.

All internal links, icons, manifest references, Service Worker assets and route navigation must respect the configured base path.

If a custom domain is used, production base path should be empty:

```text
/
```

The implementation must support both modes without rewriting application code.

## 4.2 GitHub Actions deployment

Create:

```text
.github/workflows/deploy.yml
```

The workflow should:

1. run on push to the default branch;
2. install dependencies with `npm ci`;
3. run type checks;
4. run tests;
5. build the static app;
6. upload the build artifact;
7. deploy it to GitHub Pages.

Use the official GitHub Pages Actions where practical.

Expected permissions should include only what is needed for Pages deployment.

Do not deploy `node_modules`.

## 4.3 GitHub Pages routing constraints

GitHub Pages does not provide a traditional SPA fallback.

Therefore either:

- prerender every application route as static HTML; or
- design routing so every route exists as a generated static path.

Preferred solution:

```text
prerender = true
```

for all normal routes.

Routes such as:

```text
/
forecast/
map/
favorites/
settings/
```

must be generated as static pages during build.

Avoid a runtime-only SPA routing configuration that breaks after browser refresh on `/map/`.

## 4.4 PWA path requirements on GitHub Pages

The following must work when hosted under a repository subpath:

```text
/weather/
/weather/manifest.webmanifest
/weather/icons/...
/weather/service-worker.js
/weather/_app/...
```

The Service Worker scope must cover the full application path.

Do not assume the app is hosted at domain root.

Test:

```text
https://USERNAME.github.io/weather/
```

before considering deployment complete.

## 4.5 Optional custom domain

Support a GitHub Pages custom domain.

When configured:

```text
weather.example.com
```

the application should run from `/`.

Provide documentation for:

- Pages custom-domain configuration;
- DNS CNAME setup;
- HTTPS enforcement;
- optional `CNAME` file.

Do not make a custom domain mandatory.

## 4.6 Fallback VPS deployment

VPS deployment remains supported, but it is secondary.

Target production server consumption:

- idle RAM attributable to the application: effectively negligible beyond nginx/Caddy;
- no permanent Node.js process;
- application disk footprint preferably < 30 MB;
- static assets gzip/brotli enabled;
- initial JS transfer target: < 180 KB compressed;
- map libraries must not be included in the initial bundle.

Preferred VPS output:

```text
/var/www/weather
  index.html
  forecast/
  map/
  favorites/
  settings/
  _app/
  icons/
  manifest.webmanifest
  service-worker.js
```

Caddy or nginx serves the directory.

Docker is optional.

If Docker is used, use a tiny static image such as nginx-alpine and a multi-stage build. Never ship Node.js in the runtime image.

# 5. Weather data provider

Use **Open-Meteo**.

Forecast API:

```text
https://api.open-meteo.com/v1/forecast
```

Geocoding API:

```text
https://geocoding-api.open-meteo.com/v1/search
```

Air quality API, if included:

```text
https://air-quality-api.open-meteo.com/v1/air-quality
```

Timezone:

```text
timezone=auto
```

Use WMO weather codes returned by Open-Meteo and map them locally to Russian labels and icons.

---

# 6. Forecast request

Request only fields actually displayed.

Recommended current fields:

```text
temperature_2m
apparent_temperature
relative_humidity_2m
precipitation
rain
showers
snowfall
weather_code
cloud_cover
pressure_msl
surface_pressure
wind_speed_10m
wind_direction_10m
wind_gusts_10m
```

Recommended hourly fields:

```text
temperature_2m
apparent_temperature
precipitation_probability
precipitation
rain
showers
snowfall
weather_code
cloud_cover
visibility
pressure_msl
relative_humidity_2m
wind_speed_10m
wind_direction_10m
wind_gusts_10m
uv_index
```

Recommended daily fields:

```text
weather_code
temperature_2m_max
temperature_2m_min
apparent_temperature_max
apparent_temperature_min
sunrise
sunset
uv_index_max
precipitation_sum
rain_sum
showers_sum
snowfall_sum
precipitation_probability_max
wind_speed_10m_max
wind_gusts_10m_max
wind_direction_10m_dominant
```

Use:

```text
forecast_days=10
timezone=auto
wind_speed_unit=ms
```

Pressure from API is in hPa. Convert to mmHg:

```text
mmHg = hPa * 0.750061683
```

Round visually to integer mmHg.

---

# 7. Location behavior

On first launch:

1. Show cached/default Moscow immediately.
2. Ask for browser geolocation only after UI is visible.
3. If permission granted:
   - fetch coordinates;
   - update current location;
   - reverse-name it if practical;
   - save location locally.
4. If permission denied:
   - keep Moscow or last manually selected city;
   - never repeatedly nag.

Provide city search.

Search behavior:

- start searching after 2 characters;
- debounce 250–350 ms;
- max 8 visible results;
- show city, region, country;
- keyboard accessible;
- selecting a city immediately refreshes forecast.

Favorites:

- stored locally;
- sortable if simple to implement;
- each entry stores:
  - display name;
  - latitude;
  - longitude;
  - timezone;
  - country code;
  - optional admin region.

No server-side favorites storage.

---

# 8. Weather icons

## 8.1 Required icon source

Use **Meteocons by Bas Milius**:

```text
https://github.com/basmilius/meteocons
```

License: MIT.

Preferred package:

```text
@meteocons/svg-static
```

Preferred visual style:

```text
fill
```

Fallback style:

```text
flat
```

Use local bundled SVG files in production instead of loading icons from a third-party CDN.

Do not copy Yandex Weather image files.

## 8.2 Visual adaptation

The icons should evoke the same pleasant, friendly visual weight as Yandex Weather:

- large simple sun disc;
- soft rounded clouds;
- saturated but not neon colors;
- low visual noise;
- clear silhouettes at 20–32 px;
- main current-condition icon can be 72–100 px.

Do not apply complex animations to hourly rows.

Main hero weather icon may use subtle animation only if it does not noticeably affect battery consumption.

Prefer static SVG in v1.

## 8.3 WMO mapping

Implement a single mapping module:

```text
src/lib/weather/wmo.ts
```

It must return:

```ts
type WeatherVisual = {
  code: number;
  labelRu: string;
  iconDay: string;
  iconNight: string;
  shortLabelRu: string;
};
```

At minimum cover all WMO codes used by Open-Meteo:

- 0 clear;
- 1 mainly clear;
- 2 partly cloudy;
- 3 overcast;
- 45, 48 fog;
- 51, 53, 55 drizzle;
- 56, 57 freezing drizzle;
- 61, 63, 65 rain;
- 66, 67 freezing rain;
- 71, 73, 75 snowfall;
- 77 snow grains;
- 80, 81, 82 rain showers;
- 85, 86 snow showers;
- 95 thunderstorm;
- 96, 99 thunderstorm with hail.

Use day/night variants based on sunrise and sunset.

---

# 9. Design direction

## 9.1 Core principle

The application should feel like:

```text
Yandex Weather information architecture
+
clean iOS visual language
+
zero advertising
+
less clutter
```

Do not create a generic Bootstrap dashboard.

Do not create a dark developer dashboard.

Do not create oversized desktop cards that merely shrink on mobile.

Design mobile-first at 390 × 844 CSS pixels.

---

# 10. Global visual system

Default light theme:

```text
page background: #F3F5F8 to #F7F9FC
primary text: near-black
secondary text: neutral gray
accent: calm medium blue
card background: white / slightly translucent white
divider: subtle cool gray
```

Use native/system font:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  "Helvetica Neue",
  Arial,
  sans-serif;
```

Do not bundle Apple fonts.

Card radius:

```text
18–24 px
```

Small controls:

```text
12–16 px radius
```

Card shadow:

- very subtle;
- no heavy Material Design drop shadows;
- use border + soft shadow;
- cards must remain legible in bright outdoor conditions.

Spacing base:

```text
4 / 8 / 12 / 16 / 20 / 24 / 32 px
```

Touch target:

```text
minimum 44 × 44 px
```

---

# 11. iOS PWA safe areas

The PWA must look correct when launched from Home Screen.

Use:

```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

Manifest:

```json
{
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#F5F7FA",
  "theme_color": "#F5F7FA"
}
```

Set:

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

Provide:

- 180×180 apple-touch-icon;
- 192×192 icon;
- 512×512 icon;
- maskable 512×512 icon.

Create an original app icon: blue rounded square containing a simplified white cloud + yellow sun. Do not use Yandex branding.

---

# 12. Application navigation

Use a fixed bottom navigation in standalone mode.

Four tabs:

1. **Главная**
2. **Карта**
3. **Избранное**
4. **Настройки**

Icons should come from Lucide or custom tiny SVG.

Bottom bar:

- translucent/white;
- backdrop blur where supported;
- active item blue;
- inactive gray;
- safe-area padding;
- height around 58 px plus safe area.

Desktop:

- center mobile-like content;
- max main width around 780–980 px depending on page;
- bottom navigation may become compact top/side navigation.

---

# 13. Screen 1 — Home

Route:

```text
/
```

This is the most important screen.

## 13.1 Header

Single compact row:

```text
[menu/settings optional]       Москва       [search] [favorite]
```

Location name centered or visually dominant.

Do not waste 80 px on a decorative toolbar.

## 13.2 Hero weather block

Display:

```text
+18°
Облачно
Ощущается как +17°
```

Main temperature:

- 64–78 px;
- semibold;
- compact line height.

Weather icon:

- 76–96 px;
- aligned right of temperature where space allows.

Secondary row:

```text
Ветер 3,8 м/с, СЗ
Давление 748 мм рт. ст.
```

Do not show every metric in hero.

## 13.3 Near-term precipitation card

If precipitation probability/amount is relevant:

```text
В ближайшие 2 часа
Без осадков
```

or:

```text
Дождь начнётся примерно через 40 минут
```

Below:

```text
Показать на карте
```

Use deterministic data only. Do not invent nowcasting accuracy that Open-Meteo does not provide.

## 13.4 Horizontal hourly rail

A horizontally scrollable row.

Each cell:

```text
Сейчас
☁
+18°
20%
```

or:

```text
11:00
🌤
+19°
15%
```

Requirements:

- first item = “Сейчас”;
- show roughly 6 columns on iPhone width;
- horizontal scroll;
- no visible scrollbar;
- snap gently if useful;
- minimum 24 hours accessible;
- precipitation probability shown only when meaningful;
- current hour visually highlighted with subtle blue background.

## 13.5 Today card

Compact summary:

```text
Сегодня
Днём +22° · Ночью +14°
```

Include icon.

Optional second line:

```text
Без существенных осадков
```

## 13.6 Daily forecast preview

Show 5–7 days directly on Home.

Rows:

```text
Пт, 21      🌤      +22°   +14°
Сб, 22      🌧      +19°   +12°
```

At bottom:

```text
Прогноз на 10 дней →
```

---

# 14. Screen 2 — Full forecast

Route:

```text
/forecast
```

Top section:

```text
Почасовой прогноз
```

Use a clean vertical hourly table.

Columns:

```text
time | icon | temperature | precipitation | wind
```

Example:

```text
09:00   ☁   +18°   20%   3,5 м/с
10:00   ☁   +18°   20%   3,6 м/с
11:00   🌤  +19°   15%   3,8 м/с
```

Below:

```text
Прогноз на 10 дней
```

Daily rows include:

- weekday/date;
- icon;
- daytime high;
- nighttime low;
- precipitation marker when relevant.

Tapping a day may expand inline or open:

```text
/day/[date]
```

Do not make this route mandatory if inline expansion is simpler.

---

# 15. Screen 3 — Details

Can be a Home subsection or separate route:

```text
/details
```

Display metrics as compact list/cards.

Required:

- Ощущается как
- Ветер
- Порывы ветра
- Давление
- Влажность
- Видимость
- УФ-индекс
- Восход
- Закат

Wind direction should have both:

```text
3,8 м/с, СЗ
```

and a small rotated arrow.

Direction labels:

```text
С, СВ, В, ЮВ, Ю, ЮЗ, З, СЗ
```

---

# 16. Precipitation chart

Provide a lightweight chart.

Preferred implementation:

- SVG;
- no heavy chart package.

Show next 12–24 hours.

Chart requirements:

- x-axis time;
- precipitation bars;
- optional probability line only if visually clean;
- responsive;
- tooltips on touch;
- no animations longer than 250 ms.

If all precipitation values are zero, show a clean empty state rather than a meaningless flat chart.

---

# 17. Precipitation/weather map

Route:

```text
/map
```

Use MapLibre GL JS.

Load the map module only when the user opens this route.

Use Open-Meteo weather map resources where practical.

Reference:

```text
https://github.com/open-meteo/maps
https://github.com/open-meteo/weather-map-layer
```

Important: the Open-Meteo weather-map-layer project warns it is still under construction. Therefore isolate it behind an adapter:

```text
src/lib/map/weatherLayer.ts
```

so it can be replaced later without rewriting the UI.

Default map:

- centered at selected city;
- zoom around 7–9;
- location pin;
- precipitation overlay;
- compact layer button;
- + / − zoom control optional;
- current forecast time visible.

Bottom timeline:

```text
09:00 09:20 09:40 10:00 10:20
```

Provide:

- play/pause button;
- draggable or tappable time steps;
- selected time highlighted blue.

Avoid a 3D map.

Avoid satellite imagery by default.

Use a clean light basemap.

Map must not initialize on Home screen.

Because the primary hosting target is GitHub Pages, all map tile/style/layer requests must be verified for:

- HTTPS;
- browser CORS compatibility;
- no secret server-side token requirement;
- no dependency on a reverse proxy.

If the selected precipitation layer cannot be called directly from the browser, replace it with a browser-compatible source rather than introducing a backend solely for the map.

---

# 18. Favorites

Route:

```text
/favorites
```

List saved cities.

Example:

```text
Москва              +18°  ☀
Санкт-Петербург     +15°  ☁
Казань              +17°  ☁
Сочи                 +22°  🌤
```

Tapping a city selects it and returns to Home.

Use parallel forecast request only when useful.

Do not continuously poll all cities.

Favorites weather can be refreshed:

- on screen open;
- if cache older than 30 minutes.

---

# 19. Settings

Route:

```text
/settings
```

Required settings:

### Theme

```text
Системная
Светлая
Тёмная
```

Dark theme is desirable but can be a second implementation phase if necessary.

### Location

- use current location toggle/action;
- selected default city.

### Refresh

Show:

```text
Последнее обновление: 08:42
```

Manual button:

```text
Обновить
```

### Units

v1 can keep Russian defaults fixed.

Structure code so units can later be configurable.

### About

Show:

```text
Данные о погоде: Open-Meteo
Иконки: Meteocons
```

No tracking.

---

# 20. Data caching

Use a two-layer strategy.

## 20.1 Runtime in-memory cache

Avoid duplicate requests during one session.

Cache key:

```text
forecast:{latRounded}:{lonRounded}
```

Coordinates can be rounded to approximately 3–4 decimals.

## 20.2 Persistent cache

Use IndexedDB or compact localStorage if payload size remains small.

Recommended structure:

```ts
type CachedForecast = {
  fetchedAt: number;
  location: Location;
  payload: ForecastPayload;
};
```

Freshness policy:

- fresh: < 15 minutes;
- stale but usable: < 6 hours;
- offline fallback: allow older cached data, clearly show timestamp.

Behavior:

1. show cached data immediately;
2. if stale, refresh in background;
3. update UI without full page reload.

This is stale-while-revalidate behavior.

---

# 21. Service worker

Cache:

- app shell;
- CSS;
- JS;
- local icons;
- manifest;
- app icons.

Do not blindly cache every Open-Meteo response forever.

API strategy:

```text
NetworkFirst
timeout around 3 seconds
fallback to cached response
```

Static assets:

```text
CacheFirst
```

Version caches and clean obsolete ones after upgrades.

Offline screen must still show last known weather when local forecast data exists.

---

# 22. Refresh logic

Refresh forecast:

- when app opens and cached data is older than 15 minutes;
- when PWA returns to foreground and data is older than 15 minutes;
- when selected location changes;
- on manual refresh.

Do NOT poll every minute.

Use:

```text
visibilitychange
```

and/or:

```text
pageshow
```

to detect foreground restoration.

---

# 23. Time handling

This is important.

Use the selected location timezone from Open-Meteo.

Do not format all forecast timestamps in the phone's local timezone.

The app may be used for cities in other countries.

Every daily/hourly label must use the forecast location timezone.

---

# 24. Russian weather wording

Provide concise human Russian labels.

Examples:

```text
Ясно
Преимущественно ясно
Переменная облачность
Пасмурно
Туман
Морось
Небольшой дождь
Дождь
Сильный дождь
Снег
Снегопад
Ливень
Гроза
Гроза с градом
```

Avoid robotic strings such as:

```text
Дождевые ливни умеренной интенсивности
```

Temperature formatting:

```text
+18°
0°
−7°
```

Use Unicode minus `−` if practical.

---

# 25. Loading UX

Never block the entire app with a spinner after cached data exists.

First launch:

- skeleton placeholders;
- render header quickly;
- render cards progressively.

Refresh:

- keep old data visible;
- tiny refresh indicator;
- replace data when complete.

Error:

```text
Не удалось обновить прогноз.
Показаны данные на 08:12.
```

Provide retry button.

---

# 26. Performance requirements

On iPhone, Home route should feel instant after first load.

Targets:

- no layout shift after hero renders;
- map code excluded from Home bundle;
- local weather icons;
- lazy-load non-visible routes;
- avoid huge date libraries;
- prefer `Intl.DateTimeFormat`;
- avoid lodash;
- avoid Moment.js;
- avoid large animation libraries.

Use CSS transitions.

---

# 27. Accessibility

Minimum:

- semantic buttons;
- aria-label on icon-only controls;
- minimum contrast;
- touch target 44 px;
- keyboard support for search results;
- `prefers-reduced-motion`;
- text must remain usable at iOS enlarged text sizes.

---

# 28. Security and privacy

No analytics.

No remote tracking fonts.

No advertising.

No cookies required.

Store only:

- preferences;
- saved cities;
- cached weather;
- optional last known coordinates.

Geolocation stays client-side.

Use HTTPS.

Set practical headers:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self)
```

Use CSP if it does not break map providers.

---

# 29. Project structure

Recommended:

```text
src/
  routes/
    +layout.svelte
    +page.svelte
    forecast/
      +page.svelte
    map/
      +page.svelte
    favorites/
      +page.svelte
    settings/
      +page.svelte

  lib/
    api/
      openMeteo.ts
      geocoding.ts
      airQuality.ts

    weather/
      wmo.ts
      units.ts
      format.ts
      direction.ts
      dayNight.ts

    map/
      weatherLayer.ts

    stores/
      location.ts
      settings.ts
      forecast.ts
      favorites.ts

    cache/
      forecastCache.ts

    components/
      AppHeader.svelte
      BottomNav.svelte
      CurrentWeather.svelte
      HourlyRail.svelte
      DayRow.svelte
      ForecastCard.svelte
      DetailsGrid.svelte
      PrecipitationChart.svelte
      SearchSheet.svelte
      CityRow.svelte
      WeatherIcon.svelte

static/
  icons/
    weather/
    app/
  manifest.webmanifest
```

Keep components small and reusable.

---

# 30. Exact home screen hierarchy

At iPhone width, order must be:

```text
safe area
header
hero current weather
near-term precipitation card
hourly horizontal rail
today summary
daily forecast
details
precipitation chart
bottom padding
fixed navigation
```

Do not place the map inline on Home.

Do not use a hamburger drawer for main navigation.

---

# 31. Visual acceptance target

The designer/developer should compare the result to the supplied concept mockup.

The result should have these characteristics:

- Yandex-Weather-like information hierarchy;
- iOS-native spacing;
- lots of white/light neutral space;
- blue accent;
- friendly colored weather icons;
- compact cards;
- no visual noise;
- no advertising;
- no banner taking more than ~20% viewport height;
- important forecast readable at a glance.

If the output looks like a generic coding tutorial weather dashboard, it fails.

---

# 32. API abstraction

Never call `fetch()` directly from UI components.

Create:

```ts
getForecast(location)
searchLocations(query)
getAirQuality(location)
```

Return normalized app models.

UI components must not know Open-Meteo raw field names.

This allows replacing the weather provider later.

---

# 33. Normalized data model

Create app-level types similar to:

```ts
type Location = {
  id: string;
  name: string;
  admin1?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

type CurrentWeather = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  humidity: number;
  pressureHpa: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  precipitation: number;
};

type HourForecast = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  precipitationProbability: number | null;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
};

type DayForecast = {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  apparentMax: number;
  apparentMin: number;
  precipitationProbabilityMax: number | null;
  precipitationSum: number;
  windSpeedMax: number;
  windGustMax: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number | null;
};
```

---

# 34. App state

Use Svelte stores or Svelte 5 runes.

Required state:

```text
selectedLocation
forecast
forecastStatus
forecastFetchedAt
favorites
settings
online/offline
```

Avoid a global state library.

---

# 35. PWA install behavior on iOS

Do not show fake native install prompts.

Safari iOS does not support the same install prompt behavior as Chromium.

Optional first-run help may say:

```text
Чтобы добавить на экран «Домой»:
Поделиться → На экран «Домой»
```

Show this instruction only:

- in Safari on iPhone/iPad;
- when not already in standalone mode;
- no more than once unless opened from Settings.

Do not show it as a blocking modal.

---

# 36. Dark mode

If implemented in v1:

- follow system by default;
- do not simply invert colors;
- cards around `#1C1C1E`;
- page around `#000` / `#111`;
- preserve icon colors;
- muted separators.

Persist manual selection.

---

# 37. App icon

Create an original icon:

- square;
- blue gradient or solid blue;
- simplified cloud;
- partial yellow sun;
- no text;
- no “Я” symbol;
- no Yandex branding.

Generate required PNG sizes automatically during build or via script.

---

# 38. Tests

At least test:

- WMO mapping;
- pressure conversion;
- wind direction mapping;
- temperature formatting;
- cache freshness;
- forecast normalization.

Use Vitest.

Do not chase 100% coverage.

---

# 39. Error handling

Handle:

- geolocation denied;
- geolocation unavailable;
- forecast API timeout;
- geocoding API timeout;
- malformed API data;
- offline startup;
- empty city search;
- map layer failure.

Map failure must not crash the application.

Show:

```text
Карта временно недоступна
```

and keep navigation functional.

---

# 40. Deployment

## Option A — preferred: GitHub Pages

GitHub Pages is the primary production deployment.

Required files:

```text
.github/workflows/deploy.yml
```

Recommended GitHub Actions logic:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run check
      - run: npm run test
      - run: npm run build

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: build

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

Adapt versions if GitHub changes the official Pages Actions.

The repository settings must use:

```text
Settings → Pages → Source → GitHub Actions
```

Validate both:

```text
https://USERNAME.github.io/weather/
```

and custom-domain mode if configured.

## Option B — fallback: static output + Caddy

Example Caddyfile:

```caddy
weather.example.com {
    root * /var/www/weather
    encode zstd gzip
    try_files {path} /index.html
    file_server

    header {
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        Permissions-Policy "geolocation=(self)"
    }
}
```

## Option C — fallback: static output + nginx.

Do not run `npm run preview` in production.

---

# 41. Build commands

Expected:

```bash
npm ci
npm run check
npm run test
npm run build
```

Output must be static and ready for:

```text
GitHub Pages artifact upload
```

or direct copying to a web root.

The build must not depend on server-side rendering or a running Node.js process.

---

# 42. README requirements

Create a concise README containing:

- what the project is;
- screenshot;
- stack;
- local development;
- build;
- GitHub Pages deployment;
- repository-subpath deployment;
- custom-domain deployment;
- VPS fallback deployment;
- icon attribution;
- weather data attribution;
- map-related license notes;
- PWA installation on iOS.

---

# 43. Licensing requirement

Keep:

```text
THIRD_PARTY_NOTICES.md
```

List at least:

- Open-Meteo;
- Meteocons / Bas Milius;
- MapLibre GL JS;
- Open-Meteo weather-map-layer if actually bundled.

Do not claim the project owns third-party artwork.

Before committing map-layer code, inspect its current license and comply with it.

---

# 44. Implementation phases

## Phase 1

Build:

- app shell;
- PWA manifest;
- current weather;
- hourly rail;
- 10-day forecast;
- location search;
- favorites;
- local cache;
- offline fallback;
- Meteocons;
- deployment config.

This phase must already be useful.

## Phase 2

Build:

- details;
- precipitation chart;
- dark mode;
- map;
- polish.

Do not delay a working Phase 1 because the map is complicated.

---

# 45. Definition of done

The work is complete only when all of these are true:

- [ ] Installs to iPhone Home Screen.
- [ ] Opens in standalone mode.
- [ ] Correctly respects safe areas.
- [ ] Moscow forecast loads.
- [ ] Search finds and switches city.
- [ ] Current conditions are shown.
- [ ] At least 24 hourly values are available.
- [ ] 10-day forecast is shown.
- [ ] WMO codes display correct Russian labels and icons.
- [ ] Day/night icon variants work.
- [ ] Pressure is shown in mmHg.
- [ ] Wind is shown in m/s.
- [ ] Favorites persist after restart.
- [ ] Last forecast remains visible offline.
- [ ] Refresh does not blank the UI.
- [ ] Home initial bundle does not include map code.
- [ ] Map route works or fails gracefully.
- [ ] No analytics or advertising exists.
- [ ] Production works on GitHub Pages with no application server.
- [ ] Direct refresh works on `/forecast/`, `/map/`, `/favorites/` and `/settings/`.
- [ ] Repository subpath deployment works.
- [ ] Service Worker scope is correct under the repository subpath.
- [ ] Custom-domain mode can run from `/`.
- [ ] VPS fallback requires only a static web server.
- [ ] No proprietary Yandex image/font/code assets are present.
- [ ] Lighthouse PWA checks have no major errors.
- [ ] Mobile UI visually matches the supplied concept.

---

# 46. Final deliverables

Provide:

```text
1. Complete source code
2. Production build configuration
3. README.md
4. THIRD_PARTY_NOTICES.md
5. `.github/workflows/deploy.yml`
6. Caddyfile
7. Optional nginx.conf
8. PWA icons
9. Weather icon subset
10. Screenshots:
   - Home
   - Forecast
   - Details
   - Map
   - Favorites
11. Short file named IMPLEMENTATION_NOTES.md
```

In `IMPLEMENTATION_NOTES.md`, explain:

- what was implemented;
- what was intentionally omitted;
- any API limitations;
- bundle size;
- GitHub Pages deployment URL pattern;
- base-path handling;
- deployment commands;
- custom-domain notes;
- known map-layer limitations.

---

# 47. Agent behavioral constraints

While implementing:

1. Do not replace Open-Meteo with another commercial API.
2. Do not introduce API keys unless absolutely unavoidable.
3. Do not add a backend merely to hide public API calls.
4. Do not add a database.
5. Do not add authentication.
6. Do not use Yandex proprietary assets.
7. Do not use giant dependencies for trivial functionality.
8. Do not stop after creating wireframes.
9. Do not leave critical screens as TODO.
10. Keep code type-safe.
11. Run the project and fix build/type errors.
12. Test the UI at an iPhone-like viewport before declaring completion.
13. Prioritize performance and clarity over fancy animations.
14. If a requirement conflicts with iOS PWA limitations, document the limitation and implement the closest reliable behavior.
15. Make reasonable implementation decisions without repeatedly asking for approval.

---

# 48. Visual reference summary

Target visual composition:

```text
┌─────────────────────────────┐
│           Москва       ⌕ ☆  │
│                             │
│ +18°               [cloud]  │
│ Облачно                     │
│ Ощущается как +17°          │
│ Ветер 3,8 м/с · 748 мм      │
│                             │
│ ┌─────────────────────────┐ │
│ │ В ближайшие 2 часа      │ │
│ │ Без осадков             │ │
│ │ Показать на карте       │ │
│ └─────────────────────────┘ │
│                             │
│ Сейчас 09 10 11 12 13 →     │
│  ☁    ☁  🌤 ☀  ☀  ☀        │
│ +18  +18 +19 +20 +21 +21    │
│                             │
│ ┌─────────────────────────┐ │
│ │ Сегодня                 │ │
│ │ Днём +22° · Ночью +14° │ │
│ └─────────────────────────┘ │
│                             │
│ Пт       🌤       +22 +14   │
│ Сб       🌧       +19 +12   │
│ Вс       ☁        +18 +11   │
│                             │
├─────────────────────────────┤
│ Главная Карта Избр. Настр.  │
└─────────────────────────────┘
```

The key idea is not literal pixel-copying of Yandex Weather. The key idea is to reproduce its strengths: forecast hierarchy, quick scanning, friendly icons, compact horizontal hourly data, simple daily rows, and uncluttered weather cards.

---

# 49. References

Open-Meteo:

```text
https://open-meteo.com/
https://open-meteo.com/en/docs
https://open-meteo.com/en/docs/geocoding-api
https://open-meteo.com/en/docs/air-quality-api
```

Meteocons:

```text
https://github.com/basmilius/meteocons
https://meteocons.com/
```

Open-Meteo map UI and weather layer:

```text
https://github.com/open-meteo/maps
https://github.com/open-meteo/weather-map-layer
```

MapLibre:

```text
https://maplibre.org/
```

---

# 50. Priority order

When trade-offs are necessary, use this priority:

```text
1. Correct weather data
2. Fast iPhone PWA UX
3. Visual similarity to intended design
4. Small bundle / zero-server GitHub Pages footprint
5. Offline behavior
6. Map
7. Extra effects
```

A working fast weather app is more important than decorative complexity.
