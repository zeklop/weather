import { describe, it, expect } from 'vitest';
import { evaluateWeatherConditions, type OpenMeteoForecastResponse } from '../alerts/evaluator';

describe('Weather Alert Evaluator', () => {
	it('detects upcoming rain when dry currently but precipitation is in next hour', () => {
		const mockForecast: OpenMeteoForecastResponse = {
			latitude: 55.75,
			longitude: 37.61,
			timezone: 'Europe/Moscow',
			hourly: {
				time: ['2026-08-21T12:00', '2026-08-21T13:00', '2026-08-21T14:00'],
				temperature_2m: [18, 17, 16],
				precipitation_probability: [10, 80, 90],
				precipitation: [0, 1.2, 2.5],
				weather_code: [1, 61, 63],
				wind_speed_10m: [3, 4, 5],
				wind_gusts_10m: [6, 8, 10]
			}
		};

		const ruAlerts = evaluateWeatherConditions(mockForecast, 'ru', 0);
		expect(ruAlerts).toHaveLength(1);
		expect(ruAlerts[0].type).toBe('precipitation');
		expect(ruAlerts[0].title).toBe('Ожидается дождь');

		const enAlerts = evaluateWeatherConditions(mockForecast, 'en', 0);
		expect(enAlerts[0].title).toBe('Rain expected soon');
	});

	it('detects severe thunderstorm and gale wind', () => {
		const mockForecast: OpenMeteoForecastResponse = {
			latitude: 43.6,
			longitude: 39.7,
			timezone: 'Europe/Moscow',
			hourly: {
				time: ['2026-08-21T12:00', '2026-08-21T13:00', '2026-08-21T14:00'],
				temperature_2m: [22, 20, 19],
				precipitation_probability: [20, 90, 80],
				precipitation: [0, 8.0, 5.0],
				weather_code: [2, 95, 95], // 95 = Thunderstorm
				wind_speed_10m: [5, 12, 14],
				wind_gusts_10m: [8, 22, 25] // Gale gusts > 17 m/s
			}
		};

		const alerts = evaluateWeatherConditions(mockForecast, 'en', 0);
		expect(alerts.some((a) => a.type === 'thunderstorm' && a.severity === 'severe')).toBe(true);
	});

	it('detects freeze transition below 0°C', () => {
		const mockForecast: OpenMeteoForecastResponse = {
			latitude: 56.8,
			longitude: 60.6,
			timezone: 'Asia/Yekaterinburg',
			hourly: {
				time: ['2026-08-21T12:00', '2026-08-21T13:00', '2026-08-21T14:00'],
				temperature_2m: [2.5, -1.0, -3.0],
				precipitation_probability: [0, 0, 0],
				precipitation: [0, 0, 0],
				weather_code: [1, 1, 1],
				wind_speed_10m: [2, 2, 2],
				wind_gusts_10m: [4, 4, 4]
			}
		};

		const alerts = evaluateWeatherConditions(mockForecast, 'ru', 0);
		expect(alerts.some((a) => a.type === 'frost')).toBe(true);
	});

	it('severe wind alert carries raw gust value and hour label for unit rendering', () => {
		const mockForecast: OpenMeteoForecastResponse = {
			latitude: 56.8,
			longitude: 60.6,
			timezone: 'Asia/Yekaterinburg',
			hourly: {
				time: ['2026-08-21T12:00', '2026-08-21T13:00', '2026-08-21T14:00'],
				temperature_2m: [22, 20, 19],
				precipitation_probability: [10, 10, 10],
				precipitation: [0, 0, 0],
				weather_code: [1, 1, 1],
				wind_speed_10m: [8, 14, 14],
				wind_gusts_10m: [9, 18.6, 20]
			}
		};

		const alerts = evaluateWeatherConditions(mockForecast, 'en', 0);
		const wind = alerts.find((a) => a.type === 'severe_wind');
		expect(wind).toBeDefined();
		expect(wind?.gustMs).toBe(18.6);
		expect(wind?.hourLabel).toBe('13:00');
		expect(wind?.message).toContain('19 m/s');
	});
});
