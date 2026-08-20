import { getForecast } from '../api/openMeteo';
import { cacheKey, createForecastCache, statusOf } from '../cache/forecastCache';
import type { ForecastPayload, ForecastStatus, Location } from '../types';
import { getLocationStore, type LocationStore } from './location.svelte';
import { memoryStorage } from './memoryStorage';
import { getSettingsStore, type SettingsStore } from './settings.svelte';

// Internal diagnostic flag — never rendered to the user (UI shows localized t() strings).
export const REFRESH_ERROR_MESSAGE = 'Failed to refresh forecast';

export type ForecastStore = {
	readonly payload: ForecastPayload | null;
	readonly status: ForecastStatus;
	readonly fetchedAt: number | null;
	readonly refreshing: boolean;
	readonly error: string | null;
	load(location?: Location, force?: boolean): void;
	refresh(): void;
	destroy(): void;
};

export type ForecastStoreOptions = {
	storage?: Storage | null;
	fetcher?: (location: Location) => Promise<ForecastPayload>;
	locationStore?: Pick<LocationStore, 'current'>;
	settingsStore?: Pick<SettingsStore, 'touchLastUpdated'>;
	onLine?: () => boolean;
};

function defaultStorage(): Storage {
	return typeof localStorage !== 'undefined' ? localStorage : memoryStorage();
}

function defaultOnLine(): boolean {
	// navigator.onLine is absent in some environments (node) — treat as online.
	return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

export function createForecastStore(options: ForecastStoreOptions = {}): ForecastStore {
	const cache = createForecastCache(options.storage ?? defaultStorage());
	const fetcher = options.fetcher ?? getForecast;
	const locationStore = options.locationStore ?? getLocationStore();
	const settingsStore = options.settingsStore ?? getSettingsStore();
	const onLine = options.onLine ?? defaultOnLine;

	let payload = $state<ForecastPayload | null>(null);
	let payloadLocation: Location | null = null;
	let status = $state<ForecastStatus>('idle');
	let fetchedAt = $state<number | null>(null);
	let refreshing = $state(false);
	let error = $state<string | null>(null);

	// Fetch bookkeeping: fetchingKey dedupes concurrent fetches for the same
	// city; epoch discards results of fetches superseded by a location change.
	let fetchingKey: string | null = null;
	let epoch = 0;

	function applyEntry(entry: NonNullable<ReturnType<typeof cache.get>>): void {
		payload = entry.payload;
		payloadLocation = entry.location;
		fetchedAt = entry.fetchedAt;
	}

	function isNetworkFailure(error: unknown): boolean {
		return (error as { kind?: unknown } | null)?.kind === 'network';
	}

	function startFetch(location: Location, key: string): void {
		if (fetchingKey === key) return;
		const id = ++epoch;
		fetchingKey = key;
		refreshing = true;

		fetcher(location).then(
			(result) => {
				if (id !== epoch) return;
				const now = Date.now();
				const stamped = { ...result, fetchedAt: now };
				cache.set(key, { fetchedAt: now, location, payload: stamped });
				payload = stamped;
				payloadLocation = location;
				fetchedAt = now;
				error = null;
				status = 'fresh';
				settingsStore.touchLastUpdated(now);
			},
			(err: unknown) => {
				if (id !== epoch) return;
				// navigator.onLine lies for dead VPN / wifi-without-internet:
				// a network-kind failure means offline too (plan §offline).
				if (isNetworkFailure(err) || !onLine()) {
					const entry = cache.get(key);
					if (entry !== null) applyEntry(entry);
					status = 'offline';
					error = null;
					return;
				}
				error = REFRESH_ERROR_MESSAGE;
				status = 'error';
			}
		).finally(() => {
			if (id !== epoch) return;
			fetchingKey = null;
			refreshing = false;
		});
	}

	function load(location: Location = locationStore.current, force = false): void {
		const key = cacheKey(location.latitude, location.longitude);
		const entry = cache.get(key);
		const cachedStatus = entry === null ? 'miss' : statusOf(entry, Date.now());

		// City switch: drop the other city's data — a skeleton is honest,
		// showing the wrong city's weather is not.
		if (payloadLocation !== null && payloadLocation.id !== location.id) {
			payload = null;
			payloadLocation = null;
			fetchedAt = null;
		}

		if (!force && !onLine()) {
			if (entry !== null) applyEntry(entry);
			status = 'offline';
			return;
		}

		if (cachedStatus === 'fresh' && !force) {
			applyEntry(entry!);
			status = 'fresh';
			return;
		}

		if (cachedStatus === 'stale' && !force) {
			applyEntry(entry!);
			status = 'stale';
			startFetch(location, key);
			return;
		}

		// Miss, expired, or forced refresh: fetch, keeping any on-screen data.
		if (payload === null) {
			status = 'loading';
		} else if (cachedStatus !== 'fresh') {
			status = 'stale';
		}
		startFetch(location, key);
	}

	function refresh(): void {
		load(payloadLocation ?? locationStore.current, true);
	}

	function onOnline(): void {
		load(payloadLocation ?? locationStore.current);
	}

	if (typeof window !== 'undefined') {
		window.addEventListener('online', onOnline);
	}

	function destroy(): void {
		if (typeof window !== 'undefined') {
			window.removeEventListener('online', onOnline);
		}
	}

	return {
		get payload() {
			return payload;
		},
		get status() {
			return status;
		},
		get fetchedAt() {
			return fetchedAt;
		},
		get refreshing() {
			return refreshing;
		},
		get error() {
			return error;
		},
		load,
		refresh,
		destroy
	};
}
