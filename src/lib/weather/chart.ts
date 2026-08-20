import type { HourForecast } from '$lib/types';
import { formatHour } from './format';

export interface ChartPadding {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export interface ChartPoint {
	index: number;
	x: number;
	yProb: number;
	yMm: number;
	barHeight: number;
	prob: number;
	mm: number;
	hour: HourForecast;
}

export interface ChartData {
	points: ChartPoint[];
	maxMm: number;
	hasPrecipitation: boolean;
	linePath: string;
	areaPath: string;
	padding: ChartPadding;
	width: number;
	height: number;
	plotWidth: number;
	plotHeight: number;
	bottomY: number;
}

export interface ChartOptions {
	width?: number;
	height?: number;
	padding?: Partial<ChartPadding>;
}

const DEFAULT_PADDING: ChartPadding = {
	top: 16,
	right: 16,
	bottom: 28,
	left: 36
};

/**
 * Checks if the given list of hours contains meaningful precipitation (probability > 0 or mm > 0).
 */
export function hasMeaningfulPrecipitation(hours: HourForecast[]): boolean {
	if (!hours || hours.length === 0) return false;
	return hours.some(
		(h) => (h.precipitationProbability != null && h.precipitationProbability > 0) || h.precipitation > 0
	);
}

/**
 * Builds coordinate points, scales, and SVG path strings for the precipitation curve chart.
 */
export function buildChartData(hours: HourForecast[], options: ChartOptions = {}): ChartData {
	const width = options.width ?? 360;
	const height = options.height ?? 160;
	const padding: ChartPadding = {
		...DEFAULT_PADDING,
		...options.padding
	};

	const plotWidth = Math.max(10, width - padding.left - padding.right);
	const plotHeight = Math.max(10, height - padding.top - padding.bottom);
	const bottomY = height - padding.bottom;
	const topY = padding.top;

	if (!hours || hours.length === 0) {
		return {
			points: [],
			maxMm: 0,
			hasPrecipitation: false,
			linePath: '',
			areaPath: '',
			padding,
			width,
			height,
			plotWidth,
			plotHeight,
			bottomY
		};
	}

	const maxMmRaw = Math.max(0, ...hours.map((h) => h.precipitation ?? 0));
	const maxMm = Math.max(1, Math.ceil(maxMmRaw * 10) / 10);
	const hasPrecip = hasMeaningfulPrecipitation(hours);

	const stepX = hours.length > 1 ? plotWidth / (hours.length - 1) : 0;

	const points: ChartPoint[] = hours.map((hour, index) => {
		const x = padding.left + index * stepX;
		const prob = Math.max(0, Math.min(100, hour.precipitationProbability ?? 0));
		const mm = Math.max(0, hour.precipitation ?? 0);

		// Probability: 0% at bottomY, 100% at topY
		const yProb = bottomY - (prob / 100) * plotHeight;

		// MM bar scaling
		const barHeight = maxMm > 0 ? (mm / maxMm) * (plotHeight * 0.75) : 0;
		const yMm = bottomY - barHeight;

		return {
			index,
			x,
			yProb,
			yMm,
			barHeight,
			prob,
			mm,
			hour
		};
	});

	const curvePoints = points.map((p) => ({ x: p.x, y: p.yProb }));
	const linePath = generateSmoothCurvePath(curvePoints);
	const areaPath = generateAreaPath(curvePoints, bottomY);

	return {
		points,
		maxMm,
		hasPrecipitation: hasPrecip,
		linePath,
		areaPath,
		padding,
		width,
		height,
		plotWidth,
		plotHeight,
		bottomY
	};
}

function fmt(n: number): string {
	return Number(n.toFixed(1)).toString();
}

/**
 * Generates a smooth cubic bezier SVG path string through points.
 * Uses Monotone Cubic Spline (Fritsch-Carlson) interpolation to prevent overshoot.
 */
export function generateSmoothCurvePath(points: { x: number; y: number }[]): string {
	const n = points.length;
	if (n === 0) return '';
	const first = points[0]!;
	if (n === 1) return `M ${fmt(first.x)} ${fmt(first.y)}`;
	if (n === 2) {
		const second = points[1]!;
		return `M ${fmt(first.x)} ${fmt(first.y)} L ${fmt(second.x)} ${fmt(second.y)}`;
	}

	// Calculate slopes (secants)
	const dx: number[] = [];
	const dy: number[] = [];
	const m: number[] = [];

	for (let i = 0; i < n - 1; i++) {
		const p1 = points[i]!;
		const p2 = points[i + 1]!;
		const deltaX = p2.x - p1.x;
		const deltaY = p2.y - p1.y;
		dx.push(deltaX);
		dy.push(deltaY);
		m.push(deltaX === 0 ? 0 : deltaY / deltaX);
	}

	// Tangents at each point
	const tangents: number[] = [m[0]!];
	for (let i = 1; i < n - 1; i++) {
		const mPrev = m[i - 1]!;
		const mNext = m[i]!;
		if (mPrev * mNext <= 0) {
			tangents.push(0);
		} else {
			const dxPrev = dx[i - 1]!;
			const dxNext = dx[i]!;
			const common = dxPrev + dxNext;
			tangents.push(common === 0 ? 0 : (3 * common) / ((common + dxNext) / mPrev + (common + dxPrev) / mNext));
		}
	}
	tangents.push(m[n - 2]!);

	// Build bezier curves
	let path = `M ${fmt(first.x)} ${fmt(first.y)}`;
	for (let i = 0; i < n - 1; i++) {
		const p1 = points[i]!;
		const p2 = points[i + 1]!;
		const deltaX = dx[i]!;
		const t1 = tangents[i]!;
		const t2 = tangents[i + 1]!;

		const cp1x = p1.x + deltaX / 3;
		const cp1y = p1.y + (t1 * deltaX) / 3;
		const cp2x = p2.x - deltaX / 3;
		const cp2y = p2.y - (t2 * deltaX) / 3;

		path += ` C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(p2.x)} ${fmt(p2.y)}`;
	}

	return path;
}

/**
 * Creates a closed SVG area path for gradient fills under the smooth curve down to the baseline.
 */
export function generateAreaPath(points: { x: number; y: number }[], baselineY: number): string {
	if (points.length === 0) return '';
	const first = points[0]!;
	const last = points[points.length - 1]!;
	const curve = generateSmoothCurvePath(points);

	// Start at bottom-left, line to first point, follow curve, line down to bottom-right, close
	return `M ${fmt(first.x)} ${fmt(baselineY)} L ${fmt(first.x)} ${fmt(first.y)} ` +
		curve.slice(curve.indexOf(' ') + 1) +
		` L ${fmt(last.x)} ${fmt(baselineY)} Z`;
}

/**
 * Finds the index of the point closest to the given X coordinate.
 */
export function findNearestIndex(targetX: number, points: { x: number }[]): number {
	if (!points || points.length === 0) return 0;
	let closestIndex = 0;
	let minDistance = Infinity;

	for (let i = 0; i < points.length; i++) {
		const p = points[i]!;
		const dist = Math.abs(p.x - targetX);
		if (dist < minDistance) {
			minDistance = dist;
			closestIndex = i;
		}
	}

	return closestIndex;
}

export interface ChartTick {
	index: number;
	label: string;
	time: string;
}

/**
 * Returns hour tick marks for the X-axis (e.g. every 4 hours: 00:00, 04:00, 08:00...).
 */
export function getChartTicks(hours: HourForecast[], interval = 4): ChartTick[] {
	const ticks: ChartTick[] = [];
	for (let i = 0; i < hours.length; i += interval) {
		const h = hours[i]!;
		ticks.push({
			index: i,
			label: formatHour(h.time),
			time: h.time
		});
	}
	return ticks;
}
