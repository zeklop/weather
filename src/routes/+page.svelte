<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { getAlertsStoreContext, getForecastStore } from '$lib/stores/context';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { t } from '$lib/i18n';
	import WeatherIcon from '$lib/components/WeatherIcon.svelte';
	import WeatherAlertCard from '$lib/components/WeatherAlertCard.svelte';
	import PrecipitationChart from '$lib/components/PrecipitationChart.svelte';
	import { getWeatherVisual, type WeatherVisual } from '$lib/weather/wmo';
	import {
		formatDayShort,
		formatHour,
		formatRailDateBadge,
		formatStaleTime,
		isToday
	} from '$lib/weather/format';
	import {
		formatPrecipitationPhrase,
		getHourStartIdx,
		getWallNow,
		wallMinutesBetween
	} from '$lib/weather/now';
	import { formatMmhg, formatTemp, formatWind, hpaToMmhg } from '$lib/weather/units';
	import { windDirectionLabel } from '$lib/weather/direction';
	import { isDay } from '$lib/weather/dayNight';
	import { hasMeaningfulPrecipitation } from '$lib/weather/chart';
	import type { DayForecast } from '$lib/types';

	const store = getForecastStore();
	const alertsStore = getAlertsStoreContext();
	const settings = getSettingsStore();
	const lang = $derived(settings.language);
	const payload = $derived(store.payload);
	const status = $derived(store.status);
	const refreshing = $derived(store.refreshing);
	const activeAlert = $derived(alertsStore.activeAlert);

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
	const isExpired = $derived(rawHourStartIdx === -1);

	const railHours = $derived(payload ? payload.hourly.slice(hourStartIdx, hourStartIdx + 24) : []);
	const isCurrentHour = $derived(
		!!(payload && nowIso && payload.hourly[hourStartIdx]?.time.slice(0, 13) === nowIso.slice(0, 13))
	);
	const currentProb = $derived(payload ? (payload.hourly[hourStartIdx]?.precipitationProbability ?? null) : null);
	const hasPrecipData = $derived(hasMeaningfulPrecipitation(railHours));

	const todayDay = $derived(payload && nowIso
		? (payload.daily.find((d) => isToday(d.date, nowIso)) ?? payload.daily[0])
		: null);
	const dayByDate = $derived(payload ? new Map(payload.daily.map((d) => [d.date, d])) : new Map<string, DayForecast>());
	const previewDays = $derived.by(() => {
		if (!payload) return [];
		const todayIdx = nowIso ? payload.daily.findIndex((d) => isToday(d.date, nowIso)) : -1;
		const start = todayIdx >= 0 ? todayIdx + 1 : 1;
		return payload.daily.slice(start, start + 7);
	});

	// Deterministic heuristic over hourly data (§13.3) — no invented nowcasting:
	// window is the next 2 full hours; card hidden when the window has no
	// probability/amount data at all.
	const precipCard = $derived.by((): string | null => {
		if (!payload || !nowIso) return null;
		if (isExpired) return null;
		const win = payload.hourly.slice(hourStartIdx + 1, hourStartIdx + 3);
		if (win.length === 0) return null;
		const hasData = win.some((h) => h.precipitationProbability != null || h.precipitation > 0);
		if (!hasData) return null;
		if (payload.current.precipitation > 0) {
			const visual = getWeatherVisual(payload.current.weatherCode, lang);
			const label = payload.current.weatherCode < 51 ? (lang === 'ru' ? 'Дождь' : 'Rain') : visual.shortLabel;
			return formatPrecipitationPhrase(label, null, true, lang);
		}
		const soon = win.find((h) => (h.precipitationProbability ?? 0) >= 50 || h.precipitation > 0);
		if (!soon) return t('home.noPrecipitation', lang);
		const minutes = wallMinutesBetween(nowIso, soon.time);
		const visual = getWeatherVisual(soon.weatherCode, lang);
		const label = soon.weatherCode < 51 ? (lang === 'ru' ? 'Дождь' : 'Rain') : visual.shortLabel;
		return formatPrecipitationPhrase(label, minutes, false, lang);
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
		<span class="sr-only">{t('home.loading', lang)}</span>
	</div>
{:else if !payload && (status === 'error' || status === 'offline')}
	<div class="home">
		<div class="card state">
			<div class="state-title">{status === 'error' ? t('home.errorTitle', lang) : t('home.offlineTitle', lang)}</div>
			{#if status === 'offline'}
				<div class="state-text">{t('home.offlineText', lang)}</div>
			{/if}
			<button class="retry-btn" type="button" onclick={() => store.refresh()}>{t('home.retry', lang)}</button>
		</div>
	</div>
{:else if payload}
	{@const heroVisual = getWeatherVisual(payload.current.weatherCode, lang)}
	<div class="home">
		{#if refreshing}
			<div class="refresh-note">
				<span class="spinner" aria-hidden="true"></span>
				{t('home.refreshing', lang)}
			</div>
		{/if}

		{#if isExpired}
			<div class="banner" role="status">
				<span>{t('home.staleBanner', lang)}</span>
				<button class="retry-btn" type="button" onclick={() => store.refresh()}>{t('home.update', lang)}</button>
			</div>
		{:else if status === 'error' || status === 'offline'}
			<div class="banner" role="status">
				<span>
					{status === 'error'
						? t('home.staleFailedShown', lang, { time: formatStaleTime(payload.current.time, nowIso, lang) })
						: t('home.staleOfflineShown', lang, { time: formatStaleTime(payload.current.time, nowIso, lang) })}
				</span>
				<button class="retry-btn" type="button" onclick={() => store.refresh()}>{t('home.retry', lang)}</button>
			</div>
		{/if}

		{#if activeAlert}
			<WeatherAlertCard
				alert={activeAlert}
				ondismiss={() => alertsStore.dismissAlert(activeAlert.id)}
			/>
		{/if}

		<h1 class="sr-only">{t('home.weatherNowSr', lang)}</h1>

		<div class="hero">
			<div class="hero-main">
				<div class="hero-left">
					<div class="hero-temp">{formatTemp(payload.current.temperature)}</div>
					<div class="hero-label">{heroVisual.label}</div>
					<div class="hero-feels">{t('home.feelsLike', lang, { temp: formatTemp(payload.current.apparentTemperature) })}</div>
				</div>
				<div class="hero-icon">
					<WeatherIcon name={iconName(heroVisual, dayNightFor(payload.current.time))} size={84} />
					<span class="sr-only">{heroVisual.label}</span>
				</div>
			</div>
			<div class="hero-secondary">
				<span>{t('home.wind', lang, { speed: formatWind(payload.current.windSpeed, lang), dir: windDirectionLabel(payload.current.windDirection, lang) })}</span>
				<span>{t('home.pressure', lang, { pressure: formatMmhg(hpaToMmhg(payload.current.pressureHpa), lang) })}</span>
			</div>
		</div>

		{#if precipCard}
			<a class="card precip" href={base + '/map/'}>
				<div class="precip-header">
					<div class="precip-title">{t('home.next2Hours', lang)}</div>
					<div class="precip-map-link">{t('home.showOnMap', lang)}</div>
				</div>
				<div class="precip-text">{precipCard}</div>
			</a>
		{/if}

		{#if !isExpired && railHours.length > 0}
			<div class="card rail">
				<div class="rail-scroll" role="group" aria-label={t('home.hourlyForecast', lang)}>
					{#each railHours as h, i}
						{@const current = isCurrentHour && i === 0}
						{@const v = current ? heroVisual : getWeatherVisual(h.weatherCode, lang)}
						{@const prob = current ? currentProb : h.precipitationProbability}
						{@const day = current ? dayNightFor(payload.current.time) : dayNightFor(h.time)}
						{@const isNewDay = i > 0 && h.time.slice(0, 10) !== railHours[i - 1].time.slice(0, 10)}
						{#if isNewDay}
							<div class="rail-date-divider" role="separator" aria-label={formatRailDateBadge(h.time.slice(0, 10), nowIso, lang)}>
								<span class="date-divider-badge">{formatRailDateBadge(h.time.slice(0, 10), nowIso, lang)}</span>
							</div>
						{/if}
						<div class="rail-cell" class:current>
							<span class="cell-time">{current ? t('home.now', lang) : formatHour(h.time)}</span>
							<WeatherIcon name={iconName(v, day)} size={30} />
							<span class="sr-only">{v.label}</span>
							<span class="cell-temp">{formatTemp(current ? payload.current.temperature : h.temperature)}</span>
							{#if prob != null && prob >= 10}
								<span class="cell-precip">{prob}%<span class="sr-only"> {t('home.precipProbability', lang)}</span></span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if !isExpired && railHours.length > 0 && hasPrecipData}
			<PrecipitationChart hours={railHours} {lang} />
		{/if}

		{#if todayDay}
			{@const todayVisual = getWeatherVisual(todayDay.weatherCode, lang)}
			<div class="card today">
				<div class="today-main">
					<div class="today-text">
						<div class="today-title">{t('home.today', lang)}</div>
						<div class="today-temps">
							{t('home.dayAndNight', lang, { day: formatTemp(todayDay.temperatureMax), night: formatTemp(todayDay.temperatureMin) })}
						</div>
						{#if todayDay.precipitationSum < 1}
							<div class="today-note">{t('home.noSignificantPrecip', lang)}</div>
						{/if}
						{#if todayDay.sunrise || todayDay.sunset}
							<div class="today-sun">
								{#if todayDay.sunrise}
									<span>{t('home.sunrise', lang, { time: formatHour(todayDay.sunrise) })}</span>
								{/if}
								{#if todayDay.sunset}
									<span>{t('home.sunset', lang, { time: formatHour(todayDay.sunset) })}</span>
								{/if}
							</div>
						{/if}
					</div>
					<div class="today-icon">
						<WeatherIcon name={todayVisual.iconDay} size={44} />
						<span class="sr-only">{todayVisual.label}</span>
					</div>
				</div>
			</div>
		{/if}

		{#if previewDays.length > 0}
			<div class="card daily">
				{#each previewDays as d}
					{@const dv = getWeatherVisual(d.weatherCode, lang)}
					<div class="day-row">
						<span class="day-label">{formatDayShort(d.date, lang)}</span>
						<div class="day-icon">
							<WeatherIcon name={dv.iconDay} size={26} />
							<span class="sr-only">{dv.label}</span>
						</div>
						<span class="day-precip">
							{#if d.precipitationProbabilityMax != null && d.precipitationProbabilityMax >= 10}
								{d.precipitationProbabilityMax}%<span class="sr-only"> {t('home.precipProbability', lang)}</span>
							{/if}
						</span>
						<span class="day-high">{formatTemp(d.temperatureMax)}</span>
						<span class="day-low">{formatTemp(d.temperatureMin)}</span>
					</div>
				{/each}
				<a class="daily-link" href={base + '/forecast/'}>{t('home.forecast10Days', lang)}</a>
			</div>
		{/if}
	</div>
{/if}

<style>
	.home {
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

	/* ---------- hero ---------- */
	.hero {
		padding: var(--space-2) 0 0;
		max-width: 100%;
		min-width: 0;
	}

	.hero-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-width: 0;
	}

	@media (min-width: 768px) {
		.hero {
			padding: var(--space-4) 0 var(--space-2);
		}

		.hero-main {
			justify-content: flex-start;
			gap: var(--space-7);
		}
	}

	.hero-left {
		min-width: 0;
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
		min-width: 0;
	}

	/* ---------- near-term precipitation card ---------- */
	.precip {
		padding: var(--space-4);
		text-decoration: none;
		color: inherit;
		display: block;
		transition: opacity 0.15s ease, transform 0.15s ease;
	}

	.precip:active {
		transform: scale(0.99);
		opacity: 0.9;
	}

	.precip-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.precip-title {
		font-size: 15px;
		font-weight: 600;
	}

	.precip-map-link {
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
	}

	.precip-text {
		font-size: 15px;
		margin-top: 2px;
	}

	/* ---------- hourly rail ---------- */
	.rail {
		padding: var(--space-3) 0;
		max-width: 100%;
		min-width: 0;
	}

	.rail-scroll {
		display: flex;
		gap: var(--space-1);
		overflow-x: auto;
		max-width: 100%;
		-webkit-overflow-scrolling: touch;
		scroll-snap-type: x proximity;
		padding-inline: var(--space-4);
		scrollbar-width: none;
	}

	.rail-scroll::-webkit-scrollbar {
		display: none;
	}

	.rail-date-divider {
		flex: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--space-2);
		margin: var(--space-1) 0;
		border-left: 1px dashed var(--divider);
		border-right: 1px dashed var(--divider);
		background: rgba(0, 0, 0, 0.02);
		border-radius: var(--radius-control);
	}

	:global([data-theme='dark']) .rail-date-divider {
		background: rgba(255, 255, 255, 0.04);
	}

	.date-divider-badge {
		font-size: 12px;
		font-weight: 600;
		color: var(--accent-strong);
		white-space: nowrap;
		padding: 2px 6px;
		border-radius: 4px;
		background: rgba(37, 99, 235, 0.08);
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
		color: var(--accent-strong);
		font-weight: 600;
	}

	.cell-temp {
		font-size: 15px;
		font-weight: 600;
	}

	.cell-precip {
		font-size: 12px;
		color: var(--accent-strong);
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

	.today-icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
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

	.today-sun {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		font-size: 13px;
		color: var(--text-secondary);
		margin-top: var(--space-1);
	}

	/* ---------- daily preview ---------- */
	.daily {
		padding: var(--space-2) var(--space-4);
	}

	.day-row {
		display: grid;
		grid-template-columns: 80px 32px 1fr auto auto;
		align-items: center;
		gap: var(--space-3);
		min-height: 40px;
		border-bottom: 1px solid var(--divider);
		min-width: 0;
	}

	.day-row:last-of-type {
		border-bottom: none;
	}

	.day-label {
		font-size: 15px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.day-icon {
		display: grid;
		place-items: center;
	}

	.day-precip {
		font-size: 13px;
		color: var(--accent-strong);
		font-weight: 500;
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
		color: var(--accent-strong);
		font-size: 15px;
		font-weight: 500;
		text-decoration: none;
	}
</style>