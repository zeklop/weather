import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import PrecipitationChart from '../PrecipitationChart.svelte';
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

describe('PrecipitationChart component', () => {
	it('renders empty state message when there is no precipitation data', () => {
		const hours = [
			makeHour({ precipitationProbability: 0, precipitation: 0 }),
			makeHour({ precipitationProbability: 0, precipitation: 0 })
		];

		const result = render(PrecipitationChart, {
			props: { hours, lang: 'ru' }
		});

		expect(result.html).toContain('Без осадков');
	});

	it('renders SVG chart with curve, area, and axis ticks when precipitation is present', () => {
		const hours: HourForecast[] = Array.from({ length: 24 }, (_, i) =>
			makeHour({
				time: `2026-08-20T${String(i).padStart(2, '0')}:00`,
				precipitationProbability: i === 10 ? 80 : 0,
				precipitation: i === 10 ? 2.4 : 0
			})
		);

		const result = render(PrecipitationChart, {
			props: { hours, lang: 'ru' }
		});

		expect(result.html).toContain('<svg');
		expect(result.html).toContain('precip-curve');
		expect(result.html).toContain('precip-area');
		expect(result.html).toContain('100%');
		expect(result.html).toContain('50%');
		expect(result.html).toContain('0%');
	});

	it('renders in English when lang is en', () => {
		const hours = [
			makeHour({ precipitationProbability: 0, precipitation: 0 })
		];

		const result = render(PrecipitationChart, {
			props: { hours, lang: 'en' }
		});

		expect(result.html).toContain('No precipitation expected');
	});
});
