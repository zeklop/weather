import { describe, expect, it } from 'vitest';
import type { Location } from '../../types';
import { STORAGE_KEY, createFavoritesStore } from '../favorites.svelte';
import { makeMemoryStorage } from './memoryStorage';

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

const UNNAMED_LOCATION: Location = {
	id: '55.75,37.61',
	name: 'Моё местоположение',
	latitude: 55.75,
	longitude: 37.61,
	timezone: 'Europe/Moscow'
};

describe('createFavoritesStore', () => {
	it('starts empty', () => {
		const store = createFavoritesStore(makeMemoryStorage());

		expect(store.list).toEqual([]);
	});

	it('toggleFavorite adds a location when absent and removes it when present', () => {
		const store = createFavoritesStore(makeMemoryStorage());

		store.toggleFavorite(MOSCOW);
		expect(store.isFavorite(MOSCOW)).toBe(true);
		expect(store.list).toEqual([MOSCOW]);

		store.toggleFavorite(MOSCOW);
		expect(store.isFavorite(MOSCOW)).toBe(false);
		expect(store.list).toEqual([]);
	});

	it('toggleFavorite matches by id, not by object identity', () => {
		const store = createFavoritesStore(makeMemoryStorage());

		store.toggleFavorite(MOSCOW);
		store.toggleFavorite({ ...MOSCOW, name: 'Москва-Сити' });

		expect(store.list).toEqual([]);
	});

	it('matches by stable location coordinates/geoId even when id differs (W-04)', () => {
		const store = createFavoritesStore(makeMemoryStorage());

		store.toggleFavorite(MOSCOW);
		const moscowWithDifferentId: Location = {
			...MOSCOW,
			id: 'custom-moscow-id'
		};

		expect(store.isFavorite(moscowWithDifferentId)).toBe(true);

		store.toggleFavorite(moscowWithDifferentId);
		expect(store.isFavorite(MOSCOW)).toBe(false);
		expect(store.list).toEqual([]);
	});

	it('disallows adding unnamed geolocation "Моё местоположение" to favorites (FV-3)', () => {
		const store = createFavoritesStore(makeMemoryStorage());

		expect(store.isFavorite(UNNAMED_LOCATION)).toBe(false);

		store.toggleFavorite(UNNAMED_LOCATION);
		expect(store.isFavorite(UNNAMED_LOCATION)).toBe(false);
		expect(store.list).toEqual([]);

		const blankLocation: Location = {
			...UNNAMED_LOCATION,
			name: '   '
		};
		expect(store.isFavorite(blankLocation)).toBe(false);
		store.toggleFavorite(blankLocation);
		expect(store.list).toEqual([]);
	});

	it('keeps other favorites when toggling one off', () => {
		const store = createFavoritesStore(makeMemoryStorage());

		store.toggleFavorite(MOSCOW);
		store.toggleFavorite(SPB);
		store.toggleFavorite(MOSCOW);

		expect(store.isFavorite(SPB)).toBe(true);
		expect(store.list).toEqual([SPB]);
	});

	it('removeFavorite removes by id and tolerates missing ids', () => {
		const store = createFavoritesStore(makeMemoryStorage());
		store.toggleFavorite(MOSCOW);
		store.toggleFavorite(SPB);

		store.removeFavorite(MOSCOW.id);

		expect(store.isFavorite(MOSCOW)).toBe(false);
		expect(store.list).toEqual([SPB]);
		expect(() => store.removeFavorite('missing')).not.toThrow();
	});

	it('persists favorites across store instances', () => {
		const storage = makeMemoryStorage();

		createFavoritesStore(storage).toggleFavorite(MOSCOW);
		createFavoritesStore(storage).toggleFavorite(SPB);

		const fresh = createFavoritesStore(storage);
		expect(fresh.list).toEqual([MOSCOW, SPB]);
	});

	it('self-heals corrupt JSON to an empty list', () => {
		const storage = makeMemoryStorage({ [STORAGE_KEY]: '{broken' });

		const store = createFavoritesStore(storage);

		expect(store.list).toEqual([]);
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('self-heals a non-array payload to an empty list', () => {
		const storage = makeMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ favorites: [] }) });

		const store = createFavoritesStore(storage);

		expect(store.list).toEqual([]);
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('drops invalid entries and unnamed locations on load, keeps valid ones, and cleans the storage', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify([MOSCOW, UNNAMED_LOCATION, { id: 42 }, null, 'x'])
		});

		const store = createFavoritesStore(storage);

		expect(store.list).toEqual([MOSCOW]);
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual([MOSCOW]);
	});
});

describe('createFavoritesStore.renameFavorite', () => {
	it('renames by coordinates key and persists the change', () => {
		const storage = makeMemoryStorage();
		const store = createFavoritesStore(storage);
		store.addFavorite(MOSCOW);

		store.renameFavorite('55.7558,37.6173', {
			name: 'Moscow',
			admin1: 'Moscow',
			country: 'Russia',
			countryCode: 'RU'
		});

		expect(store.list[0].name).toBe('Moscow');
		expect(store.list[0].country).toBe('Russia');
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)[0].name).toBe('Moscow');
	});

	it('keeps other fields intact when only a name is resolved', () => {
		const store = createFavoritesStore(makeMemoryStorage());
		store.addFavorite(SPB);

		store.renameFavorite(SPB.id, { name: 'Saint Petersburg' });

		expect(store.list[0]).toEqual({ ...SPB, name: 'Saint Petersburg' });
	});

	it('tolerates unknown keys', () => {
		const store = createFavoritesStore(makeMemoryStorage());
		store.addFavorite(MOSCOW);

		expect(() => store.renameFavorite('missing', { name: 'X' })).not.toThrow();
		expect(store.list).toEqual([MOSCOW]);
	});
});

describe('createFavoritesStore.addFavorite', () => {
	it('adds a location as favorite without removing existing ones', () => {
		const store = createFavoritesStore(makeMemoryStorage());

		store.toggleFavorite(MOSCOW);
		store.addFavorite(SPB);

		expect(store.list).toEqual([MOSCOW, SPB]);
		expect(store.isFavorite(SPB)).toBe(true);
	});

	it('does not duplicate an already favorited location', () => {
		const storage = makeMemoryStorage();
		const store = createFavoritesStore(storage);

		store.addFavorite(MOSCOW);
		store.addFavorite(MOSCOW);

		expect(store.list).toEqual([MOSCOW]);
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual([MOSCOW]);
	});

	it('matches duplicates by coordinates even when id differs', () => {
		const store = createFavoritesStore(makeMemoryStorage());

		store.addFavorite(MOSCOW);
		store.addFavorite({ ...MOSCOW, id: 'custom-moscow-id' });

		expect(store.list).toEqual([MOSCOW]);
	});

	it('ignores unnamed geolocation markers (FV-3)', () => {
		const store = createFavoritesStore(makeMemoryStorage());

		store.addFavorite(UNNAMED_LOCATION);

		expect(store.list).toEqual([]);
		expect(store.isFavorite(UNNAMED_LOCATION)).toBe(false);
	});
});