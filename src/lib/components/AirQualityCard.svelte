<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Language } from '$lib/i18n/translations';
	import type { AirQualityData, PollenLevels, Pollutants } from '$lib/types';
	import {
		getAqiCategory,
		getAqiColor,
		getDominantAllergen,
		getPollenCategory,
		getPollutantCategory,
		type AqiCategory,
		type MetricCategory,
		type PollenCategory
	} from '$lib/weather/airQualityUtils';

	interface Props {
		data: AirQualityData | null;
		lang: Language;
	}

	const { data, lang }: Props = $props();

	let isExpanded = $state(false);

	const aqi = $derived(data?.aqi ?? null);
	const category = $derived<AqiCategory | null>(getAqiCategory(aqi));
	const aqiColor = $derived(getAqiColor(category));
	const categoryLabel = $derived(category ? t(`airQualityDetails.${category}`, lang) : '—');

	const dominantAllergen = $derived.by(() => {
		if (!data || !data.hasPollenCoverage) return null;
		return getDominantAllergen(data.pollen);
	});

	const activePollenCount = $derived.by(() => {
		if (!data || !data.hasPollenCoverage) return 0;
		return Object.values(data.pollen).filter((v) => typeof v === 'number' && v > 0).length;
	});

	// Pollutants list definition
	const pollutantList: Array<{ key: keyof Pollutants; unit: string; isCo?: boolean }> = [
		{ key: 'pm2_5', unit: 'µg/m³' },
		{ key: 'pm10', unit: 'µg/m³' },
		{ key: 'nitrogenDioxide', unit: 'µg/m³' },
		{ key: 'ozone', unit: 'µg/m³' },
		{ key: 'sulphurDioxide', unit: 'µg/m³' },
		{ key: 'carbonMonoxide', unit: 'mg/m³', isCo: true }
	];

	// Pollen plants list
	const pollenList: Array<{ key: keyof PollenLevels }> = [
		{ key: 'birch' },
		{ key: 'grass' },
		{ key: 'alder' },
		{ key: 'ragweed' },
		{ key: 'mugwort' },
		{ key: 'olive' }
	];

	function formatPollutantValue(key: keyof Pollutants, val: number | null, isCo?: boolean): string {
		if (val === null) return '—';
		if (isCo) {
			// API returns µg/m³, display in mg/m³ (e.g. 250 µg/m³ -> 0.3 mg/m³)
			return (val / 1000).toFixed(1);
		}
		return Math.round(val).toString();
	}

	function getMetricBadgeClass(cat: MetricCategory | PollenCategory | null): string {
		if (!cat || cat === 'none' || cat === 'good' || cat === 'low') return 'badge-good';
		if (cat === 'moderate') return 'badge-mod';
		if (cat === 'high') return 'badge-high';
		return 'badge-danger';
	}
</script>

<div class="air-quality-card" data-no-ptr>
	<div class="card-top">
		<div class="header-left">
			<h2 class="section-title">{t('airQualityDetails.title', lang)}</h2>
			<div class="subtitle">{t('airQualityDetails.subtitle', lang)}</div>
		</div>

		<div class="aqi-badge-top" style="--aqi-color: {aqiColor};">
			<span class="aqi-num">{aqi !== null ? Math.round(aqi) : '—'}</span>
			<span class="aqi-status">{categoryLabel}</span>
		</div>
	</div>

	<!-- Visual AQI Gauge Bar -->
	{#if aqi !== null}
		<div class="gauge-wrap" aria-hidden="true">
			<div class="gauge-bar">
				<div class="gauge-segment s-good"></div>
				<div class="gauge-segment s-fair"></div>
				<div class="gauge-segment s-moderate"></div>
				<div class="gauge-segment s-poor"></div>
				<div class="gauge-segment s-very-poor"></div>
				<div class="gauge-segment s-hazardous"></div>
			</div>
			<!-- Marker indicator -->
			<div
				class="gauge-marker"
				style="left: {Math.max(2, Math.min(98, (aqi / 100) * 100))}%; --marker-color: {aqiColor};"
			></div>
		</div>
	{/if}

	<!-- Dominant Allergen Pill (if Moderate+) -->
	{#if dominantAllergen}
		<div class="allergen-pill">
			<span class="pill-icon" aria-hidden="true">🌸</span>
			<span class="pill-text">
				{t('airQualityDetails.dominantAllergen', lang, {
					name: t(`airQualityDetails.${dominantAllergen.key}`, lang),
					level: t(`airQualityDetails.${dominantAllergen.category}`, lang)
				})}
			</span>
		</div>
	{/if}

	<!-- Toggle Accordion Button -->
	<button
		type="button"
		class="accordion-toggle"
		aria-expanded={isExpanded}
		onclick={() => (isExpanded = !isExpanded)}
	>
		<span>{isExpanded ? t('airQualityDetails.hideDetailsBtn', lang) : t('airQualityDetails.detailsBtn', lang)}</span>
		<span class="chevron" class:open={isExpanded} aria-hidden="true">▼</span>
	</button>

	<!-- Accordion Content (Lazy rendered when expanded) -->
	{#if isExpanded && data}
		<div class="accordion-content" role="region" aria-label={t('airQualityDetails.title', lang)}>
			<!-- Pollutants Sub-section -->
			<div class="pollutants-section">
				<div class="sub-heading">{t('home.metricsTitle', lang)}</div>
				<div class="pollutants-grid">
					{#each pollutantList as p}
						{@const val = data.pollutants[p.key]}
						{@const pCat = getPollutantCategory(p.key, val)}
						<div class="pollutant-row">
							<div class="p-info">
								<span class="p-name">{t(`airQualityDetails.${p.key}`, lang)}</span>
								<span class="p-val">
									{formatPollutantValue(p.key, val, p.isCo)} <span class="p-unit">{p.unit}</span>
								</span>
							</div>
							{#if pCat}
								<span class="badge {getMetricBadgeClass(pCat)}">
									{t(`airQualityDetails.${pCat}`, lang)}
								</span>
							{/if}
						</div>
					{/each}
				</div>
				<div class="who-note">{t('airQualityDetails.who24hNote', lang)}</div>
			</div>

			<!-- Pollen Sub-section -->
			<div class="pollen-section">
				<div class="sub-heading">{t('airQualityDetails.pollenTitle', lang)}</div>

				{#if !data.hasPollenCoverage}
					<div class="pollen-status-note">{t('airQualityDetails.noPollenCoverage', lang)}</div>
				{:else if activePollenCount === 0}
					<div class="pollen-status-note green">{t('airQualityDetails.noAllergens', lang)}</div>
				{:else}
					<div class="pollen-grid">
						{#each pollenList as pl}
							{@const pVal = data.pollen[pl.key]}
							{@const polCat = getPollenCategory(pVal)}
							<div class="pollen-cell">
								<span class="pollen-name">{t(`airQualityDetails.${pl.key}`, lang)}</span>
								<span class="pollen-count">{pVal !== null ? Math.round(pVal) : '—'} <span class="p-unit">/m³</span></span>
								{#if polCat}
									<span class="badge {getMetricBadgeClass(polCat)}">
										{t(`airQualityDetails.${polCat}`, lang)}
									</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Screen Reader Summary -->
	<div class="sr-only">
		{t('airQualityDetails.title', lang)}: {aqi !== null ? Math.round(aqi) : '—'}, {categoryLabel}.
	</div>
</div>

<style>
	.air-quality-card {
		background: var(--bg-card);
		border-radius: var(--radius-card);
		box-shadow: var(--card-shadow);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		border: 1px solid var(--border);
	}

	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.section-title {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin: 0;
	}

	.subtitle {
		font-size: 0.6875rem;
		color: var(--text-secondary);
	}

	.aqi-badge-top {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: var(--bg-primary);
		padding: 4px 10px;
		border-radius: 12px;
		border-left: 3px solid var(--aqi-color, var(--accent));
	}

	.aqi-num {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.aqi-status {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--aqi-color, var(--text-primary));
	}

	.gauge-wrap {
		position: relative;
		width: 100%;
		padding: 4px 0;
	}

	.gauge-bar {
		display: flex;
		height: 6px;
		width: 100%;
		border-radius: 3px;
		overflow: hidden;
		background: var(--border);
	}

	.gauge-segment {
		flex: 1;
		height: 100%;
	}

	.s-good { background: #10b981; }
	.s-fair { background: #84cc16; }
	.s-moderate { background: #eab308; }
	.s-poor { background: #f97316; }
	.s-very-poor { background: #ef4444; }
	.s-hazardous { background: #a855f7; }

	.gauge-marker {
		position: absolute;
		top: 1px;
		width: 12px;
		height: 12px;
		background: var(--marker-color, #3b82f6);
		border: 2px solid #fff;
		border-radius: 50%;
		transform: translateX(-50%);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		transition: left 0.3s ease;
	}

	.allergen-pill {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		background: rgba(234, 179, 8, 0.12);
		border: 1px solid rgba(234, 179, 8, 0.3);
		border-radius: var(--radius-control);
		padding: 6px 10px;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	:global([data-theme='dark']) .allergen-pill {
		background: rgba(234, 179, 8, 0.18);
		border-color: rgba(234, 179, 8, 0.4);
	}

	.pill-icon {
		font-size: 0.875rem;
	}

	.accordion-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		border-radius: var(--radius-control);
		padding: 8px 12px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.accordion-toggle:hover {
		background: var(--divider);
	}

	.chevron {
		font-size: 0.625rem;
		transition: transform 0.2s ease;
		color: var(--text-secondary);
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.accordion-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-top: var(--space-2);
		animation: expandFade 0.2s ease;
	}

	@keyframes expandFade {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.sub-heading {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		margin-bottom: var(--space-2);
	}

	.pollutants-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2);
	}

	@media (max-width: 480px) {
		.pollutants-grid {
			grid-template-columns: 1fr;
		}
	}

	.pollutant-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--bg-primary);
		padding: 6px 10px;
		border-radius: 8px;
	}

	.p-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.p-name {
		font-size: 0.6875rem;
		color: var(--text-secondary);
	}

	.p-val {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.p-unit {
		font-size: 0.625rem;
		font-weight: 400;
		color: var(--text-secondary);
	}

	.who-note {
		font-size: 0.625rem;
		color: var(--text-secondary);
		margin-top: var(--space-2);
	}

	.pollen-status-note {
		font-size: 0.75rem;
		color: var(--text-secondary);
		background: var(--bg-primary);
		padding: 8px 12px;
		border-radius: 8px;
	}

	.pollen-status-note.green {
		color: #10b981;
		font-weight: 500;
	}

	.pollen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: var(--space-2);
	}

	.pollen-cell {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 3px;
		background: var(--bg-primary);
		padding: 6px 10px;
		border-radius: 8px;
	}

	.pollen-name {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.pollen-count {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.badge {
		font-size: 0.625rem;
		font-weight: 700;
		padding: 1px 6px;
		border-radius: 6px;
		text-transform: capitalize;
	}

	.badge-good {
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
	}

	.badge-mod {
		background: rgba(234, 179, 8, 0.18);
		color: #b45309;
	}

	:global([data-theme='dark']) .badge-mod {
		color: #facc15;
	}

	.badge-high {
		background: rgba(249, 115, 22, 0.18);
		color: #c2410c;
	}

	:global([data-theme='dark']) .badge-high {
		color: #fb923c;
	}

	.badge-danger {
		background: rgba(239, 68, 68, 0.18);
		color: #b91c1c;
	}

	:global([data-theme='dark']) .badge-danger {
		color: #f87171;
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
