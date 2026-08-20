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

	it('drops invalid entries on load, keeps valid ones, and cleans the storage', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify([MOSCOW, { id: 42 }, null, 'x'])
		});

		const store = createFavoritesStore(storage);

		expect(store.list).toEqual([MOSCOW]);
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual([MOSCOW]);
	});
});