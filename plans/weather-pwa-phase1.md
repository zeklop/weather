---
title: План — Weather PWA Phase 1
created: 2026-08-20
tags: [plan]
status: draft
---

# План: Weather PWA — Phase 1

**Дата:** 2026-08-20
**Статус:** draft

> Источник требований: `weather_pwa_spec.md` (в корне репо). Решения: `docs/superpowers/specs/2026-08-20-weather-pwa-phase1-design.md`.

## Цель
Работающий лёгкий статичный weather PWA для iPhone (UI в духе Яндекс.Погоды, данные Open-Meteo, деплой GitHub Pages `/weather/`) — Phase 1 из спеки.

## Контекст
Каталог пуст: только спека и мокап. Прод: GitHub Pages (repo `weather`, user `zeklop` → `https://zeklop.github.io/weather/`), fallback VPS — только статика. Задачи вести в TDD, коммитить после каждой завершённой подзадачи.

## Фазы

### Фаза 0. Скаффолдинг
- [ ] Создать SvelteKit 5 + TS + adapter-static + vite-plugin-pwa + vitest в текущем каталоге (non-interactive: `npx sv create . --template minimal --types ts --no-add-ons` или руками)
- [ ] `svelte.config.js`: `adapter-static`, `prerender = true` для всех маршрутов; base path из `PUBLIC_BASE_PATH` (default `/weather`, пустой для custom domain)
- [ ] `vite.config.ts`: vite-plugin-pwa (см. Фазу 4), aliases `$lib`
- [ ] `.gitignore`, первый коммит
- [ ] Базовая вёрстка: CSS-переменные (light theme §10), системный шрифт, safe-areas, touch targets 44px

### Фаза 1. Слой данных (TDD)
- [ ] `src/lib/types.ts` — модели `Location`, `CurrentWeather`, `HourForecast`, `DayForecast`, `ForecastPayload` (§33)
- [ ] `src/lib/weather/wmo.ts` — `getWeatherVisual(code): WeatherVisual` (§8.3): все WMO-коды, русские лейблы, day/night иконки. Тест на каждый код
- [ ] `src/lib/weather/units.ts` — `hpaToMmhg`, `formatTemp` (Unicode `−`), `formatWind` (м/с). Тесты
- [ ] `src/lib/weather/direction.ts` — 8 румбов С/СВ/В/ЮВ/Ю/ЮЗ/З/СЗ по градусам. Тесты
- [ ] `src/lib/weather/format.ts` — время/день/«Сейчас» в таймзоне локации через `Intl.DateTimeFormat` (никогда phone-local tz). Тесты
- [ ] `src/lib/weather/dayNight.ts` — `isDay(weatherCode, sunriseISO, sunsetISO)`. Тесты
- [ ] `src/lib/api/openMeteo.ts` — `getForecast(location)`: только запрашиваемые поля (§6), `timezone=auto`, `wind_speed_unit=ms`, нормализация в модели §33. Тест нормализации
- [ ] `src/lib/api/geocoding.ts` — `searchLocations(query)`: `geocoding-api.open-meteo.com/v1/search`, normalize в `Location`
- [ ] `src/lib/cache/forecastCache.ts` — runtime `Map` + localStorage (версионированный JSON), ключ `forecast:{lat4}:{lon4}`, свежесть: fresh <15 мин, stale <6 ч, offline любой с меткой. Тесты свежести

### Фаза 2. Хранилища и логика
- [ ] `src/lib/stores/location.ts` — default Москва (55.7558, 37.6173), персист, геолокация после отрисовки UI, deny → не напоминать
- [ ] `src/lib/stores/favorites.ts` — список городов + localStorage, смена выбора
- [ ] `src/lib/stores/settings.ts` — тема System/Light (dark — Phase 2), единицы фикс, «последнее обновление»
- [ ] `src/lib/stores/forecast.ts` — SWR-состояние: кэш-хит → мгновенный показ, фон-обновление если stale, refresh по `visibilitychange`/`pageshow` и смене локации, offline → последний кэш + timestamp, ошибка → ретрай без бланка UI

### Фаза 3. UI (mobile-first 390×844)
- [ ] `+layout.svelte` — header (Москва + поиск + избранное), bottom nav 4 таба (Главная/Карта/Избранное/Настройки), safe-areas, десктоп: центр контента, max-width 780–980px
- [ ] Home `/` (§30): hero (темп 64–78px, иконка, ощущается, ветер+давление), near-term card (детерминированная эвристика по hourly-осадкам), часовой rail («Сейчас» + ≥24ч, скролл, подсветка часа, вероятность осадков если значима), today card, 5–7 дней
- [ ] `/forecast`: вертикальный почасовой столбец (время|иконка|темп|осадки|ветер) + 10 дней с инлайн-разворотом дня
- [ ] `/favorites`: список с температурой (кэш <30 мин или параллельный запрос при открытии, без поллинга), тап → выбор + переход на Home
- [ ] `/settings`: тема, локация (геолокация + город), «Последнее обновление» + «Обновить», About (Open-Meteo, Meteocons), подсказка установки PWA (§35)
- [ ] Поиск: SearchSheet — старт с 2 символов, дебаунс 250–350мс, ≤8 результатов, клавиатурная навигация, выбор → смена города
- [ ] Скелетоны при первом запуске, ошибка «Не удалось обновить прогноз…» + ретрай, offline-сообщение
- [ ] Meteocons локально в `static/icons/weather/`, `WeatherIcon.svelte` (day/night по sunrise/sunset), hero-иконка 76–96px, без анимаций в v1
- [ ] Иконки приложения: оригинальный SVG (синий квадрат + облако + солнце) → PNG 180/192/512/maskable скриптом (devDependency)

### Фаза 4. PWA и деплой
- [ ] `static/manifest.webmanifest` (§11: standalone, portrait-primary, #F5F7FA), apple meta-теги, apple-touch-icon
- [ ] vite-plugin-pwa: NetworkFirst для `api.open-meteo.com` (таймаут ~3s → кэш), CacheFirst статика, версии кэшей + чистка старых, scope покрывает `/weather/`
- [ ] `.github/workflows/deploy.yml` (§40): push→main + workflow_dispatch, `npm ci → check → test → build`, permissions `contents: read / pages: write / id-token: write`, upload-pages-artifact + deploy-pages
- [ ] `README.md` (§42), `THIRD_PARTY_NOTICES.md` (§43), `Caddyfile` (§40 B), `IMPLEMENTATION_NOTES.md` (§46)
- [ ] Сборка статики, проверка base path `/weather/` и refresh на всех маршрутах

## Критерии готовности (Phase 1, из §45)
- [ ] Москва грузится, поиск переключает город
- [ ] Текущие условия, ≥24 часовых значений, 10 дней, WMO-лейблы и иконки day/night
- [ ] Давление в мм рт. ст., ветер в м/с
- [ ] Избранное персистит после перезапуска, последний прогноз виден offline
- [ ] Refresh не бланкует UI
- [ ] В Home-бандле нет кода карты
- [ ] Прод на GitHub Pages без сервера, refresh работает на `/forecast/`, `/favorites/`, `/settings/`
- [ ] Subpath `/weather/` работает, SW scope корректен
- [ ] Нет аналитики/рекламы, нет Yandex-ассетов
- [ ] Lighthouse PWA без критичных ошибок

## Риски
- iOS PWA SW на GitHub Pages (subpath + scope) — тестировать рано; при нерешаемой проблеме документировать в IMPLEMENTATION_NOTES (§47.14)
- Base path в абсолютных ссылках иконок/SW/manifest — использовать `%sveltekit.assets%` и относительные пути
- Конвертация SVG→PNG иконок приложения — devDependency скрипт; при сбое коммитим готовые PNG
- Начальный JS-бандл — следить за размером, lazy-load некритичного

## Открытые вопросы
- [ ] Подтвердить имя репозитория `weather` (для base path) — сейчас принято по имени каталога
- [ ] Node-версия в окружении (workflow ставит 22) — проверить локальную

---

## Итог
*Заполняется по завершении.*