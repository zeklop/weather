import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-ignore — svelte/internal/client ships no types (untyped JS module)
import { get, set, state } from 'svelte/internal/client';
import { createForecastCache, cacheKey } from '../../cache/forecastCache';
import { FRESH_MS, STALE_MS } from '../../cache/limits';
import type { ForecastPayload, Location } from '../../types';
import {
	REFRESH_ERROR_MESSAGE,
	createForecastStore,
	getForecastStore
} from '../forecast.svelte';
import { makeMemoryStorage } from './memoryStorage';

vi.mock('../../api/openMeteo', () => ({
	getForecast: vi.fn(() =>
		Promise.resolve({
			current: {
				time: '2026-08-20T12:00',
				temperature: 5,
				apparentTemperature: 5,
				weatherCode: 0,
				humidity: 50,
				pressureHpa: 1013,
				windSpeed: 2,
				windDirection: 90,
				windGusts: 3,
				precipitation: 0
			},
			hourly: [],
			daily: [],
			timezone: 'Europe/Moscow'
		})
	)
}));

const NOW = 1_752_000_000_000;

const MOSCOW: Location = {
	id: '55.7558,37.6173',
	name: 'Москва',
	admin1: 'Москва',
	country: 'Россия',
	countryCode: 'RU',
	latitude: 55.7558,
	longitude: 37.6173,
	timezone: 'Europe/Moscow'
};

const SPB: Location = {
	id: '59.9386,30.3141',
	name: 'Санкт-Петербург',
	admin1: 'Санкт-Петербург',
	country: 'Россия',
	countryCode: 'RU',
	latitude: 59.9386,
	longitude: 30.3141,
	timezone: 'Europe/Moscow'
};

function makePayload(temperature: number): ForecastPayload {
	return {
		current: {
			time: '2026-08-20T12:00',
			temperature,
			apparentTemperature: temperature,
			weatherCode: 0,
			humidity: 50,
			pressureHpa: 1013,
			windSpeed: 2,
			windDirection: 90,
			windGusts: 3,
			precipitation: 0
		},
		hourly: [],
		daily: [],
		timezone: 'Europe/Moscow'
	};
}

function seedCache(storage: Storage, location: Location, payload: ForecastPayload, fetchedAt: number): void {
	createForecastCache(storage).set(cacheKey(location.latitude, location.longitude), {
		fetchedAt,
		location,
		payload
	});
}

function makeSettings() {
	return { touchLastUpdated: vi.fn() };
}

/**
 * Reactive location store fake built on the raw svelte internal runtime,
 * which is the same module instance the store's effect bridge resolves to
 * in the vitest node environment.
 */
function makeLocationStore(initial: Location = MOSCOW) {
	const current = state<Location>(initial);
	return {
		get current() {
			return get(current);
		},
		setLocation(location: Location) {
			set(current, location);
		}
	};
}

/** Drain the microtask queue: effect flush + fetcher promise hops. */
async function settle(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('createForecastStore — SWR', () => {
	it('serves a fresh cache hit without any network call', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const storage = makeMemoryStorage();
		const payload = makePayload(5);
		seedCache(storage, MOSCOW, payload, NOW - 60_000);
		const fetcher = vi.fn();
		const settings = makeSettings();

		const store = createForecastStore({
			storage,
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: settings
		});
		await settle();

		expect(store.status).toBe('fresh');
		expect(store.payload).toEqual(payload);
		expect(store.fetchedAt).toBe(NOW - 60_000);
		expect(store.refreshing).toBe(false);
		expect(fetcher).not.toHaveBeenCalled();
		expect(settings.touchLastUpdated).not.toHaveBeenCalled();
	});

	it('shows a stale cache entry immediately and refreshes in the background without blanking data', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const storage = makeMemoryStorage();
		const stalePayload = makePayload(5);
		const freshPayload = makePayload(9);
		seedCache(storage, MOSCOW, stalePayload, NOW - STALE_MS / 2);
		const pending: Array<{ resolve: (payload: ForecastPayload) => void }> = [];
		const fetcher = vi.fn(
			() => new Promise<ForecastPayload>((resolve) => pending.push({ resolve }))
		);
		const settings = makeSettings();

		const store = createForecastStore({
			storage,
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: settings
		});
		await settle();

		expect(store.status).toBe('stale');
		expect(store.payload).toEqual(stalePayload);
		expect(store.fetchedAt).toBe(NOW - STALE_MS / 2);
		expect(store.refreshing).toBe(true);
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(fetcher).toHaveBeenCalledWith(MOSCOW);

		pending[0].resolve(freshPayload);
		await settle();

		expect(store.status).toBe('fresh');
		expect(store.payload).toEqual({ ...freshPayload, fetchedAt: NOW });
		expect(store.fetchedAt).toBe(NOW);
		expect(store.refreshing).toBe(false);
		expect(settings.touchLastUpdated).toHaveBeenCalledWith(NOW);
	});

	it('shows the last cached forecast with its timestamp when offline', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const storage = makeMemoryStorage();
		const payload = makePayload(5);
		const fetchedAt = NOW - 3 * 60 * 60 * 1000;
		seedCache(storage, MOSCOW, payload, fetchedAt);
		const fetcher = vi.fn();

		const store = createForecastStore({
			storage,
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: makeSettings(),
			onLine: () => false
		});
		await settle();

		expect(store.status).toBe('offline');
		expect(store.payload).toEqual(payload);
		expect(store.fetchedAt).toBe(fetchedAt);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('reports a dedicated offline state when offline without any cache', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const fetcher = vi.fn();

		const store = createForecastStore({
			storage: makeMemoryStorage(),
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: makeSettings(),
			onLine: () => false
		});
		await settle();

		expect(store.status).toBe('offline');
		expect(store.payload).toBeNull();
		expect(store.fetchedAt).toBeNull();
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('treats a network-kind fetch failure as offline, keeping the cached payload', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const storage = makeMemoryStorage();
		const payload = makePayload(5);
		const fetchedAt = NOW - 30 * 60 * 1000;
		seedCache(storage, MOSCOW, payload, fetchedAt);
		const fetcher = vi.fn().mockRejectedValue({ kind: 'network' });
		const store = createForecastStore({
			storage,
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: makeSettings()
		});
		await settle();

		expect(store.status).toBe('offline');
		expect(store.payload).toEqual(payload);
		expect(store.fetchedAt).toBe(fetchedAt);
		expect(store.error).toBeNull();
		expect(store.refreshing).toBe(false);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('reports the dedicated offline state when a network-kind failure has no cache', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const fetcher = vi.fn().mockRejectedValue({ kind: 'network' });
		const store = createForecastStore({
			storage: makeMemoryStorage(),
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: makeSettings()
		});
		await settle();

		expect(store.status).toBe('offline');
		expect(store.payload).toBeNull();
		expect(store.fetchedAt).toBeNull();
		expect(store.error).toBeNull();
	});

	it('keeps http-kind failures as a generic error', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const fetcher = vi.fn().mockRejectedValue({ kind: 'http', status: 503 });
		const store = createForecastStore({
			storage: makeMemoryStorage(),
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: makeSettings()
		});
		await settle();

		expect(store.status).toBe('error');
		expect(store.error).toBe(REFRESH_ERROR_MESSAGE);
		expect(store.payload).toBeNull();
	});

	it('enters the error state on failure and recovers via retry', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const payload = makePayload(12);
		const fetcher = vi
			.fn()
			.mockRejectedValueOnce(new Error('network down'))
			.mockResolvedValue(payload);
		const store = createForecastStore({
			storage: makeMemoryStorage(),
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: makeSettings()
		});
		await settle();

		expect(store.status).toBe('error');
		expect(store.error).toBe(REFRESH_ERROR_MESSAGE);
		expect(store.payload).toBeNull();
		expect(store.refreshing).toBe(false);

		store.refresh();
		expect(store.status).toBe('loading');

		await settle();

		expect(store.status).toBe('fresh');
		expect(store.error).toBeNull();
		expect(store.payload).toEqual({ ...payload, fetchedAt: NOW });
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('keeps the on-screen data when a background refresh fails, and retry recovers', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const storage = makeMemoryStorage();
		const stalePayload = makePayload(5);
		const freshPayload = makePayload(11);
		seedCache(storage, MOSCOW, stalePayload, NOW - STALE_MS / 2);
		const fetcher = vi
			.fn()
			.mockRejectedValueOnce(new Error('timeout'))
			.mockResolvedValue(freshPayload);
		const store = createForecastStore({
			storage,
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: makeSettings()
		});
		await settle();

		expect(store.status).toBe('error');
		expect(store.error).toBe(REFRESH_ERROR_MESSAGE);
		expect(store.payload).toEqual(stalePayload);

		store.refresh();
		await settle();

		expect(store.status).toBe('fresh');
		expect(store.error).toBeNull();
		expect(store.payload).toEqual({ ...freshPayload, fetchedAt: NOW });
	});

	it('keeps fresh data on screen during a forced refresh', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const storage = makeMemoryStorage();
		const oldPayload = makePayload(5);
		const newPayload = makePayload(7);
		seedCache(storage, MOSCOW, oldPayload, NOW - 60_000);
		const fetcher = vi.fn(() => Promise.resolve(newPayload));
		const store = createForecastStore({
			storage,
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: makeSettings()
		});
		await settle();

		expect(store.status).toBe('fresh');
		expect(fetcher).not.toHaveBeenCalled();

		store.refresh();
		expect(store.refreshing).toBe(true);
		expect(store.status).toBe('fresh');
		expect(store.payload).toEqual(oldPayload);

		await settle();

		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(store.status).toBe('fresh');
		expect(store.payload).toEqual({ ...newPayload, fetchedAt: NOW });
		expect(store.refreshing).toBe(false);
	});

	it('refetches when the location changes and discards results for the old location', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const storage = makeMemoryStorage();
		const locationStore = makeLocationStore();
		const pending: Array<{
			location: Location;
			resolve: (payload: ForecastPayload) => void;
		}> = [];
		const fetcher = vi.fn(
			(location: Location) =>
				new Promise<ForecastPayload>((resolve) => pending.push({ location, resolve }))
		);
		const store = createForecastStore({
			storage,
			fetcher,
			locationStore,
			settingsStore: makeSettings()
		});
		await settle();

		expect(pending).toHaveLength(1);
		expect(pending[0].location.id).toBe(MOSCOW.id);

		locationStore.setLocation(SPB);
		await settle();

		expect(pending).toHaveLength(2);
		expect(pending[1].location.id).toBe(SPB.id);
		expect(store.status).toBe('loading');
		expect(store.payload).toBeNull();

		pending[0].resolve(makePayload(1));
		await settle();
		expect(store.payload).toBeNull();

		pending[1].resolve(makePayload(2));
		await settle();
		expect(store.status).toBe('fresh');
		expect(store.payload).toEqual({ ...makePayload(2), fetchedAt: NOW });
	});
});

describe('createForecastStore — refresh triggers', () => {
	function makeFakeDocument() {
		const handlers = new Map<string, () => void>();
		const document = {
			visibilityState: 'visible',
			addEventListener: vi.fn((type: string, cb: () => void) => handlers.set(type, cb)),
			removeEventListener: vi.fn((type: string) => handlers.delete(type)),
			handlers
		};
		const window = {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		};
		return { document, window };
	}

	it('refreshes on visibilitychange only when the cached data is no longer fresh', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const { document, window } = makeFakeDocument();
		vi.stubGlobal('document', document);
		vi.stubGlobal('window', window);

		const storage = makeMemoryStorage();
		const payload = makePayload(5);
		seedCache(storage, MOSCOW, payload, NOW - 60_000);
		const fetcher = vi.fn(() => Promise.resolve(makePayload(6)));
		const store = createForecastStore({
			storage,
			fetcher,
			locationStore: makeLocationStore(),
			settingsStore: makeSettings()
		});
		await settle();

		expect(store.status).toBe('fresh');
		expect(document.addEventListener).toHaveBeenCalledWith(
			'visibilitychange',
			expect.any(Function)
		);

		document.handlers.get('visibilitychange')!();
		await settle();
		expect(fetcher).not.toHaveBeenCalled();

		vi.setSystemTime(NOW + FRESH_MS + 1000);
		document.handlers.get('visibilitychange')!();
		document.handlers.get('visibilitychange')!();
		expect(store.status).toBe('stale');
		expect(store.payload).toEqual(payload);

		await settle();

		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(store.status).toBe('fresh');

		store.destroy();
		expect(document.removeEventListener).toHaveBeenCalledWith(
			'visibilitychange',
			expect.any(Function)
		);
		expect(window.removeEventListener).toHaveBeenCalledWith('pageshow', expect.any(Function));
	});

	it('does not attach browser listeners when document is unavailable', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const store = createForecastStore({
			storage: makeMemoryStorage(),
			fetcher: vi.fn(() => new Promise<ForecastPayload>(() => {})),
			locationStore: makeLocationStore(),
			settingsStore: makeSettings()
		});
		await settle();

		expect(store.status).toBe('loading');
		store.destroy();
	});
});

describe('createForecastStore — defaults and singleton', () => {
	it('wires default dependencies without network when offline', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const store = createForecastStore({ onLine: () => false });
		await settle();

		expect(store.status).toBe('offline');
		store.destroy();
	});

	it('returns a stable singleton', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const first = getForecastStore();
		const second = getForecastStore();

		expect(second).toBe(first);
		await settle();
		expect(first.status).toBe('fresh');
	});

	it('dedupes concurrent fetches for the same city', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const storage = makeMemoryStorage();
		const locationStore = makeLocationStore();
		const pending: Array<{ resolve: (payload: ForecastPayload) => void }> = [];
		const fetcher = vi.fn(
			() => new Promise<ForecastPayload>((resolve) => pending.push({ resolve }))
		);
		const store = createForecastStore({
			storage,
			fetcher,
			locationStore,
			settingsStore: makeSettings()
		});
		await settle();

		store.refresh();
		store.refresh();
		store.refresh();
		await settle();

		expect(pending).toHaveLength(1);

		pending[0].resolve(makePayload(3));
		await settle();
		expect(store.status).toBe('fresh');
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
});