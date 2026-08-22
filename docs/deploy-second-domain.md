# Второй домен: Cloudflare Pages → свой домен (+ путь на VPS)

Оба деплоя (github.io/weather и свой домен) работают одновременно с одним
пуш-воркером и одной D1. Подписки независимы per-origin.

## Лимиты Cloudflare Pages Free

- 500 билдов/мес, 1 билд одновременно, таймаут билда 20 мин
- Unlimited bandwidth и статических запросов
- До 100 кастомных доменов на проект
- Превью-деплой на каждый коммит в любую ветку

Для этого проекта лимиты не упираются ни во что: трафик читаемый, билдов
меньше сотни в месяц.

## Настройка Cloudflare Pages

Фактически сделано 2026-08-22 (проект direct-upload, без git-интеграции):

1. Проект `weather` создан через `wrangler pages project create weather --production-branch=main`
   → превью-домен `weather-524.pages.dev`.
2. Первый деплой: `npx wrangler pages deploy ../build --project-name=weather --branch=main`
   (билд с `PUBLIC_BASE_PATH=''`, worker URL и VAPID key в env).
3. Домен привязан через API:
   `POST /accounts/<account_id>/pages/projects/weather/domains {"name":"gradus.website"}`
   — CNAME для apex Cloudflare создал сам, сертификат Google Trust Services.
4. Дальнейшие деплои — автоматом из CI (см. ниже).

Build settings (для справки / если пересоздавать):
   - Build command: `npm run build`
   - Build output directory: `build`
   - Environment variables:
     - `PUBLIC_BASE_PATH=` (пусто — корень домена)
     - `PUBLIC_PUSH_WORKER_URL=https://weather-pwa-push.zeklop-cloudflare.workers.dev`
     - `PUBLIC_VAPID_KEY=BF3yPCN7QaK2_vhIVyGna10aU0jfHBCFwkufLxsA5FGzzdMOImAs97Hz3QzTFzYq1Qn5kQgDRtQQsz5THfGOx9c`

## Воркер: что включить после привязки домена

В `serverless/wrangler.toml`:

```toml
APP_ORIGIN = "https://zeklop.github.io,https://gradus.website,http://localhost:5173,http://localhost:4173"
```

Затем из `serverless/`:

```sh
# миграция колонки base_path (один раз)
npx wrangler d1 execute weather_pwa --remote --command \
  "ALTER TABLE subscriptions ADD COLUMN base_path TEXT NOT NULL DEFAULT ''"

# бэкфилл легаси-подписок: до появления gradus.website все жили на /weather.
# Cutoff — момент первого деплоя на gradus.website (2026-08-22); строки,
# созданные позже, уже пишут свой base_path при подписке. Без бэкфилла
# легаси-строки с '' получили бы пуши с путями корневого домена (404).
npx wrangler d1 execute weather_pwa --remote --command \
  "UPDATE subscriptions SET base_path='/weather' WHERE base_path='' AND created_at < 1787356800000"

npx wrangler deploy
```

CSP (`src/app.html` и Caddyfile) править не нужно: worker origin там уже есть,
внешние API allow-list'ены по доменам API, а не фронтенда.

## Деплой на gradus.website

Автоматический: push в `main` → job `deploy-cloudflare-pages` в
`.github/workflows/deploy.yml` собирает root-билд и льёт в Pages-проект
`weather` (домен привязан к проекту). Требует GitHub-секреты:

- `CLOUDFLARE_API_TOKEN` — токен CF с правом **Edit Cloudflare Pages** (создаётся
  в дашборде: My Profile → API Tokens). Проставить: `gh secret set CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID` — уже проставлен

Ручной вариант (если CI недоступен):

1. `PUBLIC_BASE_PATH='' PUBLIC_PUSH_WORKER_URL=... PUBLIC_VAPID_KEY=... npm run build`
2. `npx wrangler pages deploy ../build --project-name=weather --branch=main`

## Переезд на VPS (когда понадобится)

Фронтенд полностью статический — ничего CF-specific в нём нет.

1. `PUBLIC_BASE_PATH='' npm run build` локально или на сервере.
2. Залить `build/` в `/var/www/weather`.
3. В готовом `Caddyfile` домен уже проставлен (`gradus.website`),
   `caddy start` (или systemd). Сертификаты Caddy тянет сам.
4. DNS: A/AAAA запись домена на IP сервера (если домен был в CF — снять
   проксирование или указать IP напрямую).

Пуш-воркер можно оставить на Cloudflare даже при переезде фронта на VPS —
он отдельный сервис, смена origin фронтенда его не касается (после правки
APP_ORIGIN).

## Известный нюанс

Один человек, подписанный на оба домена на один город (совпадают координаты
до 0.01°), получает дубли уведомлений — cron шлёт каждой подписке отдельно.
Для личного проекта осознанно не чинится.
