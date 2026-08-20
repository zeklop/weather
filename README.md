# Погода (Weather PWA)

Лёгкое, быстрое и автономное Progressive Web Application (PWA) для прогноза погоды в стиле визуальной иерархии Яндекс.Погоды. Построено на **SvelteKit 5** с использованием рун (`runes`), открытого API **Open-Meteo** и векторных иконок **Meteocons**.

Приложение ориентировано на мобильный опыт в **iOS Safari** (PWA standalone mode), полностью статично (zero-server footprint), поддерживает работу в оффлайне и развёртывается на **GitHub Pages** или любом статическом веб-сервере.

---

## Возможности (Фаза 1)

- **Главный экран:** крупная температура, погодные условия на русском языке, ощущаемая температура, скорость ветра (м/с) с 8 румбами и атмосферное давление (мм рт. ст.).
- **Ближайшие часы:** карточка краткосрочного прогноза осадков на 2 часа (детерминированная эвристика) с быстрым переходом к карте.
- **Почасовой прогноз:** горизонтальный скролл-рейл («Сейчас» + 24+ часа) с выделением текущего часа, day/night иконками и вероятностью осадков.
- **Прогноз на 10 дней:** сводка «Сегодня» и подробный список на 10 дней на странице `/forecast/`.
- **Поиск городов:** поиск по базе геокодинга Open-Meteo (дебаунс 300 мс, запрос от 2 символов, до 8 результатов с регионом и страной, отмена устаревших запросов).
- **Избранное:** сохранение городов в `localStorage`, быстрый переход и просмотр закэшированных температур на странице `/favorites/`.
- **Настройки:** переключение города, запрос геолокации, статус последнего обновления с кнопкой принудительного обновления и справка по установке.
- **Оффлайн-режим и кэширование:** двухуровневый кэш (runtime Map + версионированный localStorage с LRU-вытеснением, лимитом на 8 городов и бюджетом 1 МБ), SWR-стратегия (fresh < 15 мин, stale < 6 ч, offline любой давности с индикацией времени сохранения).
- **Векторные иконки:** качественные SVG-иконки Meteocons с автоматическим переключением день/ночь на основе времени восхода и заката в таймзоне локации.

---

## Стек технологий

- **Фреймворк:** [SvelteKit 5](https://kit.svelte.dev/) (Svelte 5 runes `$state`, `$derived`, `$effect.root`)
- **Язык:** TypeScript (строгий режим)
- **Сборщик и PWA:** [Vite](https://vitejs.dev/) + [@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/) (Workbox Service Worker, offline navigation fallback)
- **Адаптер:** `@sveltejs/adapter-static` (полный pre-render всех страниц с `trailingSlash: 'always'`)
- **Стилизация:** Чистый CSS с переменными темы, поддержкой iOS Safe Areas (`env(safe-area-inset-*)`) и минимальным размером бандла (без Tailwind / UI-библиотек)
- **Данные о погоде и геокодинг:** [Open-Meteo API](https://open-meteo.com/) (без API-ключей)
- **Иконки погоды:** [Meteocons](https://meteocons.com/) (SVG, MIT License)
- **Иконки приложения:** Оригинальный SVG + генерация PNG через `sharp`

---

## Локальная разработка

### Требования
- Node.js 22+ (или Node.js 20+)
- npm 10+

### Запуск dev-сервера

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера Vite
npm run dev

# Либо с автоматическим открытием в браузере
npm run dev -- --open
```

---

## Сборка и проверки качества

Проект покрыт автоматическими тестами и проверками:

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

---

## Развёртывание

### 1. GitHub Pages (Основной метод)

Приложение развёрнуто по адресу: **`https://zeklop.github.io/weather/`**

Для деплоя в субпатч репозитория GitHub Pages используется сборка с `PUBLIC_BASE_PATH=/weather`:

```bash
PUBLIC_BASE_PATH=/weather npm run build
```

Автоматический CI/CD workflow настроен в файле [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Он запускается при пуше в ветку `main` или вручную (`workflow_dispatch`), прогоняет проверки (`check`, `test`, `check:icons`), собирает сайт и публикует артефакт в GitHub Pages.

Настройки репозитория на GitHub:
`Settings → Pages → Build and deployment → Source: GitHub Actions`.

### 2. Кастомный домен / Root Mode (`PUBLIC_BASE_PATH=''`)

Если приложение раздаётся из корня домена (например, `https://weather.example.com/`):

```bash
PUBLIC_BASE_PATH='' npm run build
# или просто:
npm run build
```

Все пути к манифесту, Service Worker и статическим ресурсам автоматически переключаются на корень `/`.

### 3. VPS / Статический веб-сервер (Caddy)

Так как приложение является полностью статическим, для него не требуется Node.js на сервере. В репозитории присутствует готовый пример конфигурации [`Caddyfile`](Caddyfile):

```caddy
weather.example.com {
    root * /var/www/weather
    encode zstd gzip
    try_files {path} {path}/ /index.html
    file_server

    header {
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        Permissions-Policy "geolocation=(self)"
    }
}
```

---

## Установка PWA на iPhone (iOS Safari)

1. Откройте страницу **`https://zeklop.github.io/weather/`** в браузере Safari на iPhone.
2. Нажмите кнопку **«Поделиться»** (иконка со стрелкой вверх в нижней панели Safari).
3. Прокрутите список вниз и выберите **«На экран "Домой"»** (Add to Home Screen).
4. Нажмите **«Добавить»** в правом верхнем углу.
5. Запустите приложение с домашнего экрана: оно откроется в полноэкранном standalone-режиме без элементов интерфейса браузера, с поддержкой жестов и кэшированием для работы без доступа к сети.

---

## Атрибуция и лицензии

- **Погодные данные и геокодинг:** [Open-Meteo](https://open-meteo.com/) — предоставлены по лицензии [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Иконки погоды:** [Meteocons](https://github.com/basmilius/meteocons) от Bas Milius — лицензия MIT.
- **Интерактивные карты (Фаза 2):** [MapLibre GL JS](https://maplibre.org/) — лицензия BSD 3-Clause (в Фазе 1 код карты исключён из сборки).

Подробная информация о лицензиях и авторах сторонних компонентов приведена в файле [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
