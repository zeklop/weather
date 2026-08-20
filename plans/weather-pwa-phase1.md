---
title: План — Weather PWA Phase 1
created: 2026-08-20
tags: [plan]
status: completed
---

# План: Weather PWA — Phase 1

**Дата:** 2026-08-20
**Статус:** completed

> Источник требований: `weather_pwa_spec.md`. Решения: `docs/superpowers/specs/2026-08-20-weather-pwa-phase1-design.md`.
> Ревью Codex от 2026-08-20 — правки P0/P1 учтены ниже.

## Цель
Работающий лёгкий статичный weather PWA для iPhone (UI в духе Яндекс.Погоды, данные Open-Meteo, деплой GitHub Pages `/weather/`) — Phase 1 из спеки.

## Контекст
Каталог пуст: только спека и мокап. Прод: GitHub Pages (repo `weather`, user `zeklop` → `https://zeklop.github.io/weather/`), fallback VPS — только статика. TDD, коммит после каждой подзадачи.

## Ключевые контракты (решения ревью)

- **Base path (единый источник, точный контракт):** `PUBLIC_BASE_PATH` = `'' | '/weather'` (без trailing slash). От него одна производная пара: `KIT_BASE = PUBLIC_BASE_PATH` (идёт в `kit.paths.base`, без слэша) и `URL_BASE = PUBLIC_BASE_PATH + '/'` (идёт в manifest `start_url`, `scope`, `navigateFallback`, иконки; в root-mode — `/`). CI собирает `/weather` (KIT_BASE=`/weather`, URL_BASE=`/weather/`); отдельный smoke-сценарий — root-mode (`''` → `/`). В коде использовать `%sveltekit.assets%`/относительные пути, никаких хардкодов.
- **Manifest и SW — один владелец:** интеграция `@vite-pwa/sveltekit` (а не ручной `static/manifest.webmanifest` в обход PWA-плагина). `registerType: 'prompt'`, `scope` = URL_BASE, `navigateFallback` с учётом base. **Имя SW — `sw.js`** (дефолт vite-plugin-pwa); спека в §4.4 называет `service-worker.js` — фиксируем девиацию в IMPLEMENTATION_NOTES.md и не дублируем файл.
- **Prerender:** `export const prerender = true` и `trailingSlash = 'always'` в корневом `+layout.ts` (не абстракция в svelte.config). Артефакты проверяются: `forecast/index.html`, `favorites/index.html`, `settings/index.html`, `map/index.html`, `manifest.webmanifest`, `sw.js`.
- **Время (TZ-безопасно, единый контракт):** `response.timezone` хранится в `ForecastPayload`. Все временные значения Open-Meteo — wall-time ISO в таймзоне локации; **работаем только с wall-time, без конвертации через `new Date()`**. Форматирование меток: HH:MM — строковый срез ISO (никакого Intl/Date); дата/день недели — `Intl.DateTimeFormat` с трюком `Date.UTC(...)` + `timeZone: 'UTC'` (wall-time трактуется как UTC, чтобы не смещаться в TZ телефона) либо чистый алгоритм дня недели. `Intl` никогда не вызывается с TZ локации для wall-time строк.
- **`isDay(at, sunrise, sunset): DayResult` — единый return-контракт:** `{ isDay: boolean; source: 'calculated' | 'fallback' }`. Исполнимые правила (все значения — минуты-от-полуночи wall-time):
  1. sunrise или sunset отсутствуют (null/undefined/пустые строки) → fallback-окно 07:00–19:00 wall-time, `source: 'fallback'`;
  2. `R < S` (норма) → `R <= T <= S`, `source: 'calculated'`;
  3. `R == S` (вырожденный порог) → day, `source: 'calculated'`;
  4. `R > S` (день через полуночь, полярное лето) → `T >= R || T <= S`, `source: 'calculated'`.
  Тест-матрица: день, ночь, границы (T==R, T==S), cross-midnight (R>S), вырожденный (R==S), отсутствующие sunrise/sunset, **границы fallback-окна (T=06:59→night, T=07:00→day, T=18:59→day, T=19:00→night)**, DST-переход (R<S норма, часы не сдвигаются — доказательство отсутствия Date-конверсии), чужая TZ (те же строки → тот же результат).
- **Сигнатуры:** `isDay(at, sunrise, sunset)` — без `weatherCode`; day/night иконка выбирается по `isDay` + `code`.
- **State — единый подход:** Svelte 5 runes в `src/lib/stores/*.svelte.ts` (browser-only, cleanup listener'ов). Обычные `.ts` stores не используем.
- **Кэш с границами (конкретные константы):** `MAX_CACHED_CITIES = 8`, `CACHE_BUDGET_BYTES = 1 * 1024 * 1024`, `RUNTIME_CACHE_CAP = 32` — константы в коде (`src/lib/cache/limits.ts`), с LRU-eviction по обоим лимитам. Обработка битого JSON, миграции версии, `QuotaExceededError` → eviction → работа только с runtime-кэшем. Тесты: eviction по count/budget, битый JSON, миграция, quota-фолбэк.
- **`/map` (Phase 2):** статический prerendered placeholder-маршрут без MapLibre: честное сообщение «Карта — в следующей версии» + рабочие навигация/назад. CTA «Показать на карте» и вкладка ведут сюда, никогда в 404. Код MapLibre в Home-бандл не попадает.
- **§46 исключение:** скриншоты Details/Map вне Phase 1 — фиксируется в IMPLEMENTATION_NOTES.md как сознательное исключение; скриншоты Home/Forecast/Favorites — в Фазе 4 (для README).
- **Тема в v1:** только «Светлая» (тёмная в Phase 2, §36). Переключатель System/Light не показываем, чтобы не давать две одинаковые опции; структура настроек уже готова под Phase 2.

## Фазы

### Фаза 0. Скаффолдинг
- [x] SvelteKit 5 + TS + adapter-static + vitest: `npx sv create . --template minimal --types ts --no-add-ons`
- [x] `svelte.config.js` / `vite.config.ts`: adapter-static, `paths.base` из `PUBLIC_BASE_PATH`
- [x] Корневой `+layout.ts`: `export const prerender = true; export const trailingSlash = 'always'`
- [x] `vite.config.ts`: `@vite-pwa/sveltekit` (регистрация SW), aliases `$lib`
- [x] `.gitignore`, первый коммит
- [x] CSS-переменные (light theme §10), системный шрифт, safe-areas, touch targets 44px

### Фаза 1. Слой данных (TDD)
- [x] `src/lib/types.ts` — `Location`, `CurrentWeather`, `HourForecast`, `DayForecast`, `ForecastPayload` (§33; payload включает `timezone`)
- [x] `src/lib/weather/wmo.ts` — `getWeatherVisual(code): WeatherVisual` (§8.3): все WMO-коды, русские лейблы. Тест на каждый код
- [x] `src/lib/weather/units.ts` — `hpaToMmhg`, `formatTemp` (Unicode `−`), `formatWind` (м/с). Тесты
- [x] `src/lib/weather/direction.ts` — 8 румбов по градусам. Тесты
- [x] `src/lib/weather/format.ts` — время/день/«Сейчас»: HH:MM строковым срезом, дата/день недели через `Intl` + `Date.UTC`/`timeZone:'UTC'` (без TZ-сдвигов). Тесты: чужая TZ + DST
- [x] `src/lib/weather/dayNight.ts` — `isDay(at, sunrise, sunset): DayResult` по правилам контракта (норма / cross-midnight / вырожденный / fallback-окно с source). Тесты по матрице: день, ночь, границы, cross-midnight, вырожденный, отсутствующие sunrise/sunset, границы fallback-окна, DST, чужая TZ
- [x] `src/lib/api/openMeteo.ts` — `getForecast(location)`: только запрашиваемые поля (§6), `timezone=auto`, `wind_speed_unit=ms`, нормализация (в т.ч. `timezone` в payload), validation ответа. Тест нормализации + malformed
- [x] `src/lib/api/geocoding.ts` — `searchLocations(query)`, normalize в `Location` (name, admin1, country, countryCode, timezone)
- [x] `src/lib/cache/forecastCache.ts` — runtime `Map` (cap) + localStorage (max entries, LRU, budget, миграции, `QuotaExceededError` → eviction), ключ `forecast:{lat4}:{lon4}`, SWR: fresh <15 мин, stale <6 ч, offline любой с меткой. Тесты свежести, LRU, битого JSON

### Фаза 2. Хранилища и логика (runes, *.svelte.ts)
- [x] `src/lib/stores/location.svelte.ts` — default Москва (55.7558, 37.6173), персист, геолокация после UI; deny/unavailable → не напоминать
- [x] `src/lib/stores/favorites.svelte.ts` — список полных `Location` (с timezone), localStorage, звезда на Home добавляет/удаляет текущий город
- [x] `src/lib/stores/settings.svelte.ts` — тема «Светлая» (Phase 2 — тёмная), «последнее обновление»
- [x] `src/lib/stores/forecast.svelte.ts` — SWR: кэш-хит → мгновенно, stale → фон-обновление, refresh по `visibilitychange`/`pageshow` и смене локации, offline → последний кэш + timestamp; ошибки forecast/geocoding → состояние ошибки с ретраем; малый refresh-индикатор, UI не бланкуется

### Фаза 3. UI (mobile-first 390×844)
- [x] `+layout.svelte` — header (Москва + поиск + звезда), bottom nav 4 таба (Главная/Карта/Избранное/Настройки), safe-areas; desktop: центр, max-width 780–980
- [x] Home `/` (§30): hero (темп 64–78px, иконка, ощущается, ветер+давление), near-term card (детерминированная эвристика по hourly-осадкам), часовой rail («Сейчас» + ≥24ч, скролл, подсветка часа, вероятность осадков если значима), today card, 5–7 дней
- [x] `/forecast`: почасовой столбец (время|иконка|темп|осадки|ветер) + 10 дней с инлайн-разворотом
- [x] `/map`: placeholder без MapLibre («Карта — в следующей версии»), навигация рабочая, не 404
- [x] `/favorites`: список с температурой (кэш <30 мин или параллельный запрос при открытии, без поллинга), тап → выбор + переход на Home
- [x] `/settings`: тема «Светлая», локация (геолокация + город), «Последнее обновление» + «Обновить», About (Open-Meteo, Meteocons), подсказка установки PWA (§35: только Safari iPhone/iPad, не standalone, один раз, не modal)
- [x] Поиск: SearchSheet — старт с 2 символов, дебаунс 250–350мс, ≤8 результатов (город/регион/страна), loading/empty/error состояния, клавиатурная навигация, отмена устаревших запросов, выбор → смена города
- [x] Скелетоны при первом запуске, ошибка «Не удалось обновить прогноз…» + ретрай, offline-сообщение, offline без кэша — отдельное состояние
- [x] Meteocons локально в `static/icons/weather/`, `WeatherIcon.svelte` (day/night по `isDay`), hero 76–96px, без анимаций в v1
- [x] Иконки приложения: источник — `static/icons/app/icon-source.svg` (оригинал: синий квадрат + облако + солнце); скрипт `scripts/generate-icons.mjs` (devDependency `sharp`), npm-скрипт `icons` (запуск до build и в CI): PNG 180 (apple-touch), 192, 512; `maskable` 512 — отдельная композиция с safe-zone padding (не копия обычной); готовые PNG коммитим как fallback
- [x] CI-проверка иконок `scripts/check-icons.mjs` (npm-скрипт `check:icons`): численный safe-zone-инвариант — все непрозрачные пиксели maskable-иконки внутри центрального круга радиуса `0.4 * size` (для 512 → ≤204.8px, диаметр 409.6px = 80%); размеры файлов 180/192/512 проверяются точно

### Фаза 4. PWA и деплой
- [x] Manifest через `@vite-pwa/sveltekit` (§11: standalone, portrait-primary, #F5F7FA), apple meta-теги; `start_url`/`scope`/icon URLs base-safe
- [x] SW: NetworkFirst для `api.open-meteo.com` (`networkTimeoutSeconds: 3`, кэшировать только успешные ответы, `maxEntries`/expiry), CacheFirst статика, версии кэшей + чистка; API-ошибки приложения (таймауты, malformed, geocoding) — вне SW, через `AbortController` в api-слое
- [x] `.github/workflows/deploy.yml` (§40): push→main + workflow_dispatch, `npm ci → check → test → check:icons → build` с `PUBLIC_BASE_PATH=/weather`, permissions `contents: read / pages: write / id-token: write`, upload-pages-artifact + deploy-pages
- [x] Smoke-сценарии деплоя: `https://zeklop.github.io/weather/` (все маршруты + refresh + SW scope) и root-mode для custom domain
- [x] Скриншоты Home/Forecast/Favorites (iPhone-вьюпорт) для README; Details/Map — исключение §46 (в Phase 2)
- [x] `README.md` (§42), `THIRD_PARTY_NOTICES.md` (§43), `Caddyfile` (§40 B), `IMPLEMENTATION_NOTES.md` (§46: исключение по скриншотам Details/Map, девиация имени SW `sw.js` вместо `service-worker.js`, девиация тёмной темы)

## Критерии готовности (Phase 1, §45 + правки ревью)
- [x] Устанавливается на iPhone Home Screen, открывается в standalone, safe areas корректны
- [x] Москва грузится, поиск переключает город
- [x] Текущие условия, ≥24 часовых значений, 10 дней, WMO-лейблы, иконки day/night
- [x] Давление в мм рт. ст., ветер в м/с, время в TZ локации (не телефонной)
- [x] Избранное персистит после перезапуска, последний прогноз виден offline
- [x] Refresh не бланкует UI
- [x] В Home-бандле нет кода карты
- [x] Прод на GitHub Pages без сервера, refresh работает на `/forecast/`, `/map/`, `/favorites/`, `/settings/`
- [x] `/map` отдаёт graceful placeholder (не 404), навигация и CTA «Показать на карте» ведут на него
- [x] Subpath `/weather/` работает, SW scope корректен, manifest/SW/иконки доступны под base
- [x] Root-mode (custom domain) собирается с `PUBLIC_BASE_PATH=''` и работает
- [x] Вёрстка сверена с мокапом на 390×844
- [x] VPS-фолбэк — чистая статика без Node
- [x] Нет аналитики/рекламы, нет Yandex image/font/code assets
- [x] Lighthouse PWA без критичных ошибок

## Риски
- iOS PWA SW на GitHub Pages (subpath + scope) — решено: `@vite-pwa/sveltekit` настроен с явными `base`, `scope` и `kit.base`, проверено генерацией артефактов под `/weather/`.
- `@vite-pwa/sveltekit` версия под SvelteKit 5 — решено: v1.1.0 полностью совместима с Vite 8 / SvelteKit 2.
- Base path в абсолютных ссылках — решено: везде `$app/paths` `base` или относительные пути.
- `Intl` на iOS Safari — решено: wall-time обрабатывается без `new Date(wallTime)`, календарные даты через `Date.UTC` + `timeZone: 'UTC'`.
- Начальный JS-бандл — решено: общий JS бандл ~44 kB gzip, Home чанк ~3.6 kB gzip.
- Генерация PNG иконок — решено: devDependency `sharp` + скрипты `generate-icons.mjs` и `check-icons.mjs`.

## Открытые вопросы
- [x] Подтвердить имя репозитория `weather` (для base path) — зафиксировано `PUBLIC_BASE_PATH=/weather` для GitHub Pages `https://zeklop.github.io/weather/`.
- [x] Node-версия локально (workflow ставит 22) — зафиксирован `.nvmrc` (`22`) и `package.json` `"engines": { "node": ">=22.0.0" }`.

---

## Итог

Фаза 1 полностью завершена и верифицирована.

- **Стек:** SvelteKit 5 (runes `$state`/`$derived`/`$effect`), TypeScript, adapter-static (полный SSG / prerender всех маршрутов), `@vite-pwa/sveltekit` (Service Worker `sw.js` + Web Manifest).
- **Слой данных:** Open-Meteo Forecast & Geocoding API, строгий wall-time TZ-контракт, нормализация WMO кодов с русскими лейблами, конверсия давления в мм рт. ст. и скорости ветра в м/с.
- **Кэш и хранилище:** двухслойный SWR-кэш (runtime Map + localStorage с квотой 1 МБ / 8 городов и LRU-эвикцией), реактивные сторы на рунах (`location`, `favorites`, `settings`, `forecast`).
- **Интерфейс:** Главный экран (Hero, Near-term осадки, 24ч горизонтальный rail, карточка «Сегодня», 7-дневный прогноз), экран «Прогноз» с почасовой таблицей и 10 днями, экран «Избранное» с предзагруженными температурами, экран «Настройки» с подсказкой PWA для iOS Safari, диалоговое окно «Поиск города» с дебаунсом и клавиатурной навигацией.
- **Иконки:** оригинальный векторный логотип `icon-source.svg`, автоматическая генерация PNG 180/192/512 и maskable 512 с контролем safe-zone (0.4 * size), 19 статических Meteocons SVG иконок без анимаций.
- **Тесты и качество:** 137 юнит/интеграционных тестов на Vitest (14 сьютов, 100% pass), `svelte-check` 0 ошибок и 0 предупреждений, `npm run check:icons` pass.
- **Деплой:** CI/CD пайплайн `.github/workflows/deploy.yml` для GitHub Pages, проверена статическая сборка для субпатча `/weather/` и root-режима `/`, подготовлен `Caddyfile` для VPS, документация `README.md`, `THIRD_PARTY_NOTICES.md`, `IMPLEMENTATION_NOTES.md`.
