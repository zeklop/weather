# Анонс Gradus — пошаговый план

Цель: витрина OSS-проекта для резюме. Порядок важен: сначала репо должен выглядеть идеально, потом анонс — трафик уйдёт впустую, если человек придёт на сырую страницу.

## Шаг 0. Подготовка (5 минут, руками)

1. **Social preview** — картинка-превью при шаринге репо. API это не умеет, только руками:
   `Settings → General → Social preview → Edit → Upload` → загрузи `screenshots/gradus-main.png` (или склей 2×2 из папки screenshots в 1280×640).
2. Убедись, что `https://gradus.website/` открывается и README-бейджи зелёные после пуша.

## Шаг 1. Show HN (главный канал)

**Где:** https://news.ycombinator.com/submit
**Когда:** вторник–четверг, 8:00–10:00 по Eastern (16:00–18:00 МСК) — окно максимальной аудитории.
**Заголовок:** `Show HN: Gradus – offline-first weather PWA built with SvelteKit 5 and Open-Meteo`
**URL:** `https://gradus.website/`

Текст (в поле text, необязателен, но с ним теплее):

> Hi! I built Gradus because every weather app I tried was either bloated with ads or useless offline.
>
> It's a fully static PWA: install it to your home screen and it works like a native app — offline caching, pull-to-refresh, live temperature badge on the icon, background push alerts for rain/frost via a tiny Cloudflare Worker, radar map, air quality, astronomy, marine temps.
>
> Tech-wise: SvelteKit 2 with Svelte 5 runes, zero UI libraries (handcrafted CSS), Open-Meteo (no API keys), MapLibre + RainViewer for radar, Workbox service worker. The push backend is a single Cloudflare Worker with D1, VAPID implemented by hand (~200 lines).
>
> Source: https://github.com/zeklop/weather — MIT. Feedback welcome, especially on iOS Safari where testing is the hardest.

Правила выживания на HN: отвечай на комментарии быстро в первые 3 часа, не защищайся от критики — «fair point, fixed» выглядит сильнее резюме, чем сам пост.

## Шаг 2. Reddit

**Где:** r/SideProject, r/PWAs, r/sveltejs (проверь правила каждого — где-то нужны теги).
**Когда:** через день-два после HN, не одновременно.

Текст для r/SideProject / r/PWAs:

> I got tired of weather apps that show a full-screen ad before showing me if it's raining. So I built my own: **Gradus**, an open-source weather PWA.
>
> Install it once from gradus.website and it behaves like a native app — works offline, lives on your home screen, shows the current temperature right on the icon, and can push alerts before rain or frost even when the phone is locked.
>
> Everything is free and MIT-licensed, data comes from Open-Meteo (no accounts, no tracking). Code: github.com/zeklop/weather
>
> Happy to answer questions about the stack (SvelteKit 5, Cloudflare Workers for push).

Текст для r/sveltejs — короче и техничнее:

> Built a complete weather PWA with SvelteKit 2 + Svelte 5 runes as a learning project — ended up with offline caching (two-layer SWR), hand-rolled VAPID/Web Push on a CF Worker, dynamic favicon temperature, and zero CSS frameworks. Repo: https://github.com/zeklop/weather, live at https://gradus.website/. Happy to share pitfalls (Svelte 5 migration was ~90% of the pain).

## Шаг 3. Русскоязычный канал (опционально)

**Где:** свой Telegram-канал/чат, vc.ru («Мой проект»), Habr («Я делаю…» / хаб PWA).
**Текст:**

> Запарился с погодными приложениями, которые перед прогнозом показывают рекламу на весь экран. Написал своё — Градус, open-source PWA.
>
> Ставится с сайта одним касанием, работает оффлайн, температуру показывает прямо на иконке рабочего стола, а ещё умеет пушить «через час дождь» даже на залоченном телефоне.
>
> Внутри: SvelteKit + Svelte 5, Open-Meteo без ключей, push-бэкенд на Cloudflare Workers за ~200 строк, радар осадков, качество воздуха, фаза луны. Всё бесплатно, без регистрации и трекинга.
>
> Сайт: https://gradus.website · Код: https://github.com/zeklop/weather

На vc.ru заголовок: «Сделал погодное приложение без рекламы и сервера — рассказал, как оно устроено» (туда лучше добавить пару абзацев про архитектуру, иначе урежут до «флудила»).

## Что НЕ делать

- Не постить во все каналы одним днём — алгоритмы Reddit режут кросспосты, на HN палево прошлых публикаций снижает шансы.
- Не покупать ботов/накрутку установок — для OSS-резюме это видно сразу и обесценивает метрики.
- Не удалять пост при плохом приёме — молчаливый Show HN лучше отсутствия истории.
