import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CachedForecast, Location } from '../../types';
import {
	CACHE_BUDGET_BYTES,
	FRESH_MS,
	MAX_CACHED_CITIES,
	RUNTIME_CACHE_CAP,
	STALE_MS
} from '../limits';
import { STORAGE_KEY, cacheKey, createForecastCache, statusOf } from '../forecastCache';

const LOCATION: Location = {
	id: '55.7520,37.6178',
	name: 'Москва',
	country: 'Россия',
	countryCode: 'RU',
	latitude: 55.75204,
	longitude: 37.61781,
	timezone: 'Europe/Moscow'
};

function makeEntry(fetchedAt: number): CachedForecast {
	return {
		fetchedAt,
		location: LOCATION,
		payload: {
			current: {
				time: '2026-08-20T12:00',
				temperature: 18,
				apparentTemperature: 17,
				weatherCode: 2,
				humidity: 60,
				pressureHpa: 1013,
				windSpeed: 4,
				windDirection: 180,
				windGusts: 6,
				precipitation: 0
			},
			hourly: [],
			daily: [],
			timezone: 'Europe/Moscow'
		}
	};
}

function makeHugeEntry(fetchedAt: number, hours: number): CachedForecast {
	const base = makeEntry(fetchedAt);
	return {
		...base,
		payload: {
			...base.payload,
			hourly: Array.from({ length: hours }, (_, i) => ({
				time: `2026-08-20T${String(i).padStart(2, '0')}:00`,
				temperature: 18,
				apparentTemperature: 17,
				weatherCode: 2,
				precipitationProbability: 10,
				precipitation: 0,
				windSpeed: 4,
				windDirection: 180
			}))
		}
	};
}

/** In-memory Storage-like fake: no jsdom, works in plain vitest node env. */
function makeMemoryStorage(initial?: Record<string, string>): Storage {
	const data = new Map<string, string>(Object.entries(initial ?? {}));
	return {
		get length() {
			return data.size;
		},
		clear() {
			data.clear();
		},
		getItem(key: string) {
			return data.has(key) ? data.get(key)! : null;
		},
		key(index: number) {
			return Array.from(data.keys())[index] ?? null;
		},
		removeItem(key: string) {
			data.delete(key);
		},
		setItem(key: string, value: string) {
			data.set(key, value);
		}
	};
}

/** Storage that throws QuotaExceededError once the serialized payload exceeds the byte cap. */
function makeQuotaStorage(capBytes: number): Storage {
	let totalBytes = 0;
	const data = new Map<string, string>();
	return {
		get length() {
			return data.size;
		},
		clear() {
			data.clear();
			totalBytes = 0;
		},
		getItem(key: string) {
			return data.has(key) ? data.get(key)! : null;
		},
		key(index: number) {
			return Array.from(data.keys())[index] ?? null;
		},
		removeItem(key: string) {
			const value = data.get(key);
			if (value !== undefined) totalBytes -= value.length;
			data.delete(key);
		},
		setItem(key: string, value: string) {
			const old = data.get(key);
			const delta = value.length - (old === undefined ? 0 : old.length);
			if (totalBytes + delta > capBytes) {
				throw new DOMException('quota exceeded', 'QuotaExceededError');
			}
			data.set(key, value);
			totalBytes += delta;
		}
	};
}

describe('limits', () => {
	it('exposes the exact reviewed bounds', () => {
		expect(MAX_CACHED_CITIES).toBe(8);
		expect(CACHE_BUDGET_BYTES).toBe(1024 * 1024);
		expect(RUNTIME_CACHE_CAP).toBe(32);
		expect(FRESH_MS).toBe(15 * 60 * 1000);
		expect(STALE_MS).toBe(6 * 60 * 60 * 1000);
	});
});

describe('statusOf', () => {
	const now = 1_000_000_000_000;

	it('is fresh below FRESH_MS, including the exact boundary', () => {
		expect(statusOf(makeEntry(now), now)).toBe('fresh');
		expect(statusOf(makeEntry(now - (FRESH_MS - 1)), now)).toBe('fresh');
	});

	it('is stale at FRESH_MS and up to STALE_MS, including the exact boundary', () => {
		expect(statusOf(makeEntry(now - FRESH_MS), now)).toBe('stale');
		expect(statusOf(makeEntry(now - (STALE_MS - 1)), now)).toBe('stale');
	});

	it('is expired at STALE_MS and beyond', () => {
		expect(statusOf(makeEntry(now - STALE_MS), now)).toBe('expired');
		expect(statusOf(makeEntry(now - STALE_MS - 1), now)).toBe('expired');
	});
});

describe('createForecastCache', () => {
	let storage: Storage;
	let cache: ReturnType<typeof createForecastCache>;

	beforeEach(() => {
		storage = makeMemoryStorage();
		cache = createForecastCache(storage);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('composes keys from geoId: "forecast:" + "lat,lon"', () => {
		const moscow = cacheKey(55.75204, 37.61781);
		const us = cacheKey(46.73239, -117.00017);

		cache.set(moscow, makeEntry(1));
		cache.set(us, makeEntry(2));

		const raw = storage.getItem(STORAGE_KEY);
		expect(raw).not.toBeNull();
		expect(Object.keys(JSON.parse(raw!).entries)).toEqual([moscow, us]);
	});

	it('set/get roundtrip hits the runtime layer first', () => {
		const key = cacheKey(55.75204, 37.61781);
		const entry = makeEntry(123);

		cache.set(key, entry);

		const read = cache.get(key);
		expect(read).toEqual(entry);
		expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
	});

	it('persistent hit promotes the entry into the runtime layer', () => {
		const key = cacheKey(55.75204, 37.61781);
		cache.set(key, makeEntry(5));

		const freshCache = createForecastCache(storage);

		expect(freshCache.get(key)).not.toBeNull();
		storage.removeItem(STORAGE_KEY);
		expect(freshCache.get(key)).not.toBeNull();
	});

	it('evicts the oldest-by-fetchedAt entry from persistent storage at MAX_CACHED_CITIES', () => {
		for (let i = 0; i < MAX_CACHED_CITIES + 1; i++) {
			cache.set(cacheKey(i, i), makeEntry(100 + i));
		}

		const freshCache = createForecastCache(storage);
		expect(freshCache.get(cacheKey(0, 0))).toBeNull();
		for (let i = 1; i < MAX_CACHED_CITIES + 1; i++) {
			expect(freshCache.get(cacheKey(i, i))).not.toBeNull();
		}
	});

	it('evicts the least-recently-used entry from the runtime layer at RUNTIME_CACHE_CAP', () => {
		for (let i = 0; i < RUNTIME_CACHE_CAP; i++) {
			cache.set(cacheKey(i, i), makeEntry(i));
		}
		cache.get(cacheKey(0, 0));
		cache.set(cacheKey(RUNTIME_CACHE_CAP, RUNTIME_CACHE_CAP), makeEntry(RUNTIME_CACHE_CAP));

		expect(cache.get(cacheKey(0, 0))).not.toBeNull();
		expect(cache.get(cacheKey(1, 1))).toBeNull();
		expect(cache.get(cacheKey(RUNTIME_CACHE_CAP, RUNTIME_CACHE_CAP))).not.toBeNull();
	});

	it('set on an existing key promotes it in the runtime LRU (update counts as a touch)', () => {
		cache.set(cacheKey(0, 0), makeEntry(0));
		cache.set(cacheKey(1, 1), makeEntry(1));
		cache.set(cacheKey(0, 0), makeEntry(0));

		for (let i = 2; i <= RUNTIME_CACHE_CAP; i++) {
			cache.set(cacheKey(i, i), makeEntry(i));
		}

		expect(cache.get(cacheKey(1, 1))).toBeNull();
		expect(cache.get(cacheKey(0, 0))).not.toBeNull();
	});

	it('degrades gracefully under storage quota: runtime keeps working, warn once, no crash', () => {
		storage = makeQuotaStorage(1);
		cache = createForecastCache(storage);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		for (let i = 0; i < 5; i++) {
			expect(() => cache.set(cacheKey(i, i), makeEntry(i))).not.toThrow();
		}

		expect(cache.get(cacheKey(4, 4))).not.toBeNull();
		expect(cache.get(cacheKey(4, 4))?.location).toEqual(LOCATION);
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('evicts oldest-by-fetchedAt entries under storage quota until the payload fits', () => {
		storage = makeQuotaStorage(1200);
		cache = createForecastCache(storage);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		for (let i = 0; i < 5; i++) {
			cache.set(cacheKey(i, i), makeEntry(i));
		}

		expect(cache.get(cacheKey(4, 4))).not.toBeNull();
		expect(warn).not.toHaveBeenCalled();

		const freshCache = createForecastCache(storage);
		for (const evicted of [0, 1, 2]) {
			expect(freshCache.get(cacheKey(evicted, evicted))).toBeNull();
		}
		for (const kept of [3, 4]) {
			expect(freshCache.get(cacheKey(kept, kept))).not.toBeNull();
		}
	});

	it('budget floor: evicts the oldest entry when the envelope exceeds CACHE_BUDGET_BYTES', () => {
		cache.set(cacheKey(100, 100), makeHugeEntry(100, 4000));
		cache.set(cacheKey(200, 200), makeHugeEntry(200, 4000));

		const freshCache = createForecastCache(storage);
		expect(freshCache.get(cacheKey(100, 100))).toBeNull();
		expect(freshCache.get(cacheKey(200, 200))).not.toBeNull();
	});

	it('returns null and self-heals on corrupt JSON', () => {
		storage = makeMemoryStorage({ [STORAGE_KEY]: '{not json' });
		cache = createForecastCache(storage);

		expect(cache.get(cacheKey(55.75204, 37.61781))).toBeNull();
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('discards envelopes with a schema version mismatch', () => {
		const key = cacheKey(55.75204, 37.61781);
		storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ version: 2, entries: { [key]: makeEntry(1) } })
		});
		cache = createForecastCache(storage);

		expect(cache.get(key)).toBeNull();
		expect(storage.getItem(STORAGE_KEY)).toBeNull();

		cache.set(key, makeEntry(2));
		expect(cache.get(key)).not.toBeNull();
	});

	it('remove deletes from both layers', () => {
		const key = cacheKey(55.75204, 37.61781);
		cache.set(key, makeEntry(1));
		expect(cache.get(key)).not.toBeNull();

		cache.remove(key);

		expect(cache.get(key)).toBeNull();
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('clear empties both layers', () => {
		cache.set(cacheKey(1, 1), makeEntry(1));
		cache.set(cacheKey(2, 2), makeEntry(2));

		cache.clear();

		expect(cache.get(cacheKey(1, 1))).toBeNull();
		expect(cache.get(cacheKey(2, 2))).toBeNull();
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});
});