import { geoId } from '../api/geocoding';
import type { Location } from '../types';

export const STORAGE_KEY = 'weather:favorites';
// Storage marker for a geolocated point; render-localized via t('header.myLocation').
export const UNNAMED_LOCATION_NAME = 'Моё местоположение';
const UNNAMED_LOCATION_NAMES = new Set(['Моё местоположение', 'My location']);

export function isUnnamedLocation(location: Location): boolean {
	return UNNAMED_LOCATION_NAMES.has(location.name) || location.name.trim() === '';
}

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
	// Skip invalid or unnamed entries and deduplicate by stable coordinates
	const locations: Location[] = [];
	const seen = new Set<string>();
	for (const item of value) {
		if (!isLocation(item) || isUnnamedLocation(item)) continue;
		const key = geoId(item.latitude, item.longitude);
		if (seen.has(key)) continue;
		seen.add(key);
		locations.push(item);
	}
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
		if (isUnnamedLocation(location)) return false;
		const key = geoId(location.latitude, location.longitude);
		return list.some(
			(entry) => entry.id === location.id || geoId(entry.latitude, entry.longitude) === key
		);
	}

	function removeFavorite(id: string): void {
		const next = list.filter(
			(entry) => entry.id !== id && geoId(entry.latitude, entry.longitude) !== id
		);
		if (next.length === list.length) return;
		list = next;
		persist();
	}

	function toggleFavorite(location: Location): void {
		if (isUnnamedLocation(location)) return;
		if (isFavorite(location)) {
			const key = geoId(location.latitude, location.longitude);
			list = list.filter(
				(entry) => entry.id !== location.id && geoId(entry.latitude, entry.longitude) !== key
			);
			persist();
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
