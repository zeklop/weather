import { describe, it, expect } from 'vitest';
import { alertForSubscriber, buildForecastUrl } from '../routes/cron';
import type { WeatherAlertMessage } from '../types';

const windAlert: WeatherAlertMessage = {
	id: 'severe_wind',
	type: 'severe_wind',
	severity: 'warning',
	title: 'Gale wind warning',
	message: 'Wind gusts up to 22 m/s around 15:00',
	icon: 'wind',
	gustMs: 22.4,
	hourLabel: '15:00'
};

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

describe('alertForSubscriber', () => {
	it('renders mph for mph subscribers and keeps the hour label', () => {
		const alert = alertForSubscriber(windAlert, 'en', 'mph');
		expect(alert.message).toBe('Wind gusts up to 50 mph around 15:00');
	});

	it('renders localized mph in Russian', () => {
		const alert = alertForSubscriber(windAlert, 'ru', 'mph');
		expect(alert.message).toBe('Порывы ветра до 50 миль/ч около 15:00');
	});

	it('passes the default m/s message through untouched', () => {
		const alert = alertForSubscriber(windAlert, 'en', 'ms');
		expect(alert.message).toBe(windAlert.message);
	});

	it('passes through alerts without raw gust values', () => {
		const rain: WeatherAlertMessage = { ...windAlert, id: 'precip_rain', type: 'precipitation', gustMs: undefined };
		expect(alertForSubscriber(rain, 'en', 'mph')).toBe(rain);
		expect(alertForSubscriber(rain, 'ru', 'unknown_unit')).toBe(rain);
	});
});
