<script lang="ts">
	import type { HourForecast } from '$lib/types';
	import { getSettingsStore } from '$lib/stores/settings.svelte';
	import { t } from '$lib/i18n';
	import { formatHour } from '$lib/weather/format';
	import { formatPrecipMm } from '$lib/weather/units';
	import {
		buildChartData,
		findNearestIndex,
		getChartTicks,
		hasMeaningfulPrecipitation,
		type ChartPoint
	} from '$lib/weather/chart';

	interface Props {
		hours: HourForecast[];
		lang?: 'ru' | 'en';
	}

	let { hours = [], lang: propLang }: Props = $props();

	const settings = getSettingsStore();
	const lang = $derived(propLang ?? settings.language);

	const width = 360;
	const height = 165;
	const padding = { top: 22, right: 16, bottom: 28, left: 34 };

	const chartData = $derived(buildChartData(hours, { width, height, padding }));
	const hasPrecip = $derived(hasMeaningfulPrecipitation(hours));
	const ticks = $derived(getChartTicks(hours, 4));

	let selectedIndex = $state<number | null>(null);
	let isHovering = $state(false);

	const activePoint = $derived<ChartPoint | null>(
		selectedIndex != null && chartData.points[selectedIndex]
			? chartData.points[selectedIndex]!
			: null
	);

	function handlePointerMove(e: PointerEvent) {
		const target = e.currentTarget as SVGSVGElement | null;
		if (!target || chartData.points.length === 0) return;

		const rect = target.getBoundingClientRect();
		const clientX = e.clientX - rect.left;
		const scaleX = width / rect.width;
		const svgX = clientX * scaleX;

		selectedIndex = findNearestIndex(svgX, chartData.points);
		isHovering = true;
	}

	function handlePointerLeave() {
		isHovering = false;
		selectedIndex = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (chartData.points.length === 0) return;
		const current = selectedIndex ?? 0;

		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			selectedIndex = Math.max(0, current - 1);
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			selectedIndex = Math.min(chartData.points.length - 1, current + 1);
		} else if (e.key === 'Home') {
			e.preventDefault();
			selectedIndex = 0;
		} else if (e.key === 'End') {
			e.preventDefault();
			selectedIndex = chartData.points.length - 1;
		}
	}
</script>

<div
	class="card chart-card"
	aria-label={t('home.precipitationChartTitle', lang)}
>
	<div class="chart-header">
		<div class="chart-title">
			<svg
				class="title-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
				<path d="M16 14v6" />
				<path d="M8 14v6" />
				<path d="M12 16v6" />
			</svg>
			<span>{t('home.precipitationChartTitle', lang)}</span>
		</div>
		{#if hasPrecip}
			<div class="chart-legend">
				<span class="legend-item prob">
					<span class="legend-dot prob-dot"></span>
					<span>{t('home.precipitationProbability', lang)} (%)</span>
				</span>
				{#if chartData.maxMm > 0}
					<span class="legend-item mm">
						<span class="legend-dot mm-dot"></span>
						<span>{t('home.precipitationVolume', lang)} ({lang === 'ru' ? 'мм' : 'mm'})</span>
					</span>
				{/if}
			</div>
		{/if}
	</div>

	{#if !hasPrecip}
		<div class="chart-empty">
			<div class="empty-text">{t('home.noPrecipitation24h', lang)}</div>
		</div>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="chart-container"
			role="application"
			aria-label={t('home.precipitationChartTitle', lang)}
			tabindex="0"
			onkeydown={handleKeydown}
			onpointermove={handlePointerMove}
			onpointerleave={handlePointerLeave}
			onpointerdown={handlePointerMove}
		>
			{#if activePoint}
				<div
					class="chart-tooltip"
					style="left: {(activePoint.x / width) * 100}%;"
					role="tooltip"
				>
					<span class="tooltip-time">{formatHour(activePoint.hour.time)}</span>
					<span class="tooltip-prob">{activePoint.prob}%</span>
					{#if activePoint.mm > 0}
						<span class="tooltip-mm">{formatPrecipMm(activePoint.mm, lang)}</span>
					{/if}
				</div>
			{/if}

			<svg
				class="chart-svg"
				viewBox="0 0 {width} {height}"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<defs>
					<linearGradient id="precip-curve-grad" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="#3B82F6" stop-opacity="0.38" />
						<stop offset="100%" stop-color="#3B82F6" stop-opacity="0.02" />
					</linearGradient>
					<linearGradient id="precip-bar-grad" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="#60A5FA" stop-opacity="0.6" />
						<stop offset="100%" stop-color="#3B82F6" stop-opacity="0.2" />
					</linearGradient>
				</defs>

				<!-- Y-axis Grid Lines -->
				<!-- 100% -->
				<line
					x1={padding.left}
					y1={padding.top}
					x2={width - padding.right}
					y2={padding.top}
					class="grid-line"
				/>
				<text
					x={padding.left - 6}
					y={padding.top + 4}
					class="axis-text y-axis"
					text-anchor="end"
				>100%</text>

				<!-- 50% -->
				<line
					x1={padding.left}
					y1={padding.top + chartData.plotHeight * 0.5}
					x2={width - padding.right}
					y2={padding.top + chartData.plotHeight * 0.5}
					class="grid-line dashed"
				/>
				<text
					x={padding.left - 6}
					y={padding.top + chartData.plotHeight * 0.5 + 4}
					class="axis-text y-axis"
					text-anchor="end"
				>50%</text>

				<!-- 0% -->
				<line
					x1={padding.left}
					y1={chartData.bottomY}
					x2={width - padding.right}
					y2={chartData.bottomY}
					class="grid-line baseline"
				/>
				<text
					x={padding.left - 6}
					y={chartData.bottomY + 4}
					class="axis-text y-axis"
					text-anchor="end"
				>0%</text>

				<!-- Precipitation Volume Bars (mm) -->
				{#each chartData.points as p}
					{#if p.mm > 0}
						<rect
							x={p.x - 3}
							y={p.yMm}
							width="6"
							height={p.barHeight}
							rx="2"
							fill="url(#precip-bar-grad)"
							class="precip-bar"
						/>
					{/if}
				{/each}

				<!-- Smooth Area Under Curve -->
				{#if chartData.areaPath}
					<path
						class="precip-area"
						d={chartData.areaPath}
						fill="url(#precip-curve-grad)"
					/>
				{/if}

				<!-- Smooth Curve Line -->
				{#if chartData.linePath}
					<path
						class="precip-curve"
						d={chartData.linePath}
						fill="none"
						stroke="#3B82F6"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				{/if}

				<!-- X-Axis Ticks -->
				{#each ticks as tick}
					{@const pt = chartData.points[tick.index]}
					{#if pt}
						<line
							x1={pt.x}
							y1={chartData.bottomY}
							x2={pt.x}
							y2={chartData.bottomY + 4}
							class="tick-line"
						/>
						<text
							x={pt.x}
							y={chartData.bottomY + 16}
							class="axis-text x-axis"
							text-anchor="middle"
						>{tick.label}</text>
					{/if}
				{/each}

				<!-- Active Scrubbing Marker -->
				{#if activePoint}
					<line
						x1={activePoint.x}
						y1={padding.top}
						x2={activePoint.x}
						y2={chartData.bottomY}
						class="active-cursor"
					/>
					<circle
						cx={activePoint.x}
						cy={activePoint.yProb}
						r="4.5"
						class="active-point"
					/>
				{/if}
			</svg>
		</div>
	{/if}
</div>

<style>
	.chart-card {
		padding: var(--space-4);
		border-radius: var(--radius-card);
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		touch-action: pan-y;
		user-select: none;
	}

	.chart-container:focus-visible {
		outline: 2px solid var(--accent);
		border-radius: var(--radius-control);
	}

	.chart-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.chart-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.title-icon {
		width: 18px;
		height: 18px;
		color: var(--accent);
	}

	.chart-legend {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		font-size: 11.5px;
		color: var(--text-secondary);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.prob-dot {
		background: #3b82f6;
	}

	.mm-dot {
		background: #93c5fd;
		border-radius: 2px;
	}

	.chart-empty {
		padding: var(--space-4) 0 var(--space-2);
		text-align: center;
	}

	.empty-text {
		color: var(--text-secondary);
		font-size: 14px;
	}

	.chart-container {
		position: relative;
		width: 100%;
		height: 165px;
	}

	.chart-svg {
		width: 100%;
		height: 100%;
		overflow: visible;
		cursor: crosshair;
	}

	.grid-line {
		stroke: var(--divider);
		stroke-width: 1;
		opacity: 0.7;
	}

	.grid-line.dashed {
		stroke-dasharray: 4 4;
		opacity: 0.5;
	}

	.grid-line.baseline {
		stroke: var(--divider);
		stroke-width: 1.2;
		opacity: 1;
	}

	.tick-line {
		stroke: var(--text-secondary);
		stroke-width: 1;
		opacity: 0.6;
	}

	.axis-text {
		fill: var(--text-secondary);
		font-size: 10px;
		font-family: inherit;
	}

	.precip-bar {
		transition: height 0.2s ease;
	}

	.precip-curve {
		transition: stroke 0.15s ease;
	}

	.active-cursor {
		stroke: var(--accent);
		stroke-width: 1.5;
		stroke-dasharray: 3 3;
		opacity: 0.8;
	}

	.active-point {
		fill: #3b82f6;
		stroke: #ffffff;
		stroke-width: 2;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
	}

	:global([data-theme='dark']) .active-point {
		stroke: #1f2937;
	}

	.chart-tooltip {
		position: absolute;
		top: 0;
		transform: translate(-50%, -100%);
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 3px 8px;
		background: rgba(17, 24, 39, 0.88);
		color: #ffffff;
		border-radius: 6px;
		font-size: 11.5px;
		font-weight: 500;
		pointer-events: none;
		white-space: nowrap;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
		z-index: 10;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	:global([data-theme='dark']) .chart-tooltip {
		background: rgba(31, 41, 55, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.tooltip-time {
		opacity: 0.85;
	}

	.tooltip-prob {
		color: #60a5fa;
		font-weight: 600;
	}

	.tooltip-mm {
		color: #93c5fd;
	}
</style>
