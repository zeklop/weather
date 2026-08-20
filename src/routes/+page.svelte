<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { getForecastStore } from '$lib/stores/context';
	import WeatherIcon from '$lib/components/WeatherIcon.svelte';
	import { getWeatherVisual, type WeatherVisual } from '$lib/weather/wmo';
	import { formatDayShort, formatHour, formatTimeShort, isToday } from '$lib/weather/format';
	import {
		formatPrecipitationPhrase,
		getHourStartIdx,
		getWallNow,
		wallMinutesBetween
	} from '$lib/weather/now';
	import { formatMmhg, formatTemp, formatWind, hpaToMmhg } from '$lib/weather/units';
	import { windDirectionLabel } from '$lib/weather/direction';
	import { isDay } from '$lib/weather/dayNight';
	import type { DayForecast } from '$lib/types';

	const store = getForecastStore();
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

	const railHours = $derived(payload ? payload.hourly.slice(hourStartIdx, hourStartIdx + 24) : []);
	const isCurrentHour = $derived(
		!!(payload && nowIso && payload.hourly[hourStartIdx]?.time.slice(0, 13) === nowIso.slice(0, 13))
	);
	const currentProb = $derived(payload ? (payload.hourly[hourStartIdx]?.precipitationProbability ?? null) : null);

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
		if (rawHourStartIdx === -1) return null;
		const win = payload.hourly.slice(hourStartIdx + 1, hourStartIdx + 3);
		if (win.length === 0) return null;
		const hasData = win.some((h) => h.precipitationProbability != null || h.precipitation > 0);
		if (!hasData) return null;
		if (payload.current.precipitation > 0) {
			const visual = getWeatherVisual(payload.current.weatherCode);
			return formatPrecipitationPhrase(visual.shortLabelRu, null, true);
		}
		const soon = win.find((h) => (h.precipitationProbability ?? 0) >= 50 || h.precipitation > 0);
		if (!soon) return 'Без осадков';
		const minutes = wallMinutesBetween(nowIso, soon.time);
		const visual = getWeatherVisual(soon.weatherCode);
		return formatPrecipitationPhrase(visual.shortLabelRu, minutes, false);
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
			<button class="retry-btn" type="button" onclick={() => store.refresh()}>Повторить</button>
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
				<button class="retry-btn" type="button" onclick={() => store.refresh()}>Повторить</button>
			</div>
		{/if}

		<h1 class="sr-only">Погода сейчас</h1>

		<div class="hero">
			<div class="hero-main">
				<div class="hero-left">
					<div class="hero-temp">{formatTemp(payload.current.temperature)}</div>
					<div class="hero-label">{heroVisual.labelRu}</div>
					<div class="hero-feels">Ощущается как {formatTemp(payload.current.apparentTemperature)}</div>
				</div>
				<div class="hero-icon">
					<WeatherIcon name={iconName(heroVisual, dayNightFor(payload.current.time))} size={84} />
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
				{#each railHours as h, i}
					{@const current = isCurrentHour && i === 0}
					{@const v = current ? heroVisual : getWeatherVisual(h.weatherCode)}
					{@const prob = current ? currentProb : h.precipitationProbability}
					{@const day = current ? dayNightFor(payload.current.time) : dayNightFor(h.time)}
					<div class="rail-cell" class:current>
						<span class="cell-time">{current ? 'Сейчас' : formatHour(h.time)}</span>
						<WeatherIcon name={iconName(v, day)} size={30} />
						<span class="cell-temp">{formatTemp(current ? payload.current.temperature : h.temperature)}</span>
						{#if prob != null && prob >= 10}
							<span class="cell-precip">{prob}%</span>
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
					<WeatherIcon name={todayVisual.iconDay} size={44} />
				</div>
			</div>
		{/if}

		{#if previewDays.length > 0}
			<div class="card daily">
				{#each previewDays as d}
					{@const dv = getWeatherVisual(d.weatherCode)}
					<div class="day-row">
						<span class="day-label">{formatDayShort(d.date)}</span>
						<WeatherIcon name={dv.iconDay} size={26} />
						<span class="day-high">{formatTemp(d.temperatureMax)}</span>
						<span class="day-low">{formatTemp(d.temperatureMin)}</span>
					</div>
				{/each}
				<a class="daily-link" href={base + '/forecast/'}>Прогноз на 10 дней →</a>
			</div>
		{/if}
	</div>
{/if}

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