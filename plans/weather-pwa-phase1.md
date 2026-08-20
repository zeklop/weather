---
title: План — Weather PWA Phase 1
created: 2026-08-20
tags: [plan]
status: draft
---

# План: Weather PWA — Phase 1

**Дата:** 2026-08-20
**Статус:** draft

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
  1. sunrise или sunset отсутствуют (null/undefined) → fallback-окно 07:00–19:00 wall-time, `source: 'fallback'`;
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
- [ ] SvelteKit 5 + TS + adapter-static + vitest: `npx sv create . --template minimal --types ts --no-add-ons` (или руками)
- [ ] `svelte.config.js`: adapter-static, `paths.base` из `PUBLIC_BASE_PATH`
- [ ] Корневой `+layout.ts`: `export const prerender = true; export const trailingSlash = 'always'`
- [ ] `vite.config.ts`: `@vite-pwa/sveltekit` (регистрация SW), aliases `$lib`
- [ ] `.gitignore`, первый коммит
- [ ] CSS-переменные (light theme §10), системный шрифт, safe-areas, touch targets 44px

### Фаза 1. Слой данных (TDD)
- [ ] `src/lib/types.ts` — `Location`, `CurrentWeather`, `HourForecast`, `DayForecast`, `ForecastPayload` (§33; payload включает `timezone`)
- [ ] `src/lib/weather/wmo.ts` — `getWeatherVisual(code): WeatherVisual` (§8.3): все WMO-коды, русские лейблы. Тест на каждый код
- [ ] `src/lib/weather/units.ts` — `hpaToMmhg`, `formatTemp` (Unicode `−`), `formatWind` (м/с). Тесты
- [ ] `src/lib/weather/direction.ts` — 8 румбов по градусам. Тесты
- [ ] `src/lib/weather/format.ts` — время/день/«Сейчас»: HH:MM строковым срезом, дата/день недели через `Intl` + `Date.UTC`/`timeZone:'UTC'` (без TZ-сдвигов). Тесты: чужая TZ + DST
- [ ] `src/lib/weather/dayNight.ts` — `isDay(at, sunrise, sunset): DayResult` по правилам контракта (норма / cross-midnight / вырожденный / fallback-окно с source). Тесты по матрице: день, ночь, границы, cross-midnight, вырожденный, отсутствующие sunrise/sunset, границы fallback-окна, DST, чужая TZ
- [ ] `src/lib/api/openMeteo.ts` — `getForecast(location)`: только запрашиваемые поля (§6), `timezone=auto`, `wind_speed_unit=ms`, нормализация (в т.ч. `timezone` в payload), validation ответа. Тест нормализации + malformed
- [ ] `src/lib/api/geocoding.ts` — `searchLocations(query)`, normalize в `Location` (name, admin1, country, countryCode, timezone)
- [ ] `src/lib/cache/forecastCache.ts` — runtime `Map` (cap) + localStorage (max entries, LRU, budget, миграции, `QuotaExceededError` → eviction), ключ `forecast:{lat4}:{lon4}`, SWR: fresh <15 мин, stale <6 ч, offline любой с меткой. Тесты свежести, LRU, битого JSON

### Фаза 2. Хранилища и логика (runes, *.svelte.ts)
- [ ] `src/lib/stores/location.svelte.ts` — default Москва (55.7558, 37.6173), персист, геолокация после UI; deny/unavailable → не напоминать
- [ ] `src/lib/stores/favorites.svelte.ts` — список полных `Location` (с timezone), localStorage, звезда на Home добавляет/удаляет текущий город
- [ ] `src/lib/stores/settings.svelte.ts` — тема «Светлая» (Phase 2 — тёмная), «последнее обновление»
- [ ] `src/lib/stores/forecast.svelte.ts` — SWR: кэш-хит → мгновенно, stale → фон-обновление, refresh по `visibilitychange`/`pageshow` и смене локации, offline → последний кэш + timestamp; ошибки forecast/geocoding → состояние ошибки с ретраем; малый refresh-индикатор, UI не бланкуется

### Фаза 3. UI (mobile-first 390×844)
- [ ] `+layout.svelte` — header (Москва + поиск + звезда), bottom nav 4 таба (Главная/Карта/Избранное/Настройки), safe-areas; desktop: центр, max-width 780–980 (nice-to-have, не блокирует §44)
- [ ] Home `/` (§30): hero (темп 64–78px, иконка, ощущается, ветер+давление), near-term card (детерминированная эвристика по hourly-осадкам), часовой rail («Сейчас» + ≥24ч, скролл, подсветка часа, вероятность осадков если значима), today card, 5–7 дней
- [ ] `/forecast`: почасовой столбец (время|иконка|темп|осадки|ветер) + 10 дней с инлайн-разворотом (инлайн — nice-to-have, можно свернуть при риске срока)
- [ ] `/map`: placeholder без MapLibre («Карта — в следующей версии»), навигация рабочая, не 404
- [ ] `/favorites`: список с температурой (кэш <30 мин или параллельный запрос при открытии, без поллинга), тап → выбор + переход на Home
- [ ] `/settings`: тема «Светлая», локация (геолокация + город), «Последнее обновление» + «Обновить», About (Open-Meteo, Meteocons), подсказка установки PWA (§35: только Safari iPhone/iPad, не standalone, один раз, не modal)
- [ ] Поиск: SearchSheet — старт с 2 символов, дебаунс 250–350мс, ≤8 результатов (город/регион/страна), loading/empty/error состояния, клавиатурная навигация, отмена устаревших запросов, выбор → смена города
- [ ] Скелетоны при первом запуске, ошибка «Не удалось обновить прогноз…» + ретрай, offline-сообщение, offline без кэша — отдельное состояние
- [ ] Meteocons локально в `static/icons/weather/`, `WeatherIcon.svelte` (day/night по `isDay`), hero 76–96px, без анимаций в v1
- [ ] Иконки приложения: источник — `static/icons/app/icon-source.svg` (оригинал: синий квадрат + облако + солнце); скрипт `scripts/generate-icons.mjs` (devDependency `sharp`), npm-скрипт `icons` (запуск до build и в CI): PNG 180 (apple-touch), 192, 512; `maskable` 512 — отдельная композиция с safe-zone padding (не копия обычной); готовые PNG коммитим как fallback
- [ ] CI-проверка иконок `scripts/check-icons.mjs` (npm-скрипт `check:icons`): численный safe-zone-инвариант — все непрозрачные пиксели maskable-иконки внутри центрального круга радиуса `0.4 * size` (для 512 → ≤204.8px, диаметр 409.6px = 80%); размеры файлов 180/192/512 проверяются точно

### Фаза 4. PWA и деплой
- [ ] Manifest через `@vite-pwa/sveltekit` (§11: standalone, portrait-primary, #F5F7FA), apple meta-теги; `start_url`/`scope`/icon URLs base-safe
- [ ] SW: NetworkFirst для `api.open-meteo.com` (`networkTimeoutSeconds: 3`, кэшировать только успешные ответы, `maxEntries`/expiry), CacheFirst статика, версии кэшей + чистка; API-ошибки приложения (таймауты, malformed, geocoding) — вне SW, через `AbortController` в api-слое
- [ ] `.github/workflows/deploy.yml` (§40): push→main + workflow_dispatch, `npm ci → check → test → check:icons → build` с `PUBLIC_BASE_PATH=/weather`, permissions `contents: read / pages: write / id-token: write`, upload-pages-artifact + deploy-pages
- [ ] Smoke-сценарии деплоя: `https://zeklop.github.io/weather/` (все маршруты + refresh + SW scope) и root-mode для custom domain
- [ ] Скриншоты Home/Forecast/Favorites (iPhone-вьюпорт) для README; Details/Map — исключение §46 (в Phase 2)
- [ ] `README.md` (§42), `THIRD_PARTY_NOTICES.md` (§43), `Caddyfile` (§40 B), `IMPLEMENTATION_NOTES.md` (§46: исключение по скриншотам Details/Map, девиация имени SW `sw.js` вместо `service-worker.js`, девиация тёмной темы)

## Критерии готовности (Phase 1, §45 + правки ревью)
- [ ] Устанавливается на iPhone Home Screen, открывается в standalone, safe areas корректны
- [ ] Москва грузится, поиск переключает город
- [ ] Текущие условия, ≥24 часовых значений, 10 дней, WMO-лейблы, иконки day/night
- [ ] Давление в мм рт. ст., ветер в м/с, время в TZ локации (не телефонной)
- [ ] Избранное персистит после перезапуска, последний прогноз виден offline
- [ ] Refresh не бланкует UI
- [ ] В Home-бандле нет кода карты
- [ ] Прод на GitHub Pages без сервера, refresh работает на `/forecast/`, `/map/`, `/favorites/`, `/settings/`
- [ ] `/map` отдаёт graceful placeholder (не 404), навигация и CTA «Показать на карте» ведут на него
- [ ] Subpath `/weather/` работает, SW scope корректен, manifest/SW/иконки доступны под base
- [ ] Root-mode (custom domain) собирается с `PUBLIC_BASE_PATH=''` и работает
- [ ] Вёрстка сверена с мокапом на 390×844
- [ ] VPS-фолбэк — чистая статика без Node
- [ ] Нет аналитики/рекламы, нет Yandex image/font/code assets
- [ ] Lighthouse PWA без критичных ошибок

## Риски
- iOS PWA SW на GitHub Pages (subpath + scope) — тестировать рано; при нерешаемой проблеме документировать в IMPLEMENTATION_NOTES (§47.14)
- `@vite-pwa/sveltekit` версия под SvelteKit 5 — сверить совместимость до начала Фазы 0; при конфликте — ручной `vite-plugin-pwa` с его же генерацией manifest (владелец всё равно один — plugin)
- Base path в абсолютных ссылках — только `%sveltekit.assets%`/относительные, никаких хардкодов
- `Intl` на iOS Safari — проверить поддержку таймзон (современные iOS ок); fallback — ручной offset-расчёт
- Начальный JS-бандл — следить за размером, lazy-load некритичного
- Генерация PNG иконок — devDependency; при сбое использовать закоммиченные PNG

## Открытые вопросы
- [ ] Подтвердить имя репозитория `weather` (для base path) — сейчас принято по имени каталога
- [ ] Node-версия локально (workflow ставит 22) — проверить и зафиксировать `.nvmrc`/engines

---

## Итог
*Заполняется по завершении.*