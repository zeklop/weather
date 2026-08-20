import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Location } from '../../types';
import {
	DEFAULT_LOCATION,
	GEO_STATE_KEY,
	STORAGE_KEY,
	createLocationStore,
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

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('createLocationStore', () => {
	it('defaults to Москва when storage is empty', () => {
		const store = createLocationStore(makeMemoryStorage());

		expect(store.current).toEqual(DEFAULT_LOCATION);
		expect(store.current.id).toBe('55.7558,37.6173');
		expect(store.current.timezone).toBe('Europe/Moscow');
		expect(store.geoState).toBe('idle');
	});

	it('defaults to Москва with no storage at all', () => {
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

	it('self-heals corrupt location JSON back to Москва', () => {
		const storage = makeMemoryStorage({ [STORAGE_KEY]: '{not json' });

		const store = createLocationStore(storage);

		expect(store.current).toEqual(DEFAULT_LOCATION);
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('self-heals a location with a wrong shape back to Москва', () => {
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

	it('switches to the geolocated coordinates on success', () => {
		makeGeolocation((success: (position: unknown) => void) =>
			success({ coords: { latitude: 59.9386, longitude: 30.3141 } })
		);
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation();

		expect(store.current.id).toBe('59.9386,30.3141');
		expect(store.current.latitude).toBe(59.9386);
		expect(store.current.longitude).toBe(30.3141);
		expect(store.current.name).toBe('Моё местоположение');
		expect(typeof store.current.timezone).toBe('string');
		expect(store.current.timezone).not.toBe('');
		expect(store.geoState).toBe('idle');
	});

	it('persists the geolocated location', () => {
		makeGeolocation((success: (position: unknown) => void) =>
			success({ coords: { latitude: 59.9386, longitude: 30.3141 } })
		);
		const storage = makeMemoryStorage();
		const store = createLocationStore(storage);

		store.requestGeolocation();

		const fresh = createLocationStore(storage);
		expect(fresh.current.id).toBe('59.9386,30.3141');
	});

	it('flags denied on permission error and sets geoState to denied', () => {
		const getCurrentPosition = vi.fn((_success: unknown, error: (e: unknown) => void) =>
			error({ code: 1 })
		);
		makeGeolocation(getCurrentPosition);
		const storage = makeMemoryStorage();
		const store = createLocationStore(storage);

		store.requestGeolocation();
		expect(store.geoState).toBe('denied');
		expect(storage.getItem(GEO_STATE_KEY)).toBe('denied');
	});

	it('flags unavailable on position error code 2', () => {
		const getCurrentPosition = vi.fn((_success: unknown, error: (e: unknown) => void) =>
			error({ code: 2 })
		);
		makeGeolocation(getCurrentPosition);
		const store = createLocationStore(makeMemoryStorage());

		store.requestGeolocation();

		expect(store.geoState).toBe('unavailable');
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
		expect(store.current.id).toBe('59.9386,30.3141');
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
});

describe('getLocationStore', () => {
	it('returns a stable singleton', () => {
		expect(getLocationStore()).toBe(getLocationStore());
	});
});
