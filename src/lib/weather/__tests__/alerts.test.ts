import { describe, expect, it } from 'vitest';
import type { ForecastPayload } from '../../types';
import {
	evaluateWeatherAlerts,
	type AlertOptions,
	type WeatherAlert
} from '../alerts';

function createMockPayload(overrides: Partial<ForecastPayload> = {}): ForecastPayload {
	const baseTimes = [
		'2026-08-20T14:00',
		'2026-08-20T15:00',
		'2026-08-20T16:00',
		'2026-08-20T17:00',
		'2026-08-20T18:00',
		'2026-08-20T19:00',
		'2026-08-20T20:00'
	];

	return {
		timezone: 'Europe/Moscow',
		current: {
			time: '2026-08-20T14:15',
			temperature: 18,
			apparentTemperature: 18,
			weatherCode: 1, // Mainly clear
			humidity: 50,
			pressureHpa: 1013,
			windSpeed: 4,
			windDirection: 180,
			windGusts: 6,
			precipitation: 0
		},
		hourly: baseTimes.map((time, idx) => ({
			time,
			temperature: 18 - idx * 0.5,
			apparentTemperature: 18 - idx * 0.5,
			weatherCode: 1,
			precipitationProbability: 0,
			precipitation: 0,
			windSpeed: 4,
			windDirection: 180
		})),
		daily: [
			{
				date: '2026-08-20',
				weatherCode: 1,
				temperatureMax: 20,
				temperatureMin: 12,
				apparentMax: 20,
				apparentMin: 12,
				precipitationProbabilityMax: 0,
				precipitationSum: 0,
				windSpeedMax: 5,
				windGustMax: 8,
				sunrise: '2026-08-20T05:15',
				sunset: '2026-08-20T20:30',
				uvIndexMax: 4
			}
		],
		...overrides
	};
}

describe('evaluateWeatherAlerts - Precipitation Trigger', () => {
	it('triggers precipitation alert when dry now and rain prob >= 60% in next 1-2 hours', () => {
		const payload = createMockPayload();
		// In hour 1 (15:00), prob is 70%
		payload.hourly[1]!.precipitationProbability = 70;
		payload.hourly[1]!.weatherCode = 61; // Rain

		const nowMs = Date.UTC(2026, 7, 20, 11, 15); // 14:15 in Moscow
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false
		});

		const precipAlert = alerts.find((a) => a.type === 'precipitation');
		expect(precipAlert).toBeDefined();
		expect(precipAlert?.severity).toBe('warning');
		expect(precipAlert?.title).toBe('Precipitation Alert');
		expect(precipAlert?.message).toContain('Rain');
		expect(precipAlert?.message).toContain('Take an umbrella');
	});

	it('triggers precipitation alert when dry now and precip > 0.2mm in next 1-2 hours', () => {
		const payload = createMockPayload();
		payload.hourly[1]!.precipitation = 1.5;
		payload.hourly[1]!.weatherCode = 61;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'ru',
			nowMs,
			quietHours: false
		});

		const precipAlert = alerts.find((a) => a.type === 'precipitation');
		expect(precipAlert).toBeDefined();
		expect(precipAlert?.title).toBe('Приближение осадков');
		expect(precipAlert?.message).toContain('зонт');
	});

	it('does NOT trigger precipitation alert when already raining now', () => {
		const payload = createMockPayload();
		payload.current.precipitation = 1.0;
		payload.current.weatherCode = 61;
		payload.hourly[1]!.precipitationProbability = 80;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false
		});

		const precipAlert = alerts.find((a) => a.type === 'precipitation');
		expect(precipAlert).toBeUndefined();
	});

	it('does NOT trigger when precipitation is far in future (> 2 hours)', () => {
		const payload = createMockPayload();
		// Hour 4 (18:00) has rain, which is 4 hours away
		payload.hourly[4]!.precipitationProbability = 90;
		payload.hourly[4]!.precipitation = 3.0;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false
		});

		const precipAlert = alerts.find((a) => a.type === 'precipitation');
		expect(precipAlert).toBeUndefined();
	});

	it('does NOT trigger when rain probability is low (< 60%) and precip <= 0.2mm', () => {
		const payload = createMockPayload();
		payload.hourly[1]!.precipitationProbability = 40;
		payload.hourly[1]!.precipitation = 0.1;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false
		});

		const precipAlert = alerts.find((a) => a.type === 'precipitation');
		expect(precipAlert).toBeUndefined();
	});
});

describe('evaluateWeatherAlerts - Severe Weather Trigger', () => {
	it('triggers severe warning on thunderstorm (WMO 95, 96, 99)', () => {
		const payload = createMockPayload();
		payload.hourly[1]!.weatherCode = 95;
		payload.hourly[1]!.windSpeed = 12;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false
		});

		const severeAlert = alerts.find((a) => a.type === 'severe');
		expect(severeAlert).toBeDefined();
		expect(severeAlert?.severity).toBe('severe');
		expect(severeAlert?.critical).toBe(true);
		expect(severeAlert?.title).toBe('Severe Weather Alert');
		expect(severeAlert?.message).toContain('Thunderstorm');
	});

	it('triggers severe warning on heavy snow (WMO 75, 86)', () => {
		const payload = createMockPayload();
		payload.hourly[1]!.weatherCode = 75;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'ru',
			nowMs,
			quietHours: false
		});

		const severeAlert = alerts.find((a) => a.type === 'severe');
		expect(severeAlert).toBeDefined();
		expect(severeAlert?.severity).toBe('severe');
		expect(severeAlert?.title).toBe('Штормовое предупреждение');
	});

	it('triggers severe warning on strong winds (>= 15 m/s or gusts >= 18 m/s)', () => {
		const payload = createMockPayload();
		payload.current.windSpeed = 16;
		payload.current.windGusts = 22;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false
		});

		const severeAlert = alerts.find((a) => a.type === 'severe');
		expect(severeAlert).toBeDefined();
		expect(severeAlert?.severity).toBe('severe');
		expect(severeAlert?.critical).toBe(true);
		expect(severeAlert?.message).toContain('16 m/s');
	});
});

describe('evaluateWeatherAlerts - Freeze & Temperature Drop Trigger', () => {
	it('triggers freeze alert when current temp > 0°C and drops <= 0°C in next hours', () => {
		const payload = createMockPayload();
		payload.current.temperature = 3;
		payload.hourly[0]!.temperature = 3;
		payload.hourly[1]!.temperature = 1;
		payload.hourly[2]!.temperature = -2; // Drops below zero

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false
		});

		const freezeAlert = alerts.find((a) => a.type === 'freeze');
		expect(freezeAlert).toBeDefined();
		expect(freezeAlert?.title).toBe('Freeze Warning');
		expect(freezeAlert?.message).toContain('0°C');
		expect(freezeAlert?.message).toContain('icy roads');
	});

	it('triggers freeze alert with Russian localization', () => {
		const payload = createMockPayload();
		payload.current.temperature = 2;
		payload.hourly[1]!.temperature = -1;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'ru',
			nowMs,
			quietHours: false
		});

		const freezeAlert = alerts.find((a) => a.type === 'freeze');
		expect(freezeAlert).toBeDefined();
		expect(freezeAlert?.title).toBe('Предупреждение о заморозках');
		expect(freezeAlert?.message).toContain('гололедица');
	});

	it('triggers drop alert on temperature drop >= 5°C within 3 hours', () => {
		const payload = createMockPayload();
		payload.current.temperature = 20;
		payload.hourly[0]!.temperature = 20;
		payload.hourly[1]!.temperature = 17;
		payload.hourly[2]!.temperature = 14; // Drop of 6°C in 2 hours

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false
		});

		const freezeAlert = alerts.find((a) => a.type === 'freeze');
		expect(freezeAlert).toBeDefined();
		expect(freezeAlert?.message).toContain('drop by');
	});
});

describe('evaluateWeatherAlerts - Quiet Hours & Filtering', () => {
	it('suppresses non-critical alerts during quiet hours (23:00 to 07:00)', () => {
		const payload = createMockPayload({
			current: {
				time: '2026-08-20T23:30',
				temperature: 15,
				apparentTemperature: 15,
				weatherCode: 1,
				humidity: 50,
				pressureHpa: 1013,
				windSpeed: 4,
				windDirection: 180,
				windGusts: 6,
				precipitation: 0
			},
			hourly: [
				'2026-08-20T23:00',
				'2026-08-21T00:00',
				'2026-08-21T01:00',
				'2026-08-21T02:00'
			].map((time, idx) => ({
				time,
				temperature: 15 - idx,
				apparentTemperature: 15 - idx,
				weatherCode: idx === 1 ? 61 : 1,
				precipitationProbability: idx === 1 ? 80 : 0,
				precipitation: idx === 1 ? 1.0 : 0,
				windSpeed: 4,
				windDirection: 180
			}))
		});

		const nowMs = Date.UTC(2026, 7, 20, 20, 30); // 23:30 in Moscow
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: true
		});

		expect(alerts.find((a) => a.type === 'precipitation')).toBeUndefined();
	});

	it('does NOT suppress critical severe warnings during quiet hours', () => {
		const payload = createMockPayload({
			current: {
				time: '2026-08-20T23:30',
				temperature: 15,
				apparentTemperature: 15,
				weatherCode: 1,
				humidity: 50,
				pressureHpa: 1013,
				windSpeed: 4,
				windDirection: 180,
				windGusts: 6,
				precipitation: 0
			},
			hourly: [
				'2026-08-20T23:00',
				'2026-08-21T00:00',
				'2026-08-21T01:00',
				'2026-08-21T02:00'
			].map((time, idx) => ({
				time,
				temperature: 15 - idx,
				apparentTemperature: 15 - idx,
				weatherCode: idx === 1 ? 95 : 1,
				precipitationProbability: 0,
				precipitation: 0,
				windSpeed: 4,
				windDirection: 180
			}))
		});

		const nowMs = Date.UTC(2026, 7, 20, 20, 30); // 23:30 in Moscow
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: true
		});

		const severeAlert = alerts.find((a) => a.type === 'severe');
		expect(severeAlert).toBeDefined();
		expect(severeAlert?.critical).toBe(true);
	});

	it('filters out alerts that are disabled in enabledTypes option', () => {
		const payload = createMockPayload();
		payload.hourly[1]!.precipitationProbability = 80;
		payload.hourly[1]!.weatherCode = 61;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false,
			enabledTypes: {
				precipitation: false
			}
		});

		expect(alerts.find((a) => a.type === 'precipitation')).toBeUndefined();
	});

	it('filters out alerts within 3-hour rate limit window', () => {
		const payload = createMockPayload();
		payload.hourly[1]!.precipitationProbability = 80;
		payload.hourly[1]!.weatherCode = 61;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const oneHourAgo = nowMs - 60 * 60 * 1000;

		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false,
			lastSentTimestamps: {
				precipitation: oneHourAgo
			}
		});

		expect(alerts.find((a) => a.type === 'precipitation')).toBeUndefined();
	});

	it('allows alert if last sent was > 3 hours ago', () => {
		const payload = createMockPayload();
		payload.hourly[1]!.precipitationProbability = 80;
		payload.hourly[1]!.weatherCode = 61;

		const nowMs = Date.UTC(2026, 7, 20, 11, 15);
		const fourHoursAgo = nowMs - 4 * 60 * 60 * 1000;

		const alerts = evaluateWeatherAlerts(payload, undefined, {
			lang: 'en',
			nowMs,
			quietHours: false,
			lastSentTimestamps: {
				precipitation: fourHoursAgo
			}
		});

		expect(alerts.find((a) => a.type === 'precipitation')).toBeDefined();
	});
});
