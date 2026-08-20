<script lang="ts">
	import { onMount } from 'svelte';
	import { getForecastStore } from '$lib/stores/forecast.svelte';
	import { getWeatherVisual, type WeatherVisual } from '$lib/weather/wmo';
	import { formatDayShort, formatHour, formatTimeShort, isToday } from '$lib/weather/format';
	import { formatTemp, formatWind } from '$lib/weather/units';
	import { isDay } from '$lib/weather/dayNight';
	import type { DayForecast, HourForecast } from '$lib/types';

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

	const nowIso = $derived(payload ? wallNow(payload.timezone, nowMs) : null);

	// First hourly entry at or before "now": the current hour in a fresh payload.
	// Old payload ("now" past the last hourly entry, e.g. offline for 2+ days):
	// start from the first hour of the payload's first day instead of collapsing
	// to a single last row.
	const hourStartIdx = $derived.by(() => {
		if (!payload || !nowIso) return 0;
		let idx = payload.hourly.length - 1;
		while (idx > 0 && payload.hourly[idx].time > nowIso) idx--;
		if (idx === payload.hourly.length - 1 && payload.hourly[idx].time < nowIso) return 0;
		return idx;
	});

	const hourRows = $derived(payload ? payload.hourly.slice(hourStartIdx, hourStartIdx + 48) : []);
	const dailyRows = $derived(payload ? payload.daily.slice(0, 10) : []);
	const isCurrentHour = $derived(
		!!(payload && nowIso && payload.hourly[hourStartIdx]?.time.slice(0, 13) === nowIso.slice(0, 13))
	);

	const dayByDate = $derived(
		payload ? new Map(payload.daily.map((d) => [d.date, d])) : new Map<string, DayForecast>()
	);

	function iconName(visual: WeatherVisual, day: boolean): string {
		return day ? visual.iconDay : visual.iconNight;
	}

	function dayNightFor(isoTime: string): boolean {
		const d = dayByDate.get(isoTime.slice(0, 10));
		return isDay(isoTime, d?.sunrise ?? null, d?.sunset ?? null).isDay;
	}

	// Day icon at 12:00 wall time; isDay falls back to 07:00–19:00 when
	// sunrise/sunset are missing (polar day/night, provider gap).
	function dayIsDay(d: DayForecast): boolean {
		return isDay(`${d.date}T12:00`, d.sunrise, d.sunset).isDay;
	}

	function hourPrecip(h: HourForecast): string | null {
		return h.precipitationProbability != null && h.precipitationProbability >= 10
			? `${h.precipitationProbability}%`
			: null;
	}

	function dayPrecip(d: DayForecast): string | null {
		if (d.precipitationProbabilityMax != null && d.precipitationProbabilityMax >= 10) {
			return `${d.precipitationProbabilityMax}%`;
		}
		return d.precipitationSum > 0 ? 'rain' : null;
	}
</script>

{#if !payload && (status === 'idle' || status === 'loading')}
	<div class="forecast" aria-busy="true">
		<div class="sk sk-line w40"></div>
		<div class="card sk-card">
			{#each [1, 2, 3, 4, 5, 6] as _}
				<div class="sk-row">
					<div class="sk sk-block"></div>
					<div class="sk sk-line w30"></div>
				</div>
			{/each}
		</div>
		<div class="sk sk-line w40"></div>
		<div class="card sk-card">
			{#each [1, 2, 3, 4, 5] as _}
				<div class="sk-row">
					<div class="sk sk-block"></div>
					<div class="sk sk-line w50"></div>
				</div>
			{/each}
		</div>
		<span class="sr-only">Загрузка прогноза</span>
	</div>
{:else if !payload && (status === 'error' || status === 'offline')}
	<div class="forecast">
		<div class="card state">
			<div class="state-title">{status === 'error' ? 'Не удалось обновить прогноз' : 'Нет соединения'}</div>
			{#if status === 'offline'}
				<div class="state-text">Проверьте подключение к интернету и попробуйте ещё раз.</div>
			{/if}
			<button class="retry-btn" type="button" onclick={() => store?.refresh()}>Повторить</button>
		</div>
	</div>
{:else if payload}
	<div class="forecast">
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

		<h1 class="sr-only">Прогноз</h1>

		<h2 class="section-title">Почасовой прогноз</h2>
		<div class="card hourly">
			{#each hourRows as h, i}
				{@const v = getWeatherVisual(h.weatherCode)}
				{@const p = hourPrecip(h)}
				<div class="hour-row" class:current={isCurrentHour && i === 0}>
					<span class="hour-time">{isCurrentHour && i === 0 ? 'Сейчас' : formatHour(h.time)}</span>
					{@render weatherIcon(iconName(v, dayNightFor(h.time)), 24)}
					<span class="sr-only">{v.shortLabelRu}</span>
					<span class="hour-temp">{formatTemp(h.temperature)}</span>
					<span class="hour-precip" class:empty={p === null}>{p ?? '–'}</span>
					<span class="hour-wind">{formatWind(h.windSpeed)}</span>
				</div>
			{/each}
		</div>

		<h2 class="section-title">Прогноз на 10 дней</h2>
		<div class="card daily">
			{#each dailyRows as d}
				{@const dv = getWeatherVisual(d.weatherCode)}
				{@const today = !!nowIso && isToday(d.date, nowIso)}
				{@const p = dayPrecip(d)}
				<div class="day-row">
					<span class="day-label" class:today>{today ? 'Сегодня' : formatDayShort(d.date)}</span>
					{@render weatherIcon(iconName(dv, dayIsDay(d)), 26)}
					<span class="sr-only">{dv.shortLabelRu}</span>
					<span class="day-high">{formatTemp(d.temperatureMax)}</span>
					<span class="day-low">{formatTemp(d.temperatureMin)}</span>
					<span class="day-precip">
						{#if p === 'rain'}
							<svg
								class="rain-marker"
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
							<span class="sr-only">Осадки</span>
						{:else if p}
							{p}
						{/if}
					</span>
				</div>
			{/each}
		</div>
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
	.forecast {
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

	.sk-line {
		height: 16px;
	}

	.w30 {
		width: 30%;
	}
	.w40 {
		width: 40%;
	}
	.w50 {
		width: 50%;
	}

	.sk-card {
		padding: var(--space-2) var(--space-4);
	}

	.sk-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 44px;
		border-bottom: 1px solid var(--divider);
	}

	.sk-row:last-child {
		border-bottom: none;
	}

	.sk-block {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		flex-shrink: 0;
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

	/* ---------- sections ---------- */
	.section-title {
		margin: var(--space-1) 0 0;
		font-size: 17px;
		font-weight: 600;
	}

	/* ---------- hourly table ---------- */
	.hourly {
		padding: var(--space-2) var(--space-4);
	}

	.hour-row {
		display: grid;
		grid-template-columns: 56px 26px 48px 40px 1fr;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		border-bottom: 1px solid var(--divider);
	}

	.hour-row:last-child {
		border-bottom: none;
	}

	.hour-row.current {
		background: rgba(59, 130, 246, 0.1);
		margin-inline: calc(var(--space-4) * -1);
		padding-inline: var(--space-4);
	}

	.hour-time {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.hour-row.current .hour-time {
		color: var(--accent);
		font-weight: 600;
	}

	.hour-temp {
		font-size: 15px;
		font-weight: 600;
	}

	.hour-precip {
		font-size: 13px;
		color: var(--accent);
		text-align: right;
	}

	.hour-precip.empty {
		color: var(--text-secondary);
	}

	.hour-wind {
		font-size: 14px;
		text-align: right;
	}

	/* ---------- daily table ---------- */
	.daily {
		padding: var(--space-2) var(--space-4);
	}

	.day-row {
		display: grid;
		grid-template-columns: 1fr 28px 44px 44px auto;
		align-items: center;
		gap: var(--space-3);
		min-height: 44px;
		border-bottom: 1px solid var(--divider);
	}

	.day-row:last-child {
		border-bottom: none;
	}

	.day-label {
		font-size: 15px;
	}

	.day-label.today {
		color: var(--accent);
		font-weight: 600;
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

	.day-precip {
		font-size: 13px;
		color: var(--accent);
		text-align: right;
		min-width: 36px;
	}

	.rain-marker {
		width: 14px;
		height: 14px;
		vertical-align: middle;
	}
</style>