import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForecastApiError, getForecast, normalizeForecast } from '../openMeteo';
import type { Location } from '../../types';

const MOSCOW: Location = {
	id: 'moscow',
	name: 'Moscow',
	admin1: 'Moscow',
	country: 'Russia',
	countryCode: 'RU',
	latitude: 55.7558,
	longitude: 37.6173,
	timezone: 'Europe/Moscow'
};

const RAW = {
	latitude: 55.7558,
	longitude: 37.6173,
	generationtime_ms: 1,
	utc_offset_seconds: 10800,
	timezone: 'Europe/Moscow',
	timezone_abbreviation: 'MSK',
	elevation: 156,
	current: {
		time: '2026-08-20T12:00',
		temperature_2m: 24.3,
		apparent_temperature: 25.1,
		relative_humidity_2m: 52,
		precipitation: 0,
		weather_code: 2,
		pressure_msl: 1007.2,
		wind_speed_10m: 4.2,
		wind_direction_10m: 220,
		wind_gusts_10m: 8.1
	},
	hourly: {
		time: ['2026-08-20T12:00', '2026-08-20T13:00', '2026-08-20T14:00'],
		temperature_2m: [24.3, 24.6, 24.1],
		apparent_temperature: [25.1, 25.5, 24.9],
		precipitation_probability: [30, null, 20],
		precipitation: [0, 0.1, 0],
		weather_code: [2, 3, 3],
		cloud_cover: [40, 80, 90],
		visibility: [24140, 24140, 24140],
		pressure_msl: [1007.2, 1006.9, 1006.4],
		relative_humidity_2m: [52, 54, 56],
		wind_speed_10m: [4.2, 5.1, 6.3],
		wind_direction_10m: [220, 230, 240],
		wind_gusts_10m: [8.1, 9.4, 11.2]
	},
	daily: {
		time: ['2026-08-20', '2026-08-21'],
		weather_code: [2, 3],
		temperature_2m_max: [25.4, 23.9],
		temperature_2m_min: [14.2, 13.8],
		apparent_temperature_max: [26.1, 24.7],
		apparent_temperature_min: [14.9, 14.3],
		sunrise: ['2026-08-20T05:09', '2026-08-21T05:11'],
		sunset: ['2026-08-20T20:24', '2026-08-21T20:21'],
		uv_index_max: [5.4, null],
		precipitation_sum: [0.1, 2.4],
		precipitation_probability_max: [30, null],
		wind_speed_10m_max: [9.2, 12.1],
		wind_gusts_10m_max: [17.4, 21.3],
		wind_direction_10m_dominant: [240, 250]
	}
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('normalizeForecast', () => {
	it('maps a full fixture to the normalized payload', () => {
		const payload = normalizeForecast(RAW);

		expect(payload.timezone).toBe('Europe/Moscow');
		expect(payload.fetchedAt).toBeUndefined();

		expect(payload.current).toEqual({
			time: '2026-08-20T12:00',
			temperature: 24.3,
			apparentTemperature: 25.1,
			weatherCode: 2,
			humidity: 52,
			pressureHpa: 1007.2,
			windSpeed: 4.2,
			windDirection: 220,
			windGusts: 8.1,
			precipitation: 0
		});

		expect(payload.hourly).toHaveLength(3);
		expect(payload.hourly[0]).toEqual({
			time: '2026-08-20T12:00',
			temperature: 24.3,
			apparentTemperature: 25.1,
			weatherCode: 2,
			precipitationProbability: 30,
			precipitation: 0,
			windSpeed: 4.2,
			windDirection: 220
		});
		expect(payload.hourly[1].temperature).toBe(24.6);
		expect(payload.hourly[2].time).toBe('2026-08-20T14:00');

		expect(payload.daily).toHaveLength(2);
		expect(payload.daily[0]).toEqual({
			date: '2026-08-20',
			weatherCode: 2,
			temperatureMax: 25.4,
			temperatureMin: 14.2,
			apparentMax: 26.1,
			apparentMin: 14.9,
			precipitationProbabilityMax: 30,
			precipitationSum: 0.1,
			windSpeedMax: 9.2,
			windGustMax: 17.4,
			sunrise: '2026-08-20T05:09',
			sunset: '2026-08-20T20:24',
			uvIndexMax: 5.4
		});
		expect(payload.daily[1].date).toBe('2026-08-21');
	});

	it('preserves nulls in nullable probability fields', () => {
		const payload = normalizeForecast(RAW);

		expect(payload.hourly[1].precipitationProbability).toBeNull();
		expect(payload.daily[1].precipitationProbabilityMax).toBeNull();
		expect(payload.daily[1].uvIndexMax).toBeNull();
	});

	it('normalizes empty sunrise/sunset strings (polar latitudes) to null', () => {
		const polar = {
			...RAW,
			daily: {
				...RAW.daily,
				sunrise: ['', '2026-08-21T05:11'],
				sunset: ['', '2026-08-21T20:21']
			}
		};
		const payload = normalizeForecast(polar);

		expect(payload.daily[0].sunrise).toBeNull();
		expect(payload.daily[0].sunset).toBeNull();
		expect(payload.daily[1].sunrise).toBe('2026-08-21T05:11');
	});

	it('normalizes null sunrise/sunset values in polar regions to null', () => {
		const polar = {
			...RAW,
			daily: {
				...RAW.daily,
				sunrise: [null, '2026-08-21T05:11'],
				sunset: [null, '2026-08-21T20:21']
			}
		};
		const payload = normalizeForecast(polar);

		expect(payload.daily[0].sunrise).toBeNull();
		expect(payload.daily[0].sunset).toBeNull();
		expect(payload.daily[1].sunrise).toBe('2026-08-21T05:11');
	});

	it('throws malformed when timezone is missing', () => {
		const { timezone: _timezone, ...noTz } = RAW;
		expect(() => normalizeForecast(noTz)).toThrow(/malformed forecast response/);
	});

	it('throws malformed when a required block or array is missing', () => {
		const noHourly = { ...RAW, hourly: undefined };
		expect(() => normalizeForecast(noHourly)).toThrow(/malformed forecast response/);

		const noDaily = { ...RAW, daily: undefined };
		expect(() => normalizeForecast(noDaily)).toThrow(/malformed forecast response/);

		const noCurrent = { ...RAW, current: undefined };
		expect(() => normalizeForecast(noCurrent)).toThrow(/malformed forecast response/);

		const noDailyArray = { ...RAW, daily: { ...RAW.daily, time: undefined } };
		expect(() => normalizeForecast(noDailyArray)).toThrow(/malformed forecast response/);
	});

	it('throws malformed when zipped arrays have unequal lengths', () => {
		const shortTemp = {
			...RAW,
			hourly: { ...RAW.hourly, temperature_2m: RAW.hourly.temperature_2m.slice(0, 2) }
		};
		expect(() => normalizeForecast(shortTemp)).toThrow(/malformed forecast response/);

		const shortUv = {
			...RAW,
			daily: { ...RAW.daily, uv_index_max: [5.4] }
		};
		expect(() => normalizeForecast(shortUv)).toThrow(/malformed forecast response/);
	});
});

describe('getForecast', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('fetches the forecast URL with the contract params and returns the normalized payload', async () => {
		const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse(RAW));
		vi.stubGlobal('fetch', fetchMock);

		const payload = await getForecast(MOSCOW);

		expect(payload.current.temperature).toBe(24.3);
		expect(payload.timezone).toBe('Europe/Moscow');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const url = new URL(fetchMock.mock.calls[0][0] as string);
		expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
		expect(url.searchParams.get('latitude')).toBe('55.7558');
		expect(url.searchParams.get('longitude')).toBe('37.6173');
		expect(url.searchParams.get('timezone')).toBe('auto');
		expect(url.searchParams.get('forecast_days')).toBe('10');
		expect(url.searchParams.get('wind_speed_unit')).toBe('ms');
		expect(url.searchParams.get('current')).toContain('temperature_2m');
		expect(url.searchParams.get('current')).toContain('wind_gusts_10m');
		expect(url.searchParams.get('current')).toContain('relative_humidity_2m');
		expect(url.searchParams.get('hourly')).toBe(
			'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m'
		);
		for (const field of [
			'cloud_cover',
			'visibility',
			'pressure_msl',
			'relative_humidity_2m',
			'wind_gusts_10m'
		]) {
			expect(url.searchParams.get('hourly')).not.toContain(field);
		}
		expect(url.searchParams.get('daily')).toBe(
			'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max'
		);
		expect(url.searchParams.get('daily')).not.toContain('wind_direction_10m_dominant');
		for (const field of ['rain', 'showers', 'snowfall', 'cloud_cover', 'surface_pressure']) {
			expect(url.searchParams.get('current')).not.toContain(field);
		}
		for (const field of ['rain_sum', 'showers_sum', 'snowfall_sum']) {
			expect(url.searchParams.get('daily')).not.toContain(field);
		}
	});

	it('throws ForecastApiError kind http on non-2xx response', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: true }, 500)));

		await expect(getForecast(MOSCOW)).rejects.toBeInstanceOf(ForecastApiError);
		await expect(getForecast(MOSCOW)).rejects.toMatchObject({ kind: 'http', status: 500 });
	});

	it('throws ForecastApiError kind network on fetch rejection', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));

		await expect(getForecast(MOSCOW)).rejects.toMatchObject({ kind: 'network' });
	});

	it('throws ForecastApiError kind timeout when the request exceeds the deadline', async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			'fetch',
			vi.fn(
				(_url: string, init: { signal: AbortSignal }) =>
					new Promise((_resolve, reject) => {
						init.signal.addEventListener('abort', () =>
							reject(new DOMException('Aborted', 'AbortError'))
						);
					})
			)
		);

		const promise = getForecast(MOSCOW);
		const caught = promise.then(
			() => null,
			(e: unknown) => e
		);
		await vi.advanceTimersByTimeAsync(8001);
		expect(await caught).toMatchObject({ kind: 'timeout' });
	});

	it('classifies an abort during JSON parsing as timeout, not malformed', async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			'fetch',
			vi.fn((_url: string, init: { signal: AbortSignal }) => {
				const json = () => Promise.reject(new DOMException('Aborted', 'AbortError'));
				return new Promise((resolve) => {
					init.signal.addEventListener('abort', () => resolve({ ok: true, json }));
				});
			})
		);

		const promise = getForecast(MOSCOW);
		const caught = promise.then(
			() => null,
			(e: unknown) => e
		);
		await vi.advanceTimersByTimeAsync(8001);
		expect(await caught).toMatchObject({ kind: 'timeout' });
	});
});
