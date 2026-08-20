import { geoId } from '../api/geocoding';
import type { CachedForecast } from '../types';
import { CACHE_BUDGET_BYTES, FRESH_MS, MAX_CACHED_CITIES, RUNTIME_CACHE_CAP, STALE_MS } from './limits';

// Dual-LRU cache policy:
// - Runtime layer: access-LRU. get() and set() promote the key to most-recent
//   (delete-then-reinsert), so background-refreshed cities don't rot at the
//   eviction head. Overflow drops the least-recently-used entry.
// - Persistent layer: fetchedAt-LRU. Eviction drops the entry with the oldest
//   fetchedAt, regardless of access — deliberate: persisting access order on
//   every get would churn localStorage writes.
// Consequence (accepted): a frequently-viewed but stale city can drop out of
// the 8-slot persistent layer in favor of a newer fetch, and re-promote on the
// next view.

export const STORAGE_KEY = 'weather:forecast-cache:v1';
const ENVELOPE_VERSION = 1;

export type CacheStatus = 'fresh' | 'stale' | 'expired' | 'miss';

type Envelope = { version: number; entries: Record<string, CachedForecast> };

export type ForecastCache = {
	get(key: string): CachedForecast | null;
	set(key: string, entry: CachedForecast): void;
	remove(key: string): void;
	clear(): void;
};

export function cacheKey(latitude: number, longitude: number): string {
	return `forecast:${geoId(latitude, longitude)}`;
}

export function statusOf(entry: CachedForecast, now = Date.now()): CacheStatus {
	const age = now - entry.fetchedAt;
	if (age < FRESH_MS) return 'fresh';
	if (age < STALE_MS) return 'stale';
	return 'expired';
}

function isQuotaExceeded(error: unknown): boolean {
	return (
		error instanceof DOMException &&
		(error as DOMException).name === 'QuotaExceededError'
	);
}

function isCachedForecast(value: unknown): value is CachedForecast {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry['fetchedAt'] === 'number' &&
		typeof entry['location'] === 'object' &&
		entry['location'] !== null &&
		typeof entry['payload'] === 'object' &&
		entry['payload'] !== null
	);
}

export function createForecastCache(storage: Storage = localStorage): ForecastCache {
	const runtime = new Map<string, CachedForecast>();
	let persisted = new Map<string, CachedForecast>();
	let persistentDisabled = false;
	let warnedOnce = false;

	function warnOnce(message: string): void {
		if (warnedOnce) return;
		warnedOnce = true;
		console.warn(message);
	}

	function readPersisted(): void {
		if (persistentDisabled) return;
		let raw: string | null;
		try {
			raw = storage.getItem(STORAGE_KEY);
		} catch {
			persistentDisabled = true;
			return;
		}
		if (raw === null) return;

		let envelope: Envelope;
		try {
			envelope = JSON.parse(raw) as Envelope;
		} catch {
			// Corrupt JSON — self-heal by dropping the bad payload.
			try {
				storage.removeItem(STORAGE_KEY);
			} catch {
				/* noop */
			}
			return;
		}

		if (envelope === null || typeof envelope !== 'object' || envelope.version !== ENVELOPE_VERSION) {
			// Schema version mismatch — discard, will be rewritten on next set.
			try {
				storage.removeItem(STORAGE_KEY);
			} catch {
				/* noop */
			}
			return;
		}

		const entries = envelope.entries;
		if (typeof entries !== 'object' || entries === null) return;
		for (const [key, entry] of Object.entries(entries)) {
			if (isCachedForecast(entry)) persisted.set(key, entry);
		}
	}

	function serialize(entries: Map<string, CachedForecast>): string {
		return JSON.stringify({ version: ENVELOPE_VERSION, entries: Object.fromEntries(entries) });
	}

	function writePersisted(): void {
		if (persistentDisabled) return;

		if (persisted.size === 0) {
			try {
				storage.removeItem(STORAGE_KEY);
			} catch {
				/* noop */
			}
			return;
		}

		let payload = serialize(persisted);

		// Budget floor: prune oldest-by-fetchedAt until the payload fits our own
		// budget, or there is nothing left to evict.
		if (payload.length > CACHE_BUDGET_BYTES) {
			const sorted = [...persisted.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
			let estimatedSize = payload.length;

			for (const [key, entry] of sorted) {
				if (estimatedSize <= CACHE_BUDGET_BYTES) break;
				persisted.delete(key);
				if (persisted.size === 0) {
					try {
						storage.removeItem(STORAGE_KEY);
					} catch {
						/* noop */
					}
					return;
				}
				const entryLength = JSON.stringify(key).length + 1 + JSON.stringify(entry).length + 1;
				estimatedSize -= entryLength;
			}

			payload = serialize(persisted);
			while (payload.length > CACHE_BUDGET_BYTES && persisted.size > 0) {
				persisted = pruneOldest(persisted);
				if (persisted.size === 0) {
					try {
						storage.removeItem(STORAGE_KEY);
					} catch {
						/* noop */
					}
					return;
				}
				payload = serialize(persisted);
			}
		}

		while (true) {
			if (persisted.size === 0) {
				try {
					storage.removeItem(STORAGE_KEY);
				} catch {
					/* noop */
				}
				return;
			}
			try {
				storage.setItem(STORAGE_KEY, payload);
				return;
			} catch (error) {
				if (!isQuotaExceeded(error)) {
					persistentDisabled = true;
					warnOnce('forecast cache: persistent layer disabled');
					return;
				}
				// Storage quota exceeded — evict oldest and retry until it fits.
				persisted = pruneOldest(persisted);
				if (persisted.size === 0) {
					persistentDisabled = true;
					warnOnce('forecast cache: persistent layer disabled');
					try {
						storage.removeItem(STORAGE_KEY);
					} catch {
						/* noop */
					}
					return;
				}
				payload = serialize(persisted);
			}
		}
	}

	function pruneOldest(entries: Map<string, CachedForecast>): Map<string, CachedForecast> {
		if (entries.size === 0) return entries;
		const oldestKey = [...entries.entries()].reduce((oldest, current) =>
			current[1].fetchedAt < oldest[1].fetchedAt ? current : oldest
		)[0];
		const next = new Map(entries);
		next.delete(oldestKey);
		return next;
	}

	function capRuntime(): void {
		while (runtime.size > RUNTIME_CACHE_CAP) {
			runtime.delete(runtime.keys().next().value as string);
		}
	}

	function touchRuntime(key: string): void {
		const entry = runtime.get(key);
		if (entry === undefined) return;
		runtime.delete(key);
		runtime.set(key, entry);
		capRuntime();
	}

	readPersisted();

	return {
		get(key: string): CachedForecast | null {
			const hit = runtime.get(key);
			if (hit !== undefined) {
				touchRuntime(key);
				return hit;
			}
			if (persisted.has(key)) {
				const entry = persisted.get(key)!;
				runtime.set(key, entry);
				capRuntime();
				return entry;
			}
			return null;
		},

		set(key: string, entry: CachedForecast): void {
			runtime.delete(key);
			runtime.set(key, entry);
			capRuntime();

			if (persistentDisabled) return;
			let next = new Map(persisted);
			next.set(key, entry);
			while (next.size > MAX_CACHED_CITIES) {
				next = pruneOldest(next);
			}
			persisted = next;
			writePersisted();
		},

		remove(key: string): void {
			runtime.delete(key);
			if (persistentDisabled) return;
			if (!persisted.has(key)) return;
			persisted = new Map(persisted);
			persisted.delete(key);
			writePersisted();
		},

		clear(): void {
			runtime.clear();
			persisted = new Map();
			if (persistentDisabled) return;
			try {
				storage.removeItem(STORAGE_KEY);
			} catch {
				persistentDisabled = true;
				warnOnce('forecast cache: persistent layer disabled');
			}
		}
	};
}
