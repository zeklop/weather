import { describe, it, expect } from 'vitest';
import { buildForecastUrl } from '../routes/cron';

describe('buildForecastUrl', () => {
	it('pins all units explicitly — evaluator thresholds assume m/s, °C, mm', () => {
		const url = buildForecastUrl({ latitude: 55.75, longitude: 37.62, city_name: 'Moscow' });
		expect(url).toContain('wind_speed_unit=ms');
		expect(url).toContain('temperature_unit=celsius');
		expect(url).toContain('precipitation_unit=mm');
	});

	it('requests exactly the hourly fields the evaluator reads', () => {
		const url = buildForecastUrl({ latitude: 1.5, longitude: -2.5, city_name: 'X' });
		expect(url).toContain(
			'hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m'
		);
		expect(url).toContain('latitude=1.5');
		expect(url).toContain('longitude=-2.5');
	});
});
