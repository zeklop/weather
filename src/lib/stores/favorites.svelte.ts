import type { Location } from '../types';

export const STORAGE_KEY = 'weather:favorites';

export type FavoritesStore = {
	readonly list: Location[];
	toggleFavorite(location: Location): void;
	isFavorite(location: Location): boolean;
	removeFavorite(id: string): void;
};

function defaultStorage(): Storage | null {
	return typeof localStorage !== 'undefined' ? localStorage : null;
}

function isLocation(value: unknown): value is Location {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry['id'] === 'string' &&
		entry['id'] !== '' &&
		typeof entry['name'] === 'string' &&
		entry['name'] !== '' &&
		typeof entry['latitude'] === 'number' &&
		typeof entry['longitude'] === 'number' &&
		typeof entry['timezone'] === 'string' &&
		entry['timezone'] !== ''
	);
}

function removeItem(storage: Storage, key: string): void {
	try {
		storage.removeItem(key);
	} catch {
		/* noop */
	}
}

function readFavorites(storage: Storage | null): Location[] {
	if (storage === null) return [];
	let raw: string | null;
	try {
		raw = storage.getItem(STORAGE_KEY);
	} catch {
		return [];
	}
	if (raw === null) return [];

	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		// Corrupt JSON — self-heal by dropping the bad payload.
		removeItem(storage, STORAGE_KEY);
		return [];
	}
	if (!Array.isArray(value)) {
		removeItem(storage, STORAGE_KEY);
		return [];
	}
	// Skip invalid entries rather than dropping the whole list, and rewrite
	// the cleaned list so the garbage doesn't stay in storage.
	const locations = value.filter(isLocation);
	if (locations.length !== value.length) {
		try {
			storage.setItem(STORAGE_KEY, JSON.stringify(locations));
		} catch {
			/* storage unavailable — keep running in memory */
		}
	}
	return locations;
}

export function createFavoritesStore(storage: Storage | null = defaultStorage()): FavoritesStore {
	let list = $state<Location[]>(readFavorites(storage));

	function persist(): void {
		if (storage === null) return;
		try {
			storage.setItem(STORAGE_KEY, JSON.stringify(list));
		} catch {
			/* storage unavailable — keep running in memory */
		}
	}

	function isFavorite(location: Location): boolean {
		return list.some((entry) => entry.id === location.id);
	}

	function removeFavorite(id: string): void {
		if (!list.some((entry) => entry.id === id)) return;
		list = list.filter((entry) => entry.id !== id);
		persist();
	}

	function toggleFavorite(location: Location): void {
		if (isFavorite(location)) {
			removeFavorite(location.id);
		} else {
			list = [...list, location];
			persist();
		}
	}

	return {
		get list() {
			return list;
		},
		toggleFavorite,
		isFavorite,
		removeFavorite
	};
}

let singleton: FavoritesStore | null = null;

export function getFavoritesStore(): FavoritesStore {
	singleton ??= createFavoritesStore();
	return singleton;
}
