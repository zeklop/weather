import type { MarineData } from '$lib/types';

const MARINE_API_URL = 'https://marine-api.open-meteo.com/v1/marine';
const TIMEOUT_MS = 4000;
const NEGATIVE_CACHE_KEY = 'weather:marine:negative';
const NEGATIVE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory set of negative coords for fast checking
const memoryNegativeCache = new Map<string, number>();

function coordKey(lat: number, lon: number): string {
	return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function isNegativelyCached(lat: number, lon: number): boolean {
	const key = coordKey(lat, lon);
	const now = Date.now();

	// Check memory cache first
	const memTime = memoryNegativeCache.get(key);
	if (memTime && now - memTime < NEGATIVE_CACHE_TTL_MS) {
		return true;
	}

	// Check localStorage
	if (typeof localStorage !== 'undefined') {
		try {
			const raw = localStorage.getItem(NEGATIVE_CACHE_KEY);
			if (raw) {
				const cache = JSON.parse(raw) as Record<string, number>;
				const storedTime = cache[key];
				if (storedTime && now - storedTime < NEGATIVE_CACHE_TTL_MS) {
					memoryNegativeCache.set(key, storedTime);
					return true;
				}
			}
		} catch {
			/* localStorage unavailable */
		}
	}

	return false;
}

function markNegativeCache(lat: number, lon: number): void {
	const key = coordKey(lat, lon);
	const now = Date.now();
	memoryNegativeCache.set(key, now);

	if (typeof localStorage !== 'undefined') {
		try {
			const raw = localStorage.getItem(NEGATIVE_CACHE_KEY);
			const cache: Record<string, number> = raw ? JSON.parse(raw) : {};

			// Clean expired keys
			for (const [k, time] of Object.entries(cache)) {
				if (now - time >= NEGATIVE_CACHE_TTL_MS) {
					delete cache[k];
				}
			}

			cache[key] = now;
			localStorage.setItem(NEGATIVE_CACHE_KEY, JSON.stringify(cache));
		} catch {
			/* localStorage write error */
		}
	}
}

export function normalizeMarine(raw: unknown): MarineData | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const current = (raw as Record<string, unknown>)['current'];
	if (typeof current !== 'object' || current === null) return null;

	const c = current as Record<string, unknown>;
	const seaTemp = typeof c['sea_surface_temperature'] === 'number' && Number.isFinite(c['sea_surface_temperature'])
		? c['sea_surface_temperature']
		: null;
	const waveHeight = typeof c['wave_height'] === 'number' && Number.isFinite(c['wave_height'])
		? c['wave_height']
		: null;

	if (seaTemp === null && waveHeight === null) {
		return null;
	}

	return {
		seaTemperature: seaTemp,
		waveHeight
	};
}

/**
 * Best-effort Marine data lookup with negative caching for inland locations.
 * Resolves to null on network error, HTTP 400 (land coordinates), or timeout.
 */
export async function getMarineData(
	latitude: number,
	longitude: number,
	externalSignal?: AbortSignal
): Promise<MarineData | null> {
	if (externalSignal?.aborted) return null;
	if (isNegativelyCached(latitude, longitude)) return null;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	const onExternalAbort = () => controller.abort();
	externalSignal?.addEventListener('abort', onExternalAbort);

	try {
		const params = new URLSearchParams({
			latitude: String(latitude),
			longitude: String(longitude),
			current: 'sea_surface_temperature,wave_height'
		});
		const res = await fetch(`${MARINE_API_URL}?${params.toString()}`, {
			signal: controller.signal
		});

		if (!res.ok) {
			// Only cache 400 (land coordinates); transient errors (429, 5xx) should retry next time
			if (res.status === 400) {
				markNegativeCache(latitude, longitude);
			}
			return null;
		}

		const data = normalizeMarine(await res.json());
		if (!data || (data.seaTemperature === null && data.waveHeight === null)) {
			markNegativeCache(latitude, longitude);
			return null;
		}

		return data;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
		externalSignal?.removeEventListener('abort', onExternalAbort);
	}
}
