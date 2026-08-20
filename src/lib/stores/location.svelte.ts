import { geoId } from '../api/geocoding';
import type { Location } from '../types';

export const STORAGE_KEY = 'weather:location';
export const GEO_STATE_KEY = 'weather:geoState';

export type GeoState = 'idle' | 'denied' | 'unavailable';

export const DEFAULT_LOCATION: Location = {
	id: geoId(55.7558, 37.6173),
	name: 'Москва',
	admin1: 'Москва',
	country: 'Россия',
	countryCode: 'RU',
	latitude: 55.7558,
	longitude: 37.6173,
	timezone: 'Europe/Moscow'
};

// Geolocation gives coords only — no reverse geocoding in Phase 1, so the
// name is generic until a city is picked via search or favorites.
const GEOLOCATION_NAME = 'Моё местоположение';

export type LocationStore = {
	readonly current: Location;
	readonly geoState: GeoState;
	setLocation(location: Location): void;
	requestGeolocation(): void;
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

function isGeoState(value: unknown): value is GeoState {
	return value === 'idle' || value === 'denied' || value === 'unavailable';
}

function removeItem(storage: Storage, key: string): void {
	try {
		storage.removeItem(key);
	} catch {
		/* noop */
	}
}

function readLocation(storage: Storage | null): Location | null {
	if (storage === null) return null;
	let raw: string | null;
	try {
		raw = storage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
	if (raw === null) return null;

	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		// Corrupt JSON — self-heal by dropping the bad payload.
		removeItem(storage, STORAGE_KEY);
		return null;
	}
	if (isLocation(value)) return value;
	removeItem(storage, STORAGE_KEY);
	return null;
}

function readGeoState(storage: Storage | null): GeoState | null {
	if (storage === null) return null;
	let raw: string | null;
	try {
		raw = storage.getItem(GEO_STATE_KEY);
	} catch {
		return null;
	}
	if (raw === null) return null;
	if (isGeoState(raw)) return raw;
	removeItem(storage, GEO_STATE_KEY);
	return null;
}

// Device timezone is the only client-side source for a geolocated point —
// the TZ contract requires timezone on every Location.
function deviceTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}

function locationFromCoords(latitude: number, longitude: number): Location {
	const lat = Number(latitude.toFixed(4));
	const lon = Number(longitude.toFixed(4));
	return {
		id: geoId(lat, lon),
		name: GEOLOCATION_NAME,
		latitude: lat,
		longitude: lon,
		timezone: deviceTimezone()
	};
}

export function createLocationStore(storage: Storage | null = defaultStorage()): LocationStore {
	let current = $state<Location>(readLocation(storage) ?? DEFAULT_LOCATION);
	let geoState = $state<GeoState>(readGeoState(storage) ?? 'idle');
	let pending = false;

	function persist(key: string, value: string): void {
		if (storage === null) return;
		try {
			storage.setItem(key, value);
		} catch {
			/* storage unavailable — keep running in memory */
		}
	}

	function setLocation(location: Location): void {
		current = location;
		persist(STORAGE_KEY, JSON.stringify(location));
	}

	function setGeoState(next: GeoState): void {
		geoState = next;
		persist(GEO_STATE_KEY, next);
	}

	function requestGeolocation(): void {
		// Denied/unavailable is final for the session — never re-prompt.
		if (geoState !== 'idle' || pending) return;
		if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
			setGeoState('unavailable');
			return;
		}
		pending = true;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				pending = false;
				setLocation(locationFromCoords(position.coords.latitude, position.coords.longitude));
			},
			(error) => {
				pending = false;
				// 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
				setGeoState(error.code === 1 ? 'denied' : 'unavailable');
			}
		);
	}

	return {
		get current() {
			return current;
		},
		get geoState() {
			return geoState;
		},
		setLocation,
		requestGeolocation
	};
}

let singleton: LocationStore | null = null;

export function getLocationStore(): LocationStore {
	singleton ??= createLocationStore();
	return singleton;
}
