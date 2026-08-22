# AGENTS.md — Weather PWA

> Глобальный профиль читается из `~/.codex/AGENTS.md` (или эквивалента).
> Проектные `CLAUDE.md` и `GEMINI.md` — симлинки на этот файл.

## Что это
PWA-приложение погоды (SvelteKit 2 + Svelte 5 runes), деплой на GitHub Pages по пути `/weather`. Есть опциональный serverless-бэкенд на Cloudflare Workers + D1 для фоновых Web Push оповещений и privacy-first аналитики (`/stats`). Состояние: активная разработка, фазы 1–4 реализованы.

## Стек
- Язык: TypeScript
- Фреймворк: SvelteKit 2, Svelte 5 (runes `$state`/`$derived`/`$effect`), vite-plugin-pwa
- БД: Cloudflare D1 (SQLite), схема `serverless/schema.sql`
- Инфра: GitHub Pages (фронт, workflow `.github/workflows/deploy.yml`), Cloudflare Workers (бэкенд `serverless/`, cron `*/30`)
- Тесты: Vitest

## Структура репо
- `src/lib/api/` — клиенты Open-Meteo (forecast/geocoding/air quality/marine), reverse geocode BigDataCloud
- `src/lib/stores/` — svelte-сторсы: settings, location, favorites, forecast, alerts (+ `localizeNames.ts` — переименование городов при смене языка)
- `src/lib/components/`, `src/routes/` — UI и страницы (`/stats`, `/favorites`, `/settings`, `/map`, `/forecast`)
- `serverless/` — отдельный воркер: `src/routes/` (subscribe, stats, cron), `src/crypto/` (VAPID, RFC 8291), тесты в `__tests__/`
- `plans/` — gitignore, локальные планы фаз
- `static/sw-push.js` — push-обработчики Service Worker

## Команды
- Запуск:        `npm run dev`
- Тесты:         `npm test` (vitest run)
- Линт/типы:     `npm run check` (svelte-check)
- Сборка:        `npm run build` (в CI — с `PUBLIC_BASE_PATH=/weather`)
- Деплой фронта: автоматом при push в `main`
- Деплой воркера: `npx wrangler deploy` в `serverless/`

## Секреты
- Где лежат: воркер-секреты `ADMIN_TOKEN`, `VAPID_PRIVATE_KEY` через `npx wrangler secret put` (из `serverless/`); `PUBLIC_PUSH_WORKER_URL`, `PUBLIC_VAPID_KEY` — в `deploy.yml` env.
- Где НЕ лежат: не в репо, не в этом файле, не в коде. `wrangler.toml [vars]` — только публичные VAPID key и конфиги.
- Локально: OAuth-логин wrangler уже настроен (`npx wrangler whoami`).

## Конвенции
- Русский язык общения и документации; код и комментарии — английский.
- Минимальные диффы, никаких drive-by рефакторингов; `ponytail:`-комментарии для осознанных упрощений.
- Перед коммитом: `npm run check && npm test` должны быть зелёными.

## Недавние доработки (2026-08-22, часть не закоммичена)
- Дашборд `/stats` v2: языки подписок, график активности 30 дней (открытия vs алерты), воронка пушей (установки → согласия → живые подписки), типы алертов, здоровье базы (мёртвые >90д / автоудалены 7д / без алертов). Cron пишет событие `push_unsubscribed` при автоудалении 410/404.
- Токен админа `/stats` хранится в `localStorage`, кнопка блокировки — иконка замка.
- Топ городов в статистике группируется по координатам (канонический ключ): город сохраняется в языке момента подписки («Cheboksary»/«Чебоксары»), отдаётся оба имени, фронт показывает по языку дашборда.
- При смене языка интерфейса сохранённые города (текущий + избранное) переименовываются best-effort через BigDataCloud reverse geocode (`src/lib/stores/localizeNames.ts`, хук в `+layout.svelte`).
- План phase4 помечен done: `plans/weather-pwa-phase4-webpush-analytics.md` (локальный, в gitignore). Отклонение от плана: fan-out чанками не делался, рассылка последовательная (`serverless/src/routes/cron.ts`, ponytail-заметка).

## Не трогать
- `plans/` — локальные планы, в gitignore.
- Симлинки `CLAUDE.md`, `GEMINI.md` → этот файл.
- `IMPLEMENTATION_NOTES.md` разделы 5–6 — контракт деплоя воркера и аналитики.

## Контекст в vault
Заметки проекта: `~/brain/10-projects/weather/` (если заведена).

## Открытые вопросы
- [ ] Собственный домен — готовит другой агент (деплой за ним).
