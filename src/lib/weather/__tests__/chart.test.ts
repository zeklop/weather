import { describe, it, expect } from 'vitest';
import {
	buildChartData,
	generateSmoothCurvePath,
	generateAreaPath,
	findNearestIndex,
	getChartTicks,
	hasMeaningfulPrecipitation
} from '../chart';
import type { HourForecast } from '$lib/types';

function makeHour(overrides: Partial<HourForecast> = {}): HourForecast {
	return {
		time: '2026-08-20T12:00',
		temperature: 20,
		apparentTemperature: 20,
		weatherCode: 0,
		precipitationProbability: 0,
		precipitation: 0,
		windSpeed: 3,
		windDirection: 180,
		...overrides
	};
}

describe('chart utilities', () => {
	describe('hasMeaningfulPrecipitation', () => {
		it('returns false for empty list', () => {
			expect(hasMeaningfulPrecipitation([])).toBe(false);
		});

		it('returns false when all probabilities and amounts are 0 or null', () => {
			const hours = [
				makeHour({ precipitationProbability: 0, precipitation: 0 }),
				makeHour({ precipitationProbability: null, precipitation: 0 })
			];
			expect(hasMeaningfulPrecipitation(hours)).toBe(false);
		});

		it('returns true when any probability is > 0', () => {
			const hours = [
				makeHour({ precipitationProbability: 0, precipitation: 0 }),
				makeHour({ precipitationProbability: 15, precipitation: 0 })
			];
			expect(hasMeaningfulPrecipitation(hours)).toBe(true);
		});

		it('returns true when any precipitation volume is > 0', () => {
			const hours = [
				makeHour({ precipitationProbability: 0, precipitation: 0 }),
				makeHour({ precipitationProbability: 0, precipitation: 0.2 })
			];
			expect(hasMeaningfulPrecipitation(hours)).toBe(true);
		});
	});

	describe('buildChartData', () => {
		it('handles empty input gracefully', () => {
			const data = buildChartData([], { width: 360, height: 160 });
			expect(data.points).toEqual([]);
			expect(data.maxMm).toBe(0);
			expect(data.hasPrecipitation).toBe(false);
			expect(data.linePath).toBe('');
			expect(data.areaPath).toBe('');
		});

		it('calculates evenly spaced X coordinates and normalized Y coordinates for 24 hours', () => {
			const hours: HourForecast[] = Array.from({ length: 24 }, (_, i) =>
				makeHour({
					time: `2026-08-20T${String(i).padStart(2, '0')}:00`,
					precipitationProbability: i === 12 ? 100 : i === 6 ? 50 : 0,
					precipitation: i === 12 ? 2.5 : 0
				})
			);

			const width = 360;
			const height = 160;
			const padding = { top: 20, right: 16, bottom: 30, left: 32 };
			const data = buildChartData(hours, { width, height, padding });

			expect(data.points.length).toBe(24);
			expect(data.hasPrecipitation).toBe(true);
			expect(data.maxMm).toBe(2.5);

			// First point x is padding.left, last point x is width - padding.right
			expect(data.points[0]?.x).toBe(padding.left);
			expect(data.points[23]?.x).toBe(width - padding.right);

			// Y probability: 0% -> bottom, 100% -> top
			const plotHeight = height - padding.top - padding.bottom;
			const bottomY = height - padding.bottom;
			const topY = padding.top;

			expect(data.points[0]?.yProb).toBe(bottomY); // 0% prob
			expect(data.points[6]?.yProb).toBeCloseTo(padding.top + plotHeight * 0.5); // 50% prob
			expect(data.points[12]?.yProb).toBe(topY); // 100% prob

			expect(data.linePath).toContain('M');
			expect(data.areaPath).toContain('M');
			expect(data.areaPath).toContain('Z');
		});

		it('scales precipitation volume (mm) bars properly', () => {
			const hours = [
				makeHour({ precipitation: 1 }),
				makeHour({ precipitation: 4 }),
				makeHour({ precipitation: 2 })
			];
			const data = buildChartData(hours, { width: 300, height: 100 });
			expect(data.maxMm).toBe(4);
			// Point with max mm should have highest volume height
			const h0 = data.points[0]?.barHeight ?? 0;
			const h1 = data.points[1]?.barHeight ?? 0;
			const h2 = data.points[2]?.barHeight ?? 0;
			expect(h1).toBeGreaterThan(h0);
			expect(h1).toBeGreaterThan(h2);
			expect(h2).toBeGreaterThan(h0);
		});
	});

	describe('generateSmoothCurvePath & generateAreaPath', () => {
		it('produces empty string for 0 or 1 point', () => {
			expect(generateSmoothCurvePath([])).toBe('');
			expect(generateSmoothCurvePath([{ x: 10, y: 20 }])).toBe('M 10 20');
			expect(generateAreaPath([], 100)).toBe('');
		});

		it('produces valid SVG path with bezier commands for multiple points', () => {
			const points = [
				{ x: 0, y: 100 },
				{ x: 50, y: 20 },
				{ x: 100, y: 60 },
				{ x: 150, y: 100 }
			];
			const curve = generateSmoothCurvePath(points);
			expect(curve.startsWith('M 0 100')).toBe(true);
			expect(curve).toContain('C');

			const area = generateAreaPath(points, 120);
			expect(area.startsWith('M 0 120 L 0 100')).toBe(true);
			expect(area.endsWith('L 150 120 Z')).toBe(true);
		});
	});

	describe('findNearestIndex', () => {
		it('returns 0 for empty array', () => {
			expect(findNearestIndex(50, [])).toBe(0);
		});

		it('finds index of nearest point', () => {
			const points = [{ x: 10 }, { x: 40 }, { x: 80 }, { x: 120 }];
			expect(findNearestIndex(5, points)).toBe(0);
			expect(findNearestIndex(35, points)).toBe(1);
			expect(findNearestIndex(75, points)).toBe(2);
			expect(findNearestIndex(110, points)).toBe(3);
			expect(findNearestIndex(200, points)).toBe(3);
		});
	});

	describe('getChartTicks', () => {
		it('generates ticks every 4 hours by default', () => {
			const hours = Array.from({ length: 24 }, (_, i) =>
				makeHour({ time: `2026-08-20T${String(i).padStart(2, '0')}:00` })
			);
			const ticks = getChartTicks(hours, 4);
			expect(ticks.length).toBe(6); // 0, 4, 8, 12, 16, 20
			expect(ticks[0]?.label).toBe('00:00');
			expect(ticks[1]?.label).toBe('04:00');
			expect(ticks[5]?.label).toBe('20:00');
		});
	});
});
