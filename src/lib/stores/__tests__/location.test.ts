import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Location } from '../../types';
import {
	DEFAULT_LOCATION,
	DEFAULT_LOCATIONS,
	GEO_STATE_KEY,
	STORAGE_KEY,
	createLocationStore,
	getDefaultLocation,
	getLocationStore
} from '../location.svelte';
import { makeMemoryStorage } from './memoryStorage';

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

function makeGeolocation(getCurrentPosition: unknown): void {
	vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
}

// Keep tests hermetic: reverse geocoding must never hit the real network.
beforeEach(() => {
	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network disabled in tests')));
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('DEFAULT_LOCATIONS and getDefaultLocation', () => {
	it('provides localized default fallback location for en and ru', () => {
		expect(DEFAULT_LOCATIONS.en.name).toBe('Moscow');
		expect(DEFAULT_LOCATIONS.en.country).toBe('Russia');
		expect(DEFAULT_LOCATIONS.ru.name).toBe('Москва');
		expect(DEFAULT_LOCATIONS.ru.country).toBe('Россия');
		expect(DEFAULT_LOCATIONS.en.id).toBe('55.7558,37.6173');
		expect(DEFAULT_LOCATIONS.ru.id).toBe('55.7558,37.6173');

		expect(getDefaultLocation('en')).toEqual(DEFAULT_LOCATIONS.en);
		expect(getDefaultLocation('ru')).toEqual(DEFAULT_LOCATIONS.ru);
		expect(DEFAULT_LOCATION).toEqual(DEFAULT_LOCATIONS.en);
	});
});

describe('createLocationStore', () => {
	it('defaults to Moscow when storage is empty', () => {
		const store = createLocationStore(makeMemoryStorage());

		expect(store.current).toEqual(DEFAULT_LOCATION);
		expect(store.current.name).toBe('Moscow');
		expect(store.current.id).toBe('55.7558,37.6173');
		expect(store.current.timezone).toBe('Europe/Moscow');
		expect(store.geoState).toBe('idle');
	});

	it('defaults to Moscow with no storage at all', () => {
		const store = createLocationStore(null);

		expect(store.current).toEqual(DEFAULT_LOCATION);
	});

	it('setLocation updates the store and persists; a fresh store restores it', () => {
		const storage = makeMemoryStorage();
		const store = createLocationStore(storage);

		store.setLocation(SPB);

		expect(store.current).toEqual(SPB);
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(SPB);

		const fresh = createLocationStore(storage);
		expect(fresh.current).toEqual(SPB);
	});

	it('self-heals corrupt location JSON back to default location', () => {
		const storage = makeMemoryStorage({ [STORAGE_KEY]: '{not json' });

		const store = createLocationStore(storage);

		expect(store.current).toEqual(DEFAULT_LOCATION);
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('self-heals a location with a wrong shape back to default location', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ name: 'Москва', latitude: 55.7558 })
		});

		const store = createLocationStore(storage);

		expect(store.current).toEqual(DEFAULT_LOCATION);
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('restores a persisted geoState', () => {
		const storage = makeMemoryStorage({ [GEO_STATE_KEY]: 'denied' });

		const store = createLocationStore(storage);

		expect(store.geoState).toBe('denied');
	});

	it('self-heals an invalid geoState back to idle', () => {
		const storage = makeMemoryStorage({ [GEO_STATE_KEY]: 'banned' });

		const store = createLocationStore(storage);

		expect(store.geoState).toBe('idle');
		expect(storage.getItem(GEO_STATE_KEY)).toBeNull();
	});

	it('marks geolocation unavailable when navigator.geolocation is missing and persists it', () => {
		vi.stubGlobal('navigator', {});
		const storage = makeMemoryStorage();
		const store = createLocationStore(storage);

		store.requestGeolocation();

		expect(store.geoState).toBe('unavailable');
		expect(storage.getItem(GEO_STATE_KEY)).toBe('unavailable');
	});

	it('switches to the geolocated coordinates rounded to 2 decimals on success', () => {
		makeGeolocation((success: (position: unknown) => void) =>
			success({ coords: { latitude: 59.9386, longitude: 30.3141 } })
		);
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation();

		expect(store.current.id).toBe('59.9400,30.3100');
		expect(store.current.latitude).toBe(59.94);
		expect(store.current.longitude).toBe(30.31);
		expect(store.current.name).toBe('Моё местоположение');
		expect(typeof store.current.timezone).toBe('string');
		expect(store.current.timezone).not.toBe('');
		expect(store.geoState).toBe('idle');
		expect(store.geoPending).toBe(false);
	});

	it('resolves the city name via best-effort reverse geocoding after GPS success', async () => {
		makeGeolocation((success: (position: unknown) => void) =>
			success({ coords: { latitude: 59.9386, longitude: 30.3141 } })
		);
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				city: 'Saint Petersburg',
				principalSubdivision: 'Saint Petersburg',
				countryName: 'Russia',
				countryCode: 'RU'
			})
		});
		vi.stubGlobal('fetch', fetchMock);
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation('en');

		// Generic label shown immediately, refined once reverse geocoding answers
		expect(store.current.name).toBe('Моё местоположение');
		await vi.waitFor(() => expect(store.current.name).toBe('Saint Petersburg'));
		expect(store.current.admin1).toBe('Saint Petersburg');
		expect(store.current.country).toBe('Russia');
		expect(store.current.countryCode).toBe('RU');
		expect(fetchMock.mock.calls[0]?.[0]).toContain('localityLanguage=en');
	});

	it('keeps the generic geolocation name when reverse geocoding fails', async () => {
		makeGeolocation((success: (position: unknown) => void) =>
			success({ coords: { latitude: 59.9386, longitude: 30.3141 } })
		);
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation('ru');
		await Promise.resolve();
		await Promise.resolve();

		expect(store.current.name).toBe('Моё местоположение');
	});

	it('does not overwrite a city the user selected while reverse geocoding was in flight', async () => {
		let successCb: (position: unknown) => void = () => {};
		makeGeolocation((success: (position: unknown) => void) => {
			successCb = success;
		});
		let resolveGeocode: (value: unknown) => void = () => {};
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(
				() =>
					new Promise((resolve) => {
						resolveGeocode = resolve;
					})
			)
		);
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation('en');
		successCb({ coords: { latitude: 59.9386, longitude: 30.3141 } });
		// User picks a city before the reverse geocode answers
		store.setLocation(SPB);
		resolveGeocode({
			ok: true,
			json: async () => ({ city: 'Saint Petersburg' })
		});
		// Flush the resolve -> json -> refine microtask chain
		for (let i = 0; i < 6; i++) await Promise.resolve();

		expect(store.current).toEqual(SPB);
	});

	it('mitigates GPS jitter by producing identical IDs for nearby coordinates', () => {
		let successCb: (position: unknown) => void = () => {};
		makeGeolocation((success: (position: unknown) => void) => {
			successCb = success;
		});
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation();
		successCb({ coords: { latitude: 55.7558, longitude: 37.6173 } });
		const firstId = store.current.id;

		store.requestGeolocation();
		// GPS jitter: ~200m difference still rounds to 55.76, 37.62
		successCb({ coords: { latitude: 55.7571, longitude: 37.6189 } });
		const secondId = store.current.id;

		expect(firstId).toBe('55.7600,37.6200');
		expect(secondId).toBe(firstId);
	});

	it('persists the geolocated location with 2-decimal rounding', () => {
		makeGeolocation((success: (position: unknown) => void) =>
			success({ coords: { latitude: 59.9386, longitude: 30.3141 } })
		);
		const storage = makeMemoryStorage();
		const store = createLocationStore(storage);

		store.requestGeolocation();

		const fresh = createLocationStore(storage);
		expect(fresh.current.id).toBe('59.9400,30.3100');
		expect(fresh.current.latitude).toBe(59.94);
		expect(fresh.current.longitude).toBe(30.31);
	});

	it('passes timeout and accuracy options to getCurrentPosition', () => {
		const getCurrentPosition = vi.fn();
		makeGeolocation(getCurrentPosition);
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation();

		expect(getCurrentPosition).toHaveBeenCalledWith(
			expect.any(Function),
			expect.any(Function),
			{ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
		);
	});

	it('tracks geoPending during request lifecycle', () => {
		let successCb: (position: unknown) => void = () => {};
		const getCurrentPosition = vi.fn((success: (position: unknown) => void) => {
			successCb = success;
		});
		makeGeolocation(getCurrentPosition);
		const store = createLocationStore(makeMemoryStorage());

		expect(store.geoPending).toBe(false);
		store.requestGeolocation();
		expect(store.geoPending).toBe(true);

		successCb({ coords: { latitude: 55.75, longitude: 37.62 } });
		expect(store.geoPending).toBe(false);
	});

	it('flags denied on permission error and resets geoPending', () => {
		const getCurrentPosition = vi.fn((_success: unknown, error: (e: unknown) => void) =>
			error({ code: 1 })
		);
		makeGeolocation(getCurrentPosition);
		const storage = makeMemoryStorage();
		const store = createLocationStore(storage);

		store.requestGeolocation();
		expect(store.geoState).toBe('denied');
		expect(store.geoPending).toBe(false);
		expect(storage.getItem(GEO_STATE_KEY)).toBe('denied');
	});

	it('flags unavailable on position error code 2 and resets geoPending', () => {
		const getCurrentPosition = vi.fn((_success: unknown, error: (e: unknown) => void) =>
			error({ code: 2 })
		);
		makeGeolocation(getCurrentPosition);
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation();

		expect(store.geoState).toBe('unavailable');
		expect(store.geoPending).toBe(false);
	});

	it('flags error on timeout code 3 and resets geoPending', () => {
		const getCurrentPosition = vi.fn((_success: unknown, error: (e: unknown) => void) =>
			error({ code: 3 })
		);
		makeGeolocation(getCurrentPosition);
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation();

		expect(store.geoState).toBe('error');
		expect(store.geoPending).toBe(false);
	});

	it('allows user to retry geolocation request after prior denial', () => {
		const getCurrentPosition = vi.fn((success: (p: unknown) => void) => {
			success({ coords: { latitude: 59.9386, longitude: 30.3141 } });
		});
		makeGeolocation(getCurrentPosition);
		const storage = makeMemoryStorage({ [GEO_STATE_KEY]: 'denied' });

		const store = createLocationStore(storage);
		expect(store.geoState).toBe('denied');

		// User clicks retry
		store.requestGeolocation();

		expect(getCurrentPosition).toHaveBeenCalledTimes(1);
		expect(store.current.id).toBe('59.9400,30.3100');
		expect(store.geoState).toBe('idle');
	});

	it('does not issue a second geolocation request while one is in flight', () => {
		let success: (position: unknown) => void = () => {};
		const getCurrentPosition = vi.fn((onSuccess: (p: unknown) => void) => {
			success = onSuccess;
		});
		makeGeolocation(getCurrentPosition);
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation();
		store.requestGeolocation();

		expect(getCurrentPosition).toHaveBeenCalledTimes(1);

		success({ coords: { latitude: 59.9386, longitude: 30.3141 } });
		store.requestGeolocation();

		expect(getCurrentPosition).toHaveBeenCalledTimes(2);
	});

	describe('syncPermission', () => {
		it('resets denied state to idle when permission is granted', async () => {
			const query = vi.fn().mockResolvedValue({ state: 'granted' });
			vi.stubGlobal('navigator', {
				permissions: { query }
			});
			const storage = makeMemoryStorage({ [GEO_STATE_KEY]: 'denied' });
			const store = createLocationStore(storage);
			expect(store.geoState).toBe('denied');

			await store.syncPermission();

			expect(query).toHaveBeenCalledWith({ name: 'geolocation' });
			expect(store.geoState).toBe('idle');
			expect(storage.getItem(GEO_STATE_KEY)).toBe('idle');
		});

		it('resets denied state to idle when permission is prompt', async () => {
			const query = vi.fn().mockResolvedValue({ state: 'prompt' });
			vi.stubGlobal('navigator', {
				permissions: { query }
			});
			const storage = makeMemoryStorage({ [GEO_STATE_KEY]: 'denied' });
			const store = createLocationStore(storage);

			await store.syncPermission();

			expect(store.geoState).toBe('idle');
		});

		it('sets geoState to denied when permission is denied', async () => {
			const query = vi.fn().mockResolvedValue({ state: 'denied' });
			vi.stubGlobal('navigator', {
				permissions: { query }
			});
			const storage = makeMemoryStorage();
			const store = createLocationStore(storage);
			expect(store.geoState).toBe('idle');

			await store.syncPermission();

			expect(store.geoState).toBe('denied');
			expect(storage.getItem(GEO_STATE_KEY)).toBe('denied');
		});

		it('handles missing permissions API gracefully', async () => {
			vi.stubGlobal('navigator', {});
			const store = createLocationStore(makeMemoryStorage());

			await expect(store.syncPermission()).resolves.toBeUndefined();
		});

		it('handles permission query rejection gracefully', async () => {
			const query = vi.fn().mockRejectedValue(new Error('Permission query error'));
			vi.stubGlobal('navigator', {
				permissions: { query }
			});
			const store = createLocationStore(makeMemoryStorage());

			await expect(store.syncPermission()).resolves.toBeUndefined();
		});
	});
});

describe('getLocationStore', () => {
	it('returns a stable singleton', () => {
		expect(getLocationStore()).toBe(getLocationStore());
	});
});
