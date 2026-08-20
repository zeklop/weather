# Weather PWA / Погода

<p align="center">
  <a href="#english"><strong>English</strong></a> &nbsp;|&nbsp; <a href="#русский"><strong>Русский</strong></a>
</p>

---

<a name="english"></a>
## English

A lightweight, high-performance, offline-capable Progressive Web Application (PWA) for weather forecasts inspired by the clean visual density and information hierarchy of modern weather apps. Built with **SvelteKit 5** (runes), the open **Open-Meteo API**, and vector **Meteocons**.

Engineered mobile-first for **iOS Safari** (standalone PWA mode) and modern desktop browsers, completely static (zero server-side runtime footprint), with resilient offline caching, and deployable to **GitHub Pages** or any static web server.

### Features (Phase 1)

- **Home Screen Hero:** Large temperature display in °C with Unicode minus (`−`), weather conditions, feels-like temperature, wind speed in m/s with 8-point compass direction, and atmospheric pressure in mmHg.
- **Near-Term Precipitation Heuristic:** Deterministic 2-hour rain/snow probability heuristic based on hourly data with direct map link.
- **Hourly Forecast Rail:** Smooth horizontal scrolling forecast («Now» + 24+ hours) with current-hour highlighting, day/night weather icons, and precipitation probability badges.
- **10-Day Forecast:** Daily summary on Home and detailed breakdown on the `/forecast/` page.
- **City Search & Geocoding:** Powered by Open-Meteo Geocoding API (300 ms debounce, queries starting at 2 characters, up to 8 results with region/country, and automatic request cancellation).
- **Favorites:** Fast local storage of favourite locations (`localStorage`), quick switching, and cached temperature previews on `/favorites/`.
- **Settings:** City selection, GPS geolocation request, last updated status with manual refresh trigger, and iOS installation guidance.
- **Offline Mode & Caching:** Two-layer cache (in-memory `Map` + versioned `localStorage` with LRU eviction, 8-city cap, and 1 MB budget), SWR strategy (fresh < 15 min, stale < 6 hours, offline fallback with timestamp).
- **Vector Icons:** High-quality SVG Meteocons with dynamic day/night switching based on wall-time solar calculations (sunrise/sunset).

### Phase 2 Roadmap

- **Bilingual Interface (i18n):** English by default, Russian language option, language switcher in Settings, localized WMO descriptions, units, compass points, and localized geocoding queries ([`plans/weather-pwa-phase2.md`](plans/weather-pwa-phase2.md)).
- **Platform-Specific PWA Prompts:** Native 1-click install banner on Android (`beforeinstallprompt`) and top banner with animated step-by-step installation instructions for iOS Safari.
- **Smart Weather Change Alerts:** Multi-tier notifications (in-app, local notifications, periodic sync) for approaching precipitation, severe thunderstorms, frost alerts, and sudden temperature shifts.
- **Dark Mode:** System / Light / Dark theme support with dedicated CSS custom properties.
- **Interactive Radar Map:** MapLibre GL JS precipitation overlay on `/map/`.
- **Precipitation Chart:** Interactive 24-hour SVG curve chart.
- **Expanded Weather Metrics:** UV index, air quality, dew point, and humidity breakdown.

### Tech Stack

- **Framework:** [SvelteKit 5](https://kit.svelte.dev/) (Svelte 5 runes `$state`, `$derived`, `$effect.root`)
- **Language:** TypeScript (strict mode)
- **Bundler & PWA:** [Vite](https://vitejs.dev/) + [@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/) (Workbox Service Worker, offline fallback)
- **Adapter:** `@sveltejs/adapter-static` (full static prerender of all routes with `trailingSlash: 'always'`)
- **Styling:** Handcrafted CSS with CSS variables, iOS Safe Areas (`env(safe-area-inset-*)`), and zero UI bloat (no Tailwind / bulky component libraries)
- **Weather Data & Geocoding:** [Open-Meteo API](https://open-meteo.com/) (no API keys required)
- **Weather Icons:** [Meteocons](https://meteocons.com/) (SVG, MIT License)
- **App Icons:** Original vector SVG + automated PNG generation via `sharp`

### Local Development

#### Requirements
- Node.js 22+ (or Node.js 20+)
- npm 10+

#### Start Dev Server

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Or start with automatic browser launch
npm run dev -- --open
```

### Quality Assurance & Building

```bash
# Typecheck TypeScript and Svelte diagnostics
npm run check

# Run Vitest test suites (14 suites, 137+ tests)
npm test

# Verify PWA icon dimensions and maskable safe-zone invariant (radius <= 0.4 * size)
npm run check:icons

# Regenerate PNG icons from SVG source (static/icons/app/icon-source.svg)
npm run icons

# Build static production bundle (outputs to build/)
npm run build
```

### Deployment

#### 1. GitHub Pages (Primary)

Live application: **`https://zeklop.github.io/weather/`**

To build for a repository subpath deployment:

```bash
PUBLIC_BASE_PATH=/weather npm run build
```

Automated CI/CD is configured in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It runs on pushes to `main` or manual trigger (`workflow_dispatch`), validates checks and tests, generates static assets, and deploys to GitHub Pages.

Repository configuration: `Settings → Pages → Build and deployment → Source: GitHub Actions`.

#### 2. Custom Domain / Root Mode (`PUBLIC_BASE_PATH=''`)

When serving from the root of a domain (e.g. `https://weather.example.com/`):

```bash
PUBLIC_BASE_PATH='' npm run build
# or simply:
npm run build
```

#### 3. VPS / Static Web Server (Caddy)

Since the app is 100% static, no Node.js runtime is required on the server. A production-ready [`Caddyfile`](Caddyfile) is included in the repository.

### Installing PWA on iOS (Safari)

1. Open **`https://zeklop.github.io/weather/`** in Safari on iPhone.
2. Tap the **Share** button (box with an upward arrow in the bottom toolbar).
3. Scroll down and select **«Add to Home Screen»**.
4. Tap **«Add»** in the top right corner.
5. Launch the app from your Home Screen for a native standalone fullscreen experience with offline support.

---

<a name="русский"></a>
## Русский

Лёгкое, быстрое и автономное Progressive Web Application (PWA) для прогноза погоды в стиле визуальной иерархии современных погодных приложений. Построено на **SvelteKit 5** с использованием рун (`runes`), открытого API **Open-Meteo** и векторных иконок **Meteocons**.

Приложение ориентировано на мобильный опыт в **iOS Safari** (PWA standalone mode), полностью статично (zero-server footprint), поддерживает работу в оффлайне и развёртывается на **GitHub Pages** или любом статическом веб-сервере.

### Возможности (Фаза 1)

- **Главный экран:** крупная температура, погодные условия, ощущаемая температура, скорость ветра (м/с) с 8 румбами и атмосферное давление (мм рт. ст.).
- **Ближайшие часы:** карточка краткосрочного прогноза осадков на 2 часа (детерминированная эвристика) с быстрым переходом к карте.
- **Почасовой прогноз:** горизонтальный скролл-рейл («Сейчас» + 24+ часа) с выделением текущего часа, day/night иконками и вероятностью осадков.
- **Прогноз на 10 дней:** сводка «Сегодня» и подробный список на 10 дней на странице `/forecast/`.
- **Поиск городов:** поиск по базе геокодинга Open-Meteo (дебаунс 300 мс, запрос от 2 символов, до 8 результатов с регионом и страной, отмена устаревших запросов).
- **Избранное:** сохранение городов в `localStorage`, быстрый переход и просмотр закэшированных температур на странице `/favorites/`.
- **Настройки:** переключение города, запрос геолокации, статус последнего обновления с кнопкой принудительного обновления и справка по установке.
- **Оффлайн-режим и кэширование:** двухуровневый кэш (runtime Map + версионированный localStorage с LRU-вытеснением, лимитом на 8 городов и бюджетом 1 МБ), SWR-стратегия (fresh < 15 мин, stale < 6 ч, offline любой давности с индикацией времени сохранения).
- **Векторные иконки:** качественные SVG-иконки Meteocons с автоматическим переключением день/ночь на основе времени восхода и заката в таймзоне локации.

### Планы на Фазу 2 (Roadmap)

- **Двуязычный интерфейс (i18n):** английский язык по умолчанию, русский язык по выбору, переключатель языка в Настройках, локализованные описания WMO, единицы, румбы и локализованный геокодинг ([`plans/weather-pwa-phase2.md`](plans/weather-pwa-phase2.md)).
- **Платформенные баннеры установки PWA:** верхний баннер с нативной кнопкой установки для Android (`beforeinstallprompt`) и верхний баннер с вызовом интерактивной пошаговой инструкции для iOS Safari.
- **Умные оповещения об изменении погоды:** система уведомлений (in-app алерты, системные уведомления, Periodic Sync) о приближении дождя/снега, грозах, заморозках и резких скачках температуры.
- **Тёмная тема:** поддержка системной, светлой и тёмной тем через CSS переменные.
- **Интерактивная карта осадков:** радарный слой на базе MapLibre GL JS на странице `/map/`.
- **График осадков:** интерактивный суточный SVG-график.
- **Расширенные метеопараметры:** UV-индекс, качество воздуха, влажность и точка росы.

### Стек технологий

- **Фреймворк:** [SvelteKit 5](https://kit.svelte.dev/) (Svelte 5 runes `$state`, `$derived`, `$effect.root`)
- **Язык:** TypeScript (строгий режим)
- **Сборщик и PWA:** [Vite](https://vitejs.dev/) + [@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/) (Workbox Service Worker, offline navigation fallback)
- **Адаптер:** `@sveltejs/adapter-static` (полный pre-render всех страниц с `trailingSlash: 'always'`)
- **Стилизация:** Чистый CSS с переменными темы, поддержкой iOS Safe Areas (`env(safe-area-inset-*)`) и минимальным размером бандла (без Tailwind / UI-библиотек)
- **Данные о погоде и геокодинг:** [Open-Meteo API](https://open-meteo.com/) (без API-ключей)
- **Иконки погоды:** [Meteocons](https://meteocons.com/) (SVG, MIT License)
- **Иконки приложения:** Оригинальный SVG + генерация PNG через `sharp`

### Локальная разработка

#### Требования
- Node.js 22+ (или Node.js 20+)
- npm 10+

#### Запуск dev-сервера

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера Vite
npm run dev

# Либо с автоматическим открытием в браузере
npm run dev -- --open
```

### Сборка и проверки качества

```bash
# Проверка типов TypeScript и диагностики Svelte
npm run check

# Запуск тестов (Vitest — 14 тест-сьютов, 137+ тестов)
npm test

# Проверка корректности PNG-иконок PWA и численного safe-zone инварианта
npm run check:icons

# Регенерация PNG-иконок из SVG-исходника (при обновлении static/icons/app/icon-source.svg)
npm run icons

# Статическая сборка (результат в каталоге build/)
npm run build
```

### Развёртывание

#### 1. GitHub Pages (Основной метод)

Приложение развёрнуто по адресу: **`https://zeklop.github.io/weather/`**

Для деплоя в субпатч репозитория GitHub Pages используется сборка с `PUBLIC_BASE_PATH=/weather`:

```bash
PUBLIC_BASE_PATH=/weather npm run build
```

Автоматический CI/CD workflow настроен в файле [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Он запускается при пуше в ветку `main` или вручную (`workflow_dispatch`), прогоняет проверки (`check`, `test`, `check:icons`), собирает сайт и публикует артефакт в GitHub Pages.

Настройки репозитория на GitHub:
`Settings → Pages → Build and deployment → Source: GitHub Actions`.

#### 2. Кастомный домен / Root Mode (`PUBLIC_BASE_PATH=''`)

Если приложение раздаётся из корня домена (например, `https://weather.example.com/`):

```bash
PUBLIC_BASE_PATH='' npm run build
# или просто:
npm run build
```

Все пути к манифесту, Service Worker и статическим ресурсам автоматически переключаются на корень `/`.

#### 3. VPS / Статический веб-сервер (Caddy)

Так как приложение является полностью статическим, для него не требуется Node.js на сервере. В репозитории присутствует готовый пример конфигурации [`Caddyfile`](Caddyfile).

### Установка PWA на iPhone (iOS Safari)

1. Откройте страницу **`https://zeklop.github.io/weather/`** в браузере Safari на iPhone.
2. Нажмите кнопку **«Поделиться»** (иконка со стрелкой вверх в нижней панели Safari).
3. Прокрутите список вниз и выберите **«На экран "Домой"»** (Add to Home Screen).
4. Нажмите **«Добавить»** в правом верхнем углу.
5. Запустите приложение с домашнего экрана: оно откроется в полноэкранном standalone-режиме без элементов интерфейса браузера, с поддержкой жестов и кэшированием для работы без доступа к сети.

---

## Attribution & Licenses / Атрибуция и лицензии

- **Weather data & geocoding / Погодные данные и геокодинг:** [Open-Meteo](https://open-meteo.com/) — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Weather icons / Иконки погоды:** [Meteocons](https://github.com/basmilius/meteocons) by Bas Milius — MIT License.
- **Interactive maps / Интерактивные карты (Phase 2):** [MapLibre GL JS](https://maplibre.org/) — BSD 3-Clause.

Detailed license information is available in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
