<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { getForecastStore } from '$lib/stores/forecast.svelte';
	import { getWeatherVisual, type WeatherVisual } from '$lib/weather/wmo';
	import { formatDayShort, formatHour, formatTimeShort, isToday } from '$lib/weather/format';
	import { formatMmhg, formatTemp, formatWind, hpaToMmhg } from '$lib/weather/units';
	import { windDirectionLabel } from '$lib/weather/direction';
	import { isDay } from '$lib/weather/dayNight';
	import type { DayForecast } from '$lib/types';

	// The store owns an effect root with a location watcher; it must not be
	// created during prerender (client-internal effect API + no network at build).
	const store = typeof document !== 'undefined' ? getForecastStore() : null;
	const payload = $derived(store?.payload ?? null);
	const status = $derived(store?.status ?? 'idle');
	const refreshing = $derived(store?.refreshing ?? false);

	// Minute ticker keeps «Сейчас»/current-hour highlight honest while the SPA
	// stays open across an hour boundary.
	let nowMs = $state(Date.now());
	onMount(() => {
		const id = setInterval(() => {
			nowMs = Date.now();
		}, 60_000);
		return () => clearInterval(id);
	});

	// "Now" as wall-time ISO in the location tz: the current instant converted
	// via the payload's timezone (never a payload string parsed with new Date).
	function wallNow(timezone: string, ms: number): string {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		}).formatToParts(new Date(ms));
		const val = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
		return `${val('year')}-${val('month')}-${val('day')}T${val('hour')}:${val('minute')}`;
	}

	// Wall-time difference in minutes — Date.UTC carrier trick from format.ts.
	function wallEpoch(iso: string): number {
		return Date.UTC(
			+iso.slice(0, 4),
			+iso.slice(5, 7) - 1,
			+iso.slice(8, 10),
			+iso.slice(11, 13),
			+iso.slice(14, 16)
		);
	}

	function wallMinutesBetween(from: string, to: string): number {
		return Math.round((wallEpoch(to) - wallEpoch(from)) / 60_000);
	}

	function spanWord(minutes: number): string {
		if (minutes < 60) {
			const m10 = minutes % 10;
			const m100 = minutes % 100;
			if (m10 === 1 && m100 !== 11) return `${minutes} минуту`;
			if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${minutes} минуты`;
			return `${minutes} минут`;
		}
		const h = Math.round((minutes / 60) * 2) / 2;
		if (h <= 1) return '1 час';
		if (h <= 1.5) return '1,5 часа';
		return '2 часа';
	}

	const nowIso = $derived(payload ? wallNow(payload.timezone, nowMs) : null);

	// First hourly entry at or before "now": the current hour in a fresh payload.
	const hourStartIdx = $derived.by(() => {
		if (!payload || !nowIso) return 0;
		for (let i = payload.hourly.length - 1; i >= 0; i--) {
			if (payload.hourly[i].time <= nowIso) return i;
		}
		return 0;
	});

	const railHours = $derived(payload ? payload.hourly.slice(hourStartIdx, hourStartIdx + 24) : []);
	const isCurrentHour = $derived(
		!!(payload && nowIso && payload.hourly[hourStartIdx]?.time.slice(0, 13) === nowIso.slice(0, 13))
	);
	const currentProb = $derived(payload ? (payload.hourly[hourStartIdx]?.precipitationProbability ?? null) : null);

	const todayDay = $derived(payload && nowIso
		? (payload.daily.find((d) => isToday(d.date, nowIso)) ?? payload.daily[0])
		: null);
	const dayByDate = $derived(payload ? new Map(payload.daily.map((d) => [d.date, d])) : new Map<string, DayForecast>());
	const previewDays = $derived(payload ? payload.daily.slice(1, 8) : []);

	// Deterministic heuristic over hourly data (§13.3) — no invented nowcasting:
	// window is the next 2 full hours; card hidden when the window has no
	// probability/amount data at all.
	const precipCard = $derived.by((): string | null => {
		if (!payload || !nowIso) return null;
		const win = payload.hourly.slice(hourStartIdx + 1, hourStartIdx + 3);
		if (win.length === 0) return null;
		const hasData = win.some((h) => h.precipitationProbability != null || h.precipitation > 0);
		if (!hasData) return null;
		if (payload.current.precipitation > 0) {
			return `${getWeatherVisual(payload.current.weatherCode).labelRu} идёт`;
		}
		const soon = win.find((h) => (h.precipitationProbability ?? 0) >= 50 || h.precipitation > 0);
		if (!soon) return 'Без осадков';
		const minutes = wallMinutesBetween(nowIso, soon.time);
		return `${getWeatherVisual(soon.weatherCode).labelRu} начнётся примерно через ${spanWord(minutes)}`;
	});

	function iconName(visual: WeatherVisual, day: boolean): string {
		return day ? visual.iconDay : visual.iconNight;
	}

	function dayNightFor(isoTime: string): boolean {
		const d = dayByDate.get(isoTime.slice(0, 10));
		return isDay(isoTime, d?.sunrise ?? null, d?.sunset ?? null).isDay;
	}
</script>

{#if !payload && (status === 'idle' || status === 'loading')}
	<div class="home" aria-busy="true">
		<div class="hero">
			<div class="sk sk-temp"></div>
			<div class="sk sk-line w60"></div>
			<div class="sk sk-line w40"></div>
			<div class="sk sk-line w70"></div>
		</div>
		<div class="card sk-card">
			<div class="sk sk-line w80"></div>
			<div class="sk-rail">
				{#each [1, 2, 3, 4, 5, 6] as _}
					<div class="sk-cell">
						<div class="sk sk-block"></div>
						<div class="sk sk-block sm"></div>
					</div>
				{/each}
			</div>
		</div>
		<div class="card sk-card">
			<div class="sk sk-line w50"></div>
			<div class="sk sk-line w70"></div>
		</div>
		<div class="card sk-card">
			<div class="sk sk-line w90"></div>
			<div class="sk sk-line w60"></div>
			<div class="sk sk-line w80"></div>
		</div>
		<span class="sr-only">Загрузка прогноза</span>
	</div>
{:else if !payload && (status === 'error' || status === 'offline')}
	<div class="home">
		<div class="card state">
			<div class="state-title">{status === 'error' ? 'Не удалось обновить прогноз' : 'Нет соединения'}</div>
			{#if status === 'offline'}
				<div class="state-text">Проверьте подключение к интернету и попробуйте ещё раз.</div>
			{/if}
			<button class="retry-btn" type="button" onclick={() => store?.refresh()}>Повторить</button>
		</div>
	</div>
{:else if payload}
	{@const heroVisual = getWeatherVisual(payload.current.weatherCode)}
	<div class="home">
		{#if refreshing}
			<div class="refresh-note">
				<span class="spinner" aria-hidden="true"></span>
				Обновляем…
			</div>
		{/if}

		{#if status === 'error' || status === 'offline'}
			<div class="banner" role="status">
				<span>
					{status === 'error' ? 'Не удалось обновить прогноз.' : 'Нет соединения.'}
					Показаны данные на {formatTimeShort(payload.current.time)}.
				</span>
				<button class="retry-btn" type="button" onclick={() => store?.refresh()}>Повторить</button>
			</div>
		{/if}

		<div class="hero">
			<div class="hero-main">
				<div class="hero-left">
					<div class="hero-temp">{formatTemp(payload.current.temperature)}</div>
					<div class="hero-label">{heroVisual.labelRu}</div>
					<div class="hero-feels">Ощущается как {formatTemp(payload.current.apparentTemperature)}</div>
				</div>
				<div class="hero-icon">
					{@render weatherIcon(iconName(heroVisual, dayNightFor(payload.current.time)), 84)}
				</div>
			</div>
			<div class="hero-secondary">
				<span>Ветер {formatWind(payload.current.windSpeed)}, {windDirectionLabel(payload.current.windDirection)}</span>
				<span>Давление {formatMmhg(hpaToMmhg(payload.current.pressureHpa))}</span>
			</div>
		</div>

		{#if precipCard}
			<div class="card precip">
				<div class="precip-title">В ближайшие 2 часа</div>
				<div class="precip-text">{precipCard}</div>
				<a class="precip-cta" href={base + '/map/'}>Показать на карте</a>
			</div>
		{/if}

		<div class="card rail">
			<div class="rail-scroll" role="group" aria-label="Прогноз по часам">
				<div class="rail-cell">
					<span class="cell-time">Сейчас</span>
					{@render weatherIcon(iconName(heroVisual, dayNightFor(payload.current.time)), 30)}
					<span class="cell-temp">{formatTemp(payload.current.temperature)}</span>
					{#if currentProb != null && currentProb >= 10}
						<span class="cell-precip">{currentProb}%</span>
					{/if}
				</div>
				{#each railHours as h, i}
					{@const v = getWeatherVisual(h.weatherCode)}
					<div class="rail-cell" class:current={isCurrentHour && i === 0}>
						<span class="cell-time">{formatHour(h.time)}</span>
						{@render weatherIcon(iconName(v, dayNightFor(h.time)), 30)}
						<span class="cell-temp">{formatTemp(h.temperature)}</span>
						{#if h.precipitationProbability != null && h.precipitationProbability >= 10}
							<span class="cell-precip">{h.precipitationProbability}%</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		{#if todayDay}
			{@const todayVisual = getWeatherVisual(todayDay.weatherCode)}
			<div class="card today">
				<div class="today-main">
					<div class="today-text">
						<div class="today-title">Сегодня</div>
						<div class="today-temps">
							Днём {formatTemp(todayDay.temperatureMax)} · Ночью {formatTemp(todayDay.temperatureMin)}
						</div>
						{#if todayDay.precipitationSum < 1}
							<div class="today-note">Без существенных осадков</div>
						{/if}
					</div>
					{@render weatherIcon(todayVisual.iconDay, 44)}
				</div>
			</div>
		{/if}

		{#if previewDays.length > 0}
			<div class="card daily">
				{#each previewDays as d}
					{@const dv = getWeatherVisual(d.weatherCode)}
					<div class="day-row">
						<span class="day-label">{formatDayShort(d.date)}</span>
						{@render weatherIcon(dv.iconDay, 26)}
						<span class="day-high">{formatTemp(d.temperatureMax)}</span>
						<span class="day-low">{formatTemp(d.temperatureMin)}</span>
					</div>
				{/each}
				<a class="daily-link" href={base + '/forecast/'}>Прогноз на 10 дней →</a>
			</div>
		{/if}
	</div>
{/if}

{#snippet sunIcon()}
	<circle cx="12" cy="12" r="4" />
	<path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
{/snippet}

{#snippet moonIcon()}
	<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
{/snippet}

{#snippet cloudIcon()}
	<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
{/snippet}

{#snippet sunCloudIcon()}
	<circle cx="8.5" cy="9" r="2.6" />
	<path d="M8.5 4.5v1M4.2 9h1M5.4 5.4l.7.7" />
	<path d="M18.5 19H10a6 6 0 1 1 5.8-7.5h1.2a3.8 3.8 0 1 1 0 7.5Z" />
{/snippet}

{#snippet moonCloudIcon()}
	<path d="M8.5 7.5a3.5 3.5 0 0 0 5.25 5.25A5.25 5.25 0 1 1 8.5 7.5z" />
	<path d="M18.5 19H10a6 6 0 1 1 5.8-7.5h1.2a3.8 3.8 0 1 1 0 7.5Z" />
{/snippet}

{#snippet fogIcon()}
	<path d="M17.5 15.5H9a6.5 6.5 0 1 1 6.2-8.4h2.3a3.8 3.8 0 1 1 0 7.6Z" />
	<path d="M8 19h8M9.5 22h5" />
{/snippet}

{#snippet rainIcon(short: boolean)}
	{@render cloudIcon()}
	{#if short}
		<path d="M9 16.5v1.5m3-1.5v1.5m3-1.5v1.5" />
	{:else}
		<path d="M8.5 16v2.5m3.5-2.5v2.5m3.5-2.5v2.5" />
	{/if}
{/snippet}

{#snippet snowIcon()}
	{@render cloudIcon()}
	<path d="M9 16.5l1.5 1.5M10.5 16.5L9 18M15 16.5l1.5 1.5M16.5 16.5L15 18" />
{/snippet}

{#snippet thunderIcon()}
	{@render cloudIcon()}
	<path d="M13.2 14.5 10 18h2.6l-1 3.5 3.2-3.5h-2.6l1-3.5z" />
{/snippet}

{#snippet weatherIcon(name: string, size: number)}
	<!-- T20: replace this placeholder snippet with WeatherIcon.svelte (Meteocons). -->
	{#if name.includes('thunder')}
		<svg
			class="weather-icon"
			style="color:#8b5cf6;width:{size}px;height:{size}px"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{@render thunderIcon()}
		</svg>
	{:else if name.includes('fog')}
		<svg
			class="weather-icon"
			style="color:#94a3b8;width:{size}px;height:{size}px"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{@render fogIcon()}
		</svg>
	{:else if name.includes('snow')}
		<svg
			class="weather-icon"
			style="color:#60a5fa;width:{size}px;height:{size}px"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{@render snowIcon()}
		</svg>
	{:else if name.includes('drizzle')}
		<svg
			class="weather-icon"
			style="color:#3b82f6;width:{size}px;height:{size}px"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{@render rainIcon(true)}
		</svg>
	{:else if name.includes('rain') || name.includes('sleet')}
		<svg
			class="weather-icon"
			style="color:#3b82f6;width:{size}px;height:{size}px"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{@render rainIcon(false)}
		</svg>
	{:else if name.includes('partly')}
		{#if name.includes('night')}
			<svg
				class="weather-icon"
				style="color:#94a3b8;width:{size}px;height:{size}px"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				{@render moonCloudIcon()}
			</svg>
		{:else}
			<svg
				class="weather-icon"
				style="color:#94a3b8;width:{size}px;height:{size}px"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				{@render sunCloudIcon()}
			</svg>
		{/if}
	{:else if name.includes('night')}
		<svg
			class="weather-icon"
			style="color:#6366f1;width:{size}px;height:{size}px"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{@render moonIcon()}
		</svg>
	{:else}
		{#if name.includes('day')}
			<svg
				class="weather-icon"
				style="color:#f59e0b;width:{size}px;height:{size}px"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				{@render sunIcon()}
			</svg>
		{:else}
			<svg
				class="weather-icon"
				style="color:#94a3b8;width:{size}px;height:{size}px"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				{@render cloudIcon()}
			</svg>
		{/if}
	{/if}
{/snippet}

<style>
	.home {
		display: grid;
		gap: var(--space-4);
	}

	/* ---------- skeleton ---------- */
	.sk {
		background: var(--divider);
		border-radius: 8px;
		animation: sk-pulse 1.2s ease-in-out infinite;
	}

	@keyframes sk-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.45;
		}
	}

	.sk-temp {
		width: 120px;
		height: 68px;
		margin-bottom: var(--space-2);
	}

	.sk-line {
		height: 16px;
		margin-top: var(--space-2);
	}

	.w40 {
		width: 40%;
	}
	.w50 {
		width: 50%;
	}
	.w60 {
		width: 60%;
	}
	.w70 {
		width: 70%;
	}
	.w80 {
		width: 80%;
	}
	.w90 {
		width: 90%;
	}

	.sk-card {
		padding: var(--space-4);
	}

	.sk-rail {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-5);
	}

	.sk-cell {
		flex: 0 0 56px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}

	.sk-block {
		width: 32px;
		height: 32px;
		border-radius: 50%;
	}

	.sk-block.sm {
		width: 44px;
		height: 12px;
		border-radius: 6px;
	}

	/* ---------- states ---------- */
	.state {
		padding: var(--space-7) var(--space-5);
		text-align: center;
	}

	.state-title {
		font-size: 17px;
		font-weight: 600;
	}

	.state-text {
		color: var(--text-secondary);
		font-size: 15px;
		margin-top: var(--space-1);
		margin-bottom: var(--space-5);
	}

	.state .retry-btn {
		margin-top: var(--space-5);
	}

	.refresh-note {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 12px;
		color: var(--text-secondary);
	}

	.spinner {
		width: 12px;
		height: 12px;
		border: 2px solid var(--divider);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-control);
		background: #fff7ed;
		border: 1px solid #fed7aa;
		color: #7c2d12;
		font-size: 14px;
	}

	.retry-btn {
		flex-shrink: 0;
		min-height: 44px;
		padding: 0 var(--space-4);
		border: none;
		border-radius: var(--radius-control);
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
	}

	.retry-btn:active {
		opacity: 0.85;
	}

	/* ---------- hero ---------- */
	.hero {
		padding: var(--space-2) 0 0;
	}

	.hero-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.hero-temp {
		font-size: 72px;
		font-weight: 600;
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.hero-label {
		font-size: 17px;
		font-weight: 500;
		margin-top: var(--space-1);
	}

	.hero-feels {
		color: var(--text-secondary);
		font-size: 15px;
		margin-top: 2px;
	}

	.hero-icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.hero-secondary {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		color: var(--text-secondary);
		font-size: 14px;
		margin-top: var(--space-4);
	}

	/* ---------- near-term precipitation card ---------- */
	.precip {
		padding: var(--space-4);
	}

	.precip-title {
		font-size: 15px;
		font-weight: 600;
	}

	.precip-text {
		font-size: 15px;
		margin-top: 2px;
	}

	.precip-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		margin-top: var(--space-2);
		color: var(--accent);
		font-size: 15px;
		font-weight: 500;
		text-decoration: none;
	}

	/* ---------- hourly rail ---------- */
	.rail {
		padding: var(--space-3) 0;
	}

	.rail-scroll {
		display: flex;
		gap: var(--space-1);
		overflow-x: auto;
		scroll-snap-type: x proximity;
		padding-inline: var(--space-4);
		scrollbar-width: none;
	}

	.rail-scroll::-webkit-scrollbar {
		display: none;
	}

	.rail-cell {
		flex: 0 0 56px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: var(--space-2) 0;
		border-radius: var(--radius-control);
		scroll-snap-align: start;
	}

	.rail-cell.current {
		background: rgba(59, 130, 246, 0.1);
	}

	.cell-time {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.rail-cell.current .cell-time {
		color: var(--accent);
		font-weight: 600;
	}

	.cell-temp {
		font-size: 15px;
		font-weight: 600;
	}

	.cell-precip {
		font-size: 12px;
		color: var(--accent);
	}

	/* ---------- today card ---------- */
	.today {
		padding: var(--space-4);
	}

	.today-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.today-title {
		font-size: 17px;
		font-weight: 600;
	}

	.today-temps {
		font-size: 15px;
		margin-top: 2px;
	}

	.today-note {
		font-size: 13px;
		color: var(--text-secondary);
		margin-top: 2px;
	}

	/* ---------- daily preview ---------- */
	.daily {
		padding: var(--space-2) var(--space-4);
	}

	.day-row {
		display: grid;
		grid-template-columns: 1fr 28px auto auto;
		align-items: center;
		gap: var(--space-3);
		min-height: 40px;
		border-bottom: 1px solid var(--divider);
	}

	.day-row:last-of-type {
		border-bottom: none;
	}

	.day-label {
		font-size: 15px;
	}

	.day-high {
		font-size: 15px;
		font-weight: 600;
		min-width: 44px;
		text-align: right;
	}

	.day-low {
		font-size: 15px;
		color: var(--text-secondary);
		min-width: 44px;
		text-align: right;
	}

	.daily-link {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		margin-top: var(--space-1);
		color: var(--accent);
		font-size: 15px;
		font-weight: 500;
		text-decoration: none;
	}
</style>