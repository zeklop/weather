<script lang="ts">
	import { onMount } from 'svelte';
	import { getForecastStore } from '$lib/stores/context';
	import { getLocationStore } from '$lib/stores/location.svelte';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { t } from '$lib/i18n';
	import WeatherIcon from '$lib/components/WeatherIcon.svelte';
	import { getWeatherVisual, type WeatherVisual } from '$lib/weather/wmo';
	import {
		formatDateShort,
		formatDayAndDate,
		formatDayHeader,
		formatHour,
		formatTimeShort,
		isToday
	} from '$lib/weather/format';
	import { getHourStartIdx, getWallNow } from '$lib/weather/now';
	import { formatPrecipMm, formatTemp, formatWindSpeed } from '$lib/weather/units';
	import { isDay } from '$lib/weather/dayNight';
	import type { DayForecast, HourForecast } from '$lib/types';

	const location = getLocationStore();
	const store = getForecastStore();
	const settings = getSettingsStore();
	const lang = $derived(settings.language);
	const payload = $derived(store.payload);
	const status = $derived(store.status);
	const refreshing = $derived(store.refreshing);

	// Minute ticker keeps «Сейчас»/current-hour highlight honest while the SPA
	// stays open across an hour boundary.
	let nowMs = $state(Date.now());
	onMount(() => {
		const id = setInterval(() => {
			nowMs = Date.now();
		}, 60_000);
		return () => clearInterval(id);
	});

	const nowIso = $derived(payload ? getWallNow(payload.timezone, nowMs) : null);

	const rawHourStartIdx = $derived(
		payload && nowIso ? getHourStartIdx(payload.hourly.map((h) => h.time), nowIso) : 0
	);
	const hourStartIdx = $derived(rawHourStartIdx >= 0 ? rawHourStartIdx : 0);

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
</script>

<svelte:head>
	<title>{t('forecast.title', lang)} — {location.current.name} | {t('app.title', lang)}</title>
	<meta name="description" content={t('forecast.description', lang)} />
</svelte:head>

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
		<span class="sr-only">{t('home.loading', lang)}</span>
	</div>
{:else if !payload && (status === 'error' || status === 'offline')}
	<div class="forecast">
		<div class="card state">
			<div class="state-title">{status === 'error' ? t('home.errorTitle', lang) : t('home.offlineTitle', lang)}</div>
			{#if status === 'offline'}
				<div class="state-text">{t('home.offlineText', lang)}</div>
			{/if}
			<button class="retry-btn" type="button" onclick={() => store.refresh()}>{t('home.retry', lang)}</button>
		</div>
	</div>
{:else if payload}
	<div class="forecast">
		{#if refreshing}
			<div class="refresh-note">
				<span class="spinner" aria-hidden="true"></span>
				{t('home.refreshing', lang)}
			</div>
		{/if}

		{#if status === 'error' || status === 'offline'}
			<div class="banner" role="status">
				<span>
					{status === 'error'
						? t('home.staleFailedShown', lang, { time: formatTimeShort(payload.current.time) })
						: t('home.staleOfflineShown', lang, { time: formatTimeShort(payload.current.time) })}
				</span>
				<button class="retry-btn" type="button" onclick={() => store.refresh()}>{t('home.retry', lang)}</button>
			</div>
		{/if}

		<h1 class="sr-only">{t('forecast.title', lang)}</h1>

		<h2 class="section-title">{t('forecast.hourlyTitle', lang)}</h2>
		<div class="card hourly">
			<div class="hour-header" aria-hidden="true">
				<span class="col-time">{t('forecast.time', lang)}</span>
				<span class="col-icon">{t('forecast.weather', lang)}</span>
				<span class="col-temp">{t('forecast.temp', lang)}</span>
				<span class="col-precip">{t('forecast.precip', lang)}</span>
				<span class="col-wind">{t('forecast.wind', lang)}</span>
			</div>
			{#each hourRows as h, i}
				{@const v = getWeatherVisual(h.weatherCode, lang)}
				{@const p = hourPrecip(h)}
				{@const showDayHeader = i === 0 || h.time.slice(0, 10) !== hourRows[i - 1]?.time.slice(0, 10)}
				{#if showDayHeader}
					<div class="day-divider" role="heading" aria-level="3">
						<span>{formatDayHeader(h.time.slice(0, 10), nowIso, lang)}</span>
					</div>
				{/if}
				<div class="hour-row" class:current={isCurrentHour && i === 0}>
					<span class="hour-time">{isCurrentHour && i === 0 ? t('home.now', lang) : formatHour(h.time)}</span>
					<div class="hour-icon">
						<WeatherIcon name={iconName(v, dayNightFor(h.time))} size={32} />
						<span class="sr-only">{v.shortLabel}</span>
					</div>
					<span class="hour-temp">{formatTemp(h.temperature)}</span>
					<span class="hour-precip" class:empty={p === null} title={p ? t('forecast.precipProbabilityTitle', lang, { prob: p }) : t('forecast.noPrecipitation', lang)}>
						{#if p}
							{p}<span class="sr-only"> {t('home.precipProbability', lang)}</span>
						{:else}
							<span class="sr-only">{t('forecast.noPrecipitation', lang)}</span>
							<span aria-hidden="true">–</span>
						{/if}
					</span>
					<span class="hour-wind">{formatWindSpeed(h.windSpeed, lang)}</span>
				</div>
			{/each}
		</div>

		<h2 class="section-title">{t('forecast.dailyTitle', lang)}</h2>
		<div class="card daily">
			<div class="daily-header" aria-hidden="true">
				<span class="col-day">{t('forecast.day', lang)}</span>
				<span class="col-icon">{t('forecast.weather', lang)}</span>
				<span class="col-precip">{t('forecast.precip', lang)}</span>
				<span class="col-temps">{t('forecast.minMax', lang)}</span>
			</div>
			{#each dailyRows as d}
				{@const dv = getWeatherVisual(d.weatherCode, lang)}
				{@const today = !!nowIso && isToday(d.date, nowIso)}
				{@const hasProb = d.precipitationProbabilityMax != null && d.precipitationProbabilityMax >= 10}
				{@const hasMm = d.precipitationSum > 0}
				<div class="day-row">
					<span class="day-label" class:today title={today ? t('home.today', lang) : formatDayAndDate(d.date, lang)}>
						{today ? `${t('home.today', lang)}, ${formatDateShort(d.date, lang)}` : formatDayAndDate(d.date, lang)}
					</span>
					<div class="day-icon">
						<WeatherIcon name={iconName(dv, dayIsDay(d))} size={32} />
						<span class="sr-only">{dv.shortLabel}</span>
					</div>
					<div class="day-precip">
						{#if hasProb || hasMm}
							<div class="day-precip-box">
								{#if hasProb}
									<span class="precip-prob">{d.precipitationProbabilityMax}%<span class="sr-only"> {t('home.precipProbability', lang)}</span></span>
								{/if}
								{#if hasMm}
									<span class="precip-mm">{formatPrecipMm(d.precipitationSum, lang)}</span>
								{/if}
							</div>
						{:else}
							<span class="day-precip-empty" title={t('forecast.noPrecipitation', lang)}>
								<span class="sr-only">{t('forecast.noPrecipitation', lang)}</span>
								<span aria-hidden="true">–</span>
							</span>
						{/if}
					</div>
					<div class="day-temps">
						<span class="day-low" title={t('forecast.nightMin', lang)}>{formatTemp(d.temperatureMin)}</span>
						<span class="day-sep" aria-hidden="true">/</span>
						<span class="day-high" title={t('forecast.dayMax', lang)}>{formatTemp(d.temperatureMax)}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.forecast {
		display: grid;
		gap: var(--space-4);
		max-width: 100%;
		min-width: 0;
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

	:global([data-theme='dark']) .banner {
		background: rgba(249, 115, 22, 0.15);
		border-color: rgba(249, 115, 22, 0.35);
		color: #fdba74;
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
		max-width: 100%;
		min-width: 0;
	}

	.hour-header {
		display: grid;
		grid-template-columns: 56px 44px 44px 52px 1fr;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--divider);
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
		min-width: 0;
	}

	.hour-header .col-time {
		text-align: left;
	}
	.hour-header .col-icon {
		text-align: center;
	}
	.hour-header .col-temp {
		text-align: left;
	}
	.hour-header .col-precip {
		text-align: right;
	}
	.hour-header .col-wind {
		text-align: right;
	}

	.day-divider {
		position: sticky;
		top: 0;
		z-index: 2;
		background: var(--bg-card);
		backdrop-filter: blur(8px);
		padding: var(--space-3) 0 var(--space-2);
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
		border-bottom: 1px solid var(--divider);
	}

	.hour-row {
		display: grid;
		grid-template-columns: 56px 44px 44px 52px 1fr;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		border-bottom: 1px solid var(--divider);
		min-width: 0;
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
		color: var(--accent-strong);
		font-weight: 600;
	}

	.hour-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hour-temp {
		font-size: 15px;
		font-weight: 600;
	}

	.hour-precip {
		font-size: 13px;
		color: var(--accent-strong);
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
		max-width: 100%;
		min-width: 0;
	}

	.daily-header {
		display: grid;
		grid-template-columns: 96px 36px 1fr 76px;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--divider);
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
		min-width: 0;
	}

	.daily-header .col-day {
		text-align: left;
	}
	.daily-header .col-icon {
		text-align: center;
	}
	.daily-header .col-precip {
		text-align: right;
	}
	.daily-header .col-temps {
		text-align: right;
	}

	.day-row {
		display: grid;
		grid-template-columns: 96px 36px 1fr 76px;
		align-items: center;
		gap: var(--space-2);
		min-height: 48px;
		border-bottom: 1px solid var(--divider);
		min-width: 0;
	}

	.day-row:last-child {
		border-bottom: none;
	}

	.day-label {
		font-size: 14px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.day-label.today {
		color: var(--accent-strong);
		font-weight: 600;
	}

	.day-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.day-precip {
		min-width: 0;
		display: flex;
		justify-content: flex-end;
	}

	.day-precip-box {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		line-height: 1.2;
	}

	.precip-prob {
		font-size: 13px;
		font-weight: 500;
		color: var(--accent-strong);
	}

	.precip-mm {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.day-precip-empty {
		font-size: 13px;
		color: var(--text-secondary);
		text-align: right;
	}

	.day-temps {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-1);
		text-align: right;
		font-size: 15px;
		font-variant-numeric: tabular-nums;
	}

	.day-low {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.day-sep {
		color: var(--divider);
		font-size: 12px;
	}

	.day-high {
		color: var(--text-primary);
		font-weight: 600;
	}
</style>