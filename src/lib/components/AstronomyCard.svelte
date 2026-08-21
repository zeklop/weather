<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$lib/i18n';
	import type { Language } from '$lib/i18n/translations';
	import {
		formatDurationMinutes,
		getMoonInfo,
		getSunArcInfo,
		type MoonInfo,
		type SunArcInfo
	} from '$lib/weather/astronomy';
	import { formatHour } from '$lib/weather/format';
	import { getWallNow } from '$lib/weather/now';

	interface Props {
		sunrise: string | null;
		sunset: string | null;
		timezone: string;
		latitude: number;
		lang: Language;
	}

	const { sunrise, sunset, timezone, latitude, lang }: Props = $props();

	let nowMs = $state(Date.now());

	onMount(() => {
		const interval = setInterval(() => {
			if (typeof document !== 'undefined' && document.hidden) return;
			nowMs = Date.now();
		}, 60_000);
		return () => clearInterval(interval);
	});

	const nowWallIso = $derived(getWallNow(timezone, nowMs));
	const moonInfo = $derived<MoonInfo>(getMoonInfo(nowMs, latitude));
	const sunArc = $derived<SunArcInfo>(getSunArcInfo(sunrise, sunset, nowWallIso, latitude));

	const sunriseFormatted = $derived(sunrise ? formatHour(sunrise) : '—');
	const sunsetFormatted = $derived(sunset ? formatHour(sunset) : '—');

	const daylightText = $derived(
		sunArc.daylightMinutes !== null ? formatDurationMinutes(sunArc.daylightMinutes, lang) : '—'
	);

	const countdownText = $derived.by(() => {
		if (sunArc.status === 'day' && sunArc.minutesToSunset !== null) {
			return t('astronomy.untilSunset', lang, {
				time: formatDurationMinutes(sunArc.minutesToSunset, lang)
			});
		}
		if (
			(sunArc.status === 'before_sunrise' || sunArc.status === 'after_sunset') &&
			sunArc.minutesToSunrise !== null
		) {
			return t('astronomy.untilSunrise', lang, {
				time: formatDurationMinutes(sunArc.minutesToSunrise, lang)
			});
		}
		if (sunArc.status === 'polar_day') {
			return t('astronomy.polarDay', lang);
		}
		if (sunArc.status === 'polar_night') {
			return t('astronomy.polarNight', lang);
		}
		return '';
	});

	const moonPhaseLabel = $derived(t(`astronomy.${moonInfo.phaseName}`, lang));

	const moonEventText = $derived.by(() => {
		if (moonInfo.phaseName === 'full_moon') {
			return t('astronomy.todayFullMoon', lang);
		}
		if (moonInfo.phaseName === 'new_moon') {
			return t('astronomy.todayNewMoon', lang);
		}
		if (moonInfo.daysToFullMoon <= moonInfo.daysToNewMoon) {
			return t('astronomy.daysToFullMoon', lang, { days: moonInfo.daysToFullMoon });
		}
		return t('astronomy.daysToNewMoon', lang, { days: moonInfo.daysToNewMoon });
	});

	// Moon crescent / shape rendering helper
	// Phase 0..1: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
	const moonPath = $derived.by(() => {
		const p = moonInfo.phase;
		const r = 20;
		const cx = 24;
		const cy = 24;
		// SVG path for waxing/waning terminator
		// We draw the right semicircle (waxing) or left semicircle (waning) and ellipse terminator
		if (p < 0.02 || p > 0.98) return ''; // new moon: all dark
		if (p >= 0.48 && p <= 0.52) {
			// full moon: full circle
			return `M ${cx},${cy - r} A ${r} ${r} 0 1 1 ${cx},${cy + r} A ${r} ${r} 0 1 1 ${cx},${cy - r}`;
		}
		const rx = Math.abs(r * Math.cos(2 * Math.PI * p));
		const sweep = p < 0.5 ? 1 : 0;
		const innerSweep = (p >= 0.25 && p <= 0.75) ? sweep : 1 - sweep;
		
		return `M ${cx},${cy - r} A ${r} ${r} 0 0 ${sweep} ${cx},${cy + r} A ${rx} ${r} 0 0 ${innerSweep} ${cx},${cy - r}`;
	});
</script>

<div class="astronomy-card" data-no-ptr>
	<h2 class="section-title">{t('astronomy.title', lang)}</h2>

	<div class="astronomy-grid">
		<!-- Sun Sub-card -->
		<div class="astro-col sun-col">
			<div class="col-header">
				<span class="astro-tag">{t('astronomy.daylight', lang)}: {daylightText}</span>
			</div>

			<!-- Sun Arc SVG Visual -->
			<div class="arc-container" aria-hidden="true">
				<svg viewBox="0 0 160 80" class="sun-arc-svg" preserveAspectRatio="xMidYMid meet">
					<!-- Defs for gradients -->
					<defs>
						<linearGradient id="sunArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stop-color="#F59E0B" stop-opacity="0.3" />
							<stop offset="50%" stop-color="#FBBF24" stop-opacity="0.8" />
							<stop offset="100%" stop-color="#F59E0B" stop-opacity="0.3" />
						</linearGradient>
						<radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
							<stop offset="0%" stop-color="#FEF08A" stop-opacity="1" />
							<stop offset="60%" stop-color="#F59E0B" stop-opacity="0.8" />
							<stop offset="100%" stop-color="#F59E0B" stop-opacity="0" />
						</radialGradient>
					</defs>

					<!-- Horizon line -->
					<line x1="10" y1="65" x2="150" y2="65" stroke="var(--divider)" stroke-width="1" stroke-dasharray="3 3" />

					<!-- Arc path: from (15, 65) to (145, 65) with peak at y=15 -->
					<path
						d="M 15,65 A 65 50 0 0 1 145,65"
						fill="none"
						stroke="url(#sunArcGrad)"
						stroke-width="2.5"
						stroke-linecap="round"
					/>

					<!-- Sun disc position on arc -->
					{#if sunArc.status !== 'polar_day' && sunArc.status !== 'polar_night'}
						<!-- Mapping sunX (10..90) to SVG coords (15..145), sunY (20..80) to (15..65) -->
						{@const posX = 15 + (sunArc.sunX - 10) * (130 / 80)}
						{@const posY = 15 + (sunArc.sunY - 20) * (50 / 60)}
						<circle cx={posX} cy={posY} r="9" fill="url(#sunGlow)" />
						<circle cx={posX} cy={posY} r="5" fill="#FBBF24" stroke="#FFF" stroke-width="1.5" />
					{/if}
				</svg>
			</div>

			<!-- Sunrise / Sunset times -->
			<div class="sun-times">
				<div class="time-item">
					<span class="time-label">{t('astronomy.sunrise', lang)}</span>
					<span class="time-value">{sunriseFormatted}</span>
				</div>
				<div class="time-item end">
					<span class="time-label">{t('astronomy.sunset', lang)}</span>
					<span class="time-value">{sunsetFormatted}</span>
				</div>
			</div>

			<div class="astro-countdown">{countdownText}</div>
		</div>

		<!-- Moon Sub-card -->
		<div class="astro-col moon-col">
			<div class="col-header">
				<span class="astro-tag">{t('astronomy.moonPhase', lang)}</span>
			</div>

			<!-- Moon Visual Disc -->
			<div class="moon-visual-wrap" aria-hidden="true">
				<svg
					viewBox="0 0 48 48"
					class="moon-svg"
					style={moonInfo.isSouthern ? 'transform: rotate(180deg);' : ''}
				>
					<!-- Dark moon background -->
					<circle cx="24" cy="24" r="20" fill="var(--moon-dark, #334155)" />

					<!-- Illuminated phase path -->
					{#if moonPath}
						<path d={moonPath} fill="var(--moon-light, #FEF08A)" />
					{/if}

					<!-- Outer border ring -->
					<circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" stroke-width="1.5" />
				</svg>

				<div class="illumination-badge">
					{moonInfo.illumination}%
				</div>
			</div>

			<div class="moon-info">
				<div class="moon-phase-name">{moonPhaseLabel}</div>
				<div class="moon-event">{moonEventText}</div>
			</div>
		</div>
	</div>

	<!-- Screen reader text -->
	<div class="sr-only">
		{t('astronomy.title', lang)}:
		{t('astronomy.sunrise', lang)} {sunriseFormatted},
		{t('astronomy.sunset', lang)} {sunsetFormatted}.
		{countdownText}.
		{t('astronomy.moonPhase', lang)}: {moonPhaseLabel},
		{t('astronomy.illumination', lang)}: {moonInfo.illumination}%.
		{moonEventText}.
	</div>
</div>

<style>
	.astronomy-card {
		background: var(--bg-card);
		border-radius: var(--radius-card);
		box-shadow: var(--card-shadow);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		border: 1px solid var(--border);
	}

	.section-title {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin: 0;
	}

	.astronomy-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	@media (max-width: 360px) {
		.astronomy-grid {
			grid-template-columns: 1fr;
			gap: var(--space-4);
		}
	}

	.astro-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--bg-primary);
		border-radius: calc(var(--radius-card) - 4px);
		padding: var(--space-3);
		text-align: center;
	}

	.col-header {
		width: 100%;
		display: flex;
		justify-content: center;
		margin-bottom: var(--space-2);
	}

	.astro-tag {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.arc-container {
		width: 100%;
		max-width: 140px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.sun-arc-svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.sun-times {
		width: 100%;
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-1);
	}

	.time-item {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.time-item.end {
		align-items: flex-end;
	}

	.time-label {
		font-size: 0.625rem;
		color: var(--text-secondary);
		text-transform: uppercase;
	}

	.time-value {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.astro-countdown {
		margin-top: var(--space-2);
		font-size: 0.6875rem;
		font-weight: 500;
		color: #f59e0b;
	}

	.moon-visual-wrap {
		position: relative;
		width: 48px;
		height: 48px;
		margin: var(--space-1) auto var(--space-2);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.moon-svg {
		width: 48px;
		height: 48px;
		transition: transform 0.3s ease;
	}

	.illumination-badge {
		position: absolute;
		bottom: -4px;
		right: -10px;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 0.625rem;
		font-weight: 700;
		color: var(--text-primary);
		padding: 1px 4px;
		line-height: 1.2;
		box-shadow: var(--card-shadow);
	}

	.moon-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.moon-phase-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.moon-event {
		font-size: 0.6875rem;
		color: var(--text-secondary);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
