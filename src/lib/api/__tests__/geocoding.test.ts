import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForecastApiError } from '../openMeteo';
import { geoId, normalizeGeoResults, searchLocations } from '../geocoding';
import type { Location } from '../../types';

const MOSCOW_RAW = {
	id: 524901,
	name: 'Москва',
	latitude: 55.75204,
	longitude: 37.61781,
	country_code: 'RU',
	admin1: 'Москва',
	country: 'Россия',
	timezone: 'Europe/Moscow'
};

const MOSCOW_ID: Location = {
	id: '55.7520,37.6178',
	name: 'Москва',
	admin1: 'Москва',
	country: 'Россия',
	countryCode: 'RU',
	latitude: 55.75204,
	longitude: 37.61781,
	timezone: 'Europe/Moscow'
};

const MOSCOW_US_RAW = {
	id: 5601538,
	name: 'Москва',
	latitude: 46.73239,
	longitude: -117.00017,
	country_code: 'US',
	admin1: 'Айдахо',
	country: 'США',
	timezone: 'America/Los_Angeles'
};

const MOSCOW_US_ID: Location = {
	id: '46.7324,-117.0002',
	name: 'Москва',
	admin1: 'Айдахо',
	country: 'США',
	countryCode: 'US',
	latitude: 46.73239,
	longitude: -117.00017,
	timezone: 'America/Los_Angeles'
};

const RAW_WITH_RESULTS = { results: [MOSCOW_RAW, MOSCOW_US_RAW] };

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('geoId', () => {
	it('produces the rounded-coords id used by the forecast cache key convention', () => {
		expect(geoId(55.75204, 37.61781)).toBe('55.7520,37.6178');
		expect(geoId(46.73239, -117.00017)).toBe('46.7324,-117.0002');
	});
});

describe('normalizeGeoResults', () => {
	it('maps a full fixture to Locations with geoId ids', () => {
		expect(normalizeGeoResults(RAW_WITH_RESULTS)).toEqual([MOSCOW_ID, MOSCOW_US_ID]);
		expect(MOSCOW_ID.id).toBe(geoId(MOSCOW_ID.latitude, MOSCOW_ID.longitude));
	});

	it('skips entries missing required fields (timezone, name, coords, non-object)', () => {
		const { timezone: _timezone, ...noTimezone } = MOSCOW_RAW;
		const { name: _name, ...noName } = MOSCOW_RAW;

		const noCoords = { ...MOSCOW_RAW, latitude: undefined };

		expect(normalizeGeoResults({ results: [noTimezone, noName, noCoords, null, 42] })).toEqual([]);
	});

	it('returns [] when the results key is absent (API omits it on no match)', () => {
		expect(normalizeGeoResults({ generationtime_ms: 0.12 })).toEqual([]);
		expect(normalizeGeoResults({})).toEqual([]);
	});

	it('throws malformed when results is present but not an array', () => {
		for (const results of ['nope', {}, 42, null]) {
			expect(() => normalizeGeoResults({ results })).toThrow(/malformed geocoding response/);
		}
	});

	it('throws malformed when the root is not an object', () => {
		for (const root of [null, undefined, [MOSCOW_RAW], 'str', 42]) {
			expect(() => normalizeGeoResults(root)).toThrow(/malformed geocoding response/);
		}
	});

	it('deduplicates results with the same name, admin1, country, and coords rounded to 2 decimals while preserving order', () => {
		const KAZAN_1 = {
			name: 'Казань',
			latitude: 58.1234,
			longitude: 49.5678,
			admin1: 'Кировская область',
			country: 'Россия',
			timezone: 'Europe/Kirov'
		};
		const KAZAN_2_DUPLICATE = {
			name: 'Казань',
			latitude: 58.1249,
			longitude: 49.5681,
			admin1: 'Кировская область',
			country: 'Россия',
			timezone: 'Europe/Kirov'
		};
		const KAZAN_3_DUPLICATE_2 = {
			name: 'Казань',
			latitude: 58.1201,
			longitude: 49.5702,
			admin1: 'Кировская область',
			country: 'Россия',
			timezone: 'Europe/Kirov'
		};
		const KAZAN_4_TATARSTAN = {
			name: 'Казань',
			latitude: 55.7887,
			longitude: 49.1221,
			admin1: 'Татарстан',
			country: 'Россия',
			timezone: 'Europe/Moscow'
		};
		const NO_ADMIN_1 = {
			name: 'Остров',
			latitude: 10.001,
			longitude: 20.002,
			timezone: 'UTC'
		};
		const NO_ADMIN_2_DUPLICATE = {
			name: 'Остров',
			latitude: 10.004,
			longitude: 20.003,
			timezone: 'UTC'
		};

		const result = normalizeGeoResults({
			results: [
				KAZAN_1,
				KAZAN_2_DUPLICATE,
				KAZAN_3_DUPLICATE_2,
				KAZAN_4_TATARSTAN,
				NO_ADMIN_1,
				NO_ADMIN_2_DUPLICATE
			]
		});

		expect(result).toHaveLength(3);
		expect(result[0].admin1).toBe('Кировская область');
		expect(result[0].id).toBe(geoId(KAZAN_1.latitude, KAZAN_1.longitude));
		expect(result[1].admin1).toBe('Татарстан');
		expect(result[2].name).toBe('Остров');
	});
});

describe('searchLocations', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('fetches the search URL with default language en and returns normalized locations', async () => {
		const fetchMock = vi.fn(async (_url: string) => jsonResponse(RAW_WITH_RESULTS));
		vi.stubGlobal('fetch', fetchMock);

		const locations = await searchLocations('Moscow');

		expect(locations).toEqual([MOSCOW_ID, MOSCOW_US_ID]);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const url = new URL(fetchMock.mock.calls[0][0] as string);
		expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
		expect(url.searchParams.get('name')).toBe('Moscow');
		expect(url.searchParams.get('count')).toBe('8');
		expect(url.searchParams.get('language')).toBe('en');
		expect(url.searchParams.get('format')).toBe('json');
	});

	it('supports passing a custom language param like ru', async () => {
		const fetchMock = vi.fn(async (_url: string) => jsonResponse(RAW_WITH_RESULTS));
		vi.stubGlobal('fetch', fetchMock);

		await searchLocations('Москва', 5, 'ru');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const url = new URL(fetchMock.mock.calls[0][0] as string);
		expect(url.searchParams.get('name')).toBe('Москва');
		expect(url.searchParams.get('count')).toBe('5');
		expect(url.searchParams.get('language')).toBe('ru');
	});

	it('respects the limit argument via count', async () => {
		const fetchMock = vi.fn(async (_url: string) => jsonResponse(RAW_WITH_RESULTS));
		vi.stubGlobal('fetch', fetchMock);

		await searchLocations('Москва', 3);

		const url = new URL(fetchMock.mock.calls[0][0] as string);
		expect(url.searchParams.get('count')).toBe('3');
	});

	it('returns [] without a fetch call for an empty or whitespace query', async () => {
		const fetchMock = vi.fn(async (_url: string) => jsonResponse(RAW_WITH_RESULTS));
		vi.stubGlobal('fetch', fetchMock);

		await expect(searchLocations('')).resolves.toEqual([]);
		await expect(searchLocations('   ')).resolves.toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('returns [] when the API has no matches (results key absent)', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ generationtime_ms: 0.1 })));

		await expect(searchLocations('zzzqqq')).resolves.toEqual([]);
	});

	it('throws ForecastApiError kind http on non-2xx response', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: true }, 500)));

		await expect(searchLocations('Москва')).rejects.toBeInstanceOf(ForecastApiError);
		await expect(searchLocations('Москва')).rejects.toMatchObject({ kind: 'http', status: 500 });
	});

	it('throws ForecastApiError kind network on fetch rejection', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));

		await expect(searchLocations('Москва')).rejects.toMatchObject({ kind: 'network' });
	});

	it('throws ForecastApiError kind malformed on invalid JSON', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response('not json', {
						status: 200,
						headers: { 'content-type': 'application/json' }
					})
			)
		);

		await expect(searchLocations('Москва')).rejects.toMatchObject({ kind: 'malformed' });
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

		const promise = searchLocations('Москва');
		const caught = promise.then(
			() => null,
			(e: unknown) => e
		);
		await vi.advanceTimersByTimeAsync(8001);
		expect(await caught).toMatchObject({ kind: 'timeout' });
	});
});
