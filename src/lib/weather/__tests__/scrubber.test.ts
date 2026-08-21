import { describe, expect, it } from 'vitest';
import { getWeatherVisual } from '../wmo';
import type { CurrentWeather, HourForecast } from '$lib/types';

function makeCurrent(): CurrentWeather {
	return {
		time: '2026-08-21T12:00',
		temperature: 20,
		apparentTemperature: 21,
		weatherCode: 1,
		humidity: 50,
		pressureHpa: 1013,
		windSpeed: 4,
		windDirection: 180,
		windGusts: 6,
		precipitation: 0
	};
}

function makeHour(time: string, overrides: Partial<HourForecast> = {}): HourForecast {
	return {
		time,
		temperature: 15,
		apparentTemperature: 14,
		weatherCode: 3,
		precipitationProbability: 30,
		precipitation: 0.2,
		windSpeed: 6,
		windDirection: 270,
		...overrides
	};
}

describe('Scrubber logic helpers', () => {
	it('resolves active display values from selected hour if present', () => {
		const current = makeCurrent();
		const hours = [
			makeHour('2026-08-21T12:00', { temperature: 20, weatherCode: 1 }),
			makeHour('2026-08-21T16:00', { temperature: 25, weatherCode: 0, windSpeed: 8 })
		];

		const selectedHourTime = '2026-08-21T16:00';
		const selectedHour = hours.find((h) => h.time === selectedHourTime) ?? null;

		expect(selectedHour).not.toBeNull();
		const activeTemp = selectedHour ? selectedHour.temperature : current.temperature;
		const activeVisual = getWeatherVisual(
			selectedHour ? selectedHour.weatherCode : current.weatherCode,
			'ru'
		);
		const activeWind = selectedHour ? selectedHour.windSpeed : current.windSpeed;

		expect(activeTemp).toBe(25);
		expect(activeVisual.shortLabel).toBe('Ясно');
		expect(activeWind).toBe(8);
	});

	it('falls back to current weather when selected hour is null or not found in dataset', () => {
		const current = makeCurrent();
		const hours = [makeHour('2026-08-21T12:00')];

		const selectedHourTime = '2026-08-21T20:00'; // hour shifted off
		const selectedHour = hours.find((h) => h.time === selectedHourTime) ?? null;

		expect(selectedHour).toBeNull();
		const activeTemp = selectedHour ? (selectedHour as HourForecast).temperature : current.temperature;
		expect(activeTemp).toBe(20);
	});
});
