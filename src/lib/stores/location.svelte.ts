import { geoId } from '../api/geocoding';
import { reverseGeocode } from '../api/reverseGeocode';
import { DEFAULT_LANGUAGE, type Language } from '../i18n';
import type { Location } from '../types';

export const STORAGE_KEY = 'weather:location';
export const GEO_STATE_KEY = 'weather:geoState';

export type GeoState = 'idle' | 'denied' | 'unavailable' | 'error';

export const DEFAULT_LOCATIONS: Record<Language, Location> = {
	en: {
		id: geoId(55.7558, 37.6173),
		name: 'Moscow',
		admin1: 'Moscow',
		country: 'Russia',
		countryCode: 'RU',
		latitude: 55.7558,
		longitude: 37.6173,
		timezone: 'Europe/Moscow'
	},
	ru: {
		id: geoId(55.7558, 37.6173),
		name: 'Москва',
		admin1: 'Москва',
		country: 'Россия',
		countryCode: 'RU',
		latitude: 55.7558,
		longitude: 37.6173,
		timezone: 'Europe/Moscow'
	}
};

export function getDefaultLocation(lang: Language = DEFAULT_LANGUAGE): Location {
	return DEFAULT_LOCATIONS[lang] ?? DEFAULT_LOCATIONS.en;
}

export const DEFAULT_LOCATION: Location = DEFAULT_LOCATIONS.en;

// Geolocation gives coords only; the generic name is shown until best-effort
// reverse geocoding resolves a city name (or forever, if it fails).
const GEOLOCATION_NAME = 'Моё местоположение';

export type LocationStore = {
	readonly current: Location;
	readonly geoState: GeoState;
	readonly geoPending: boolean;
	setLocation(location: Location): void;
	requestGeolocation(lang?: Language): void;
	syncPermission(): Promise<void>;
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
	return value === 'idle' || value === 'denied' || value === 'unavailable' || value === 'error';
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
	const lat = Number(latitude.toFixed(2));
	const lon = Number(longitude.toFixed(2));
	return {
		id: geoId(lat, lon),
		name: GEOLOCATION_NAME,
		latitude: lat,
		longitude: lon,
		timezone: deviceTimezone()
	};
}

export function createLocationStore(
	storage: Storage | null = defaultStorage(),
	fallbackLocation: Location = DEFAULT_LOCATION
): LocationStore {
	let current = $state<Location>(readLocation(storage) ?? fallbackLocation);
	let geoState = $state<GeoState>(readGeoState(storage) ?? 'idle');
	let geoPending = $state(false);

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

	function requestGeolocation(lang: Language = DEFAULT_LANGUAGE): void {
		if (geoPending) return;
		if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
			setGeoState('unavailable');
			return;
		}
		geoPending = true;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				geoPending = false;
				setGeoState('idle');
				const located = locationFromCoords(
					position.coords.latitude,
					position.coords.longitude
				);
				setLocation(located);
				void refineName(located, lang);
			},
			(error) => {
				geoPending = false;
				// 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
				setGeoState(error.code === 1 ? 'denied' : error.code === 2 ? 'unavailable' : 'error');
			},
			{ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
		);
	}

	// Replace the generic geolocation label with a resolved city name once
	// reverse geocoding answers; skipped if the user moved on meanwhile.
	async function refineName(located: Location, lang: Language): Promise<void> {
		const resolved = await reverseGeocode(located.latitude, located.longitude, lang);
		if (!resolved) return;
		if (current.id !== located.id) return;
		setLocation({ ...located, ...resolved });
	}

	async function syncPermission(): Promise<void> {
		if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
		try {
			const status = await navigator.permissions.query({ name: 'geolocation' });
			const update = (): void => {
				if (status.state === 'granted' || status.state === 'prompt') {
					if (geoState === 'denied') {
						setGeoState('idle');
					}
				} else if (status.state === 'denied') {
					setGeoState('denied');
				}
			};
			update();
			status.onchange = update;
		} catch {
			/* permissions query not supported or failed */
		}
	}

	return {
		get current() {
			return current;
		},
		get geoState() {
			return geoState;
		},
		get geoPending() {
			return geoPending;
		},
		setLocation,
		requestGeolocation,
		syncPermission
	};
}

let singleton: LocationStore | null = null;

export function getLocationStore(): LocationStore {
	singleton ??= createLocationStore();
	return singleton;
}
