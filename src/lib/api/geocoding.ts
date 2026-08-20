import { DEFAULT_LANGUAGE, type Language } from '../i18n';
import type { Location } from '../types';
import { ForecastApiError } from './openMeteo';

const API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const TIMEOUT_MS = 8000;

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null;
}

function malformed(context: string): ForecastApiError {
	return new ForecastApiError('malformed', `malformed geocoding response: ${context}`);
}

/**
 * Stable local id for a location: rounded coords, matches the forecast cache
 * key convention `forecast:{lat4}:{lon4}` — the cache composes its key from
 * geoId, so favorites and cache share the same rounding.
 */
export function geoId(latitude: number, longitude: number): string {
	return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export function normalizeGeoResults(raw: unknown): Location[] {
	if (!isRecord(raw) || Array.isArray(raw)) throw malformed('root is not an object');

	const results = raw['results'];
	if (results === undefined) {
		// API omits `results` entirely when nothing matched — not an error.
		return [];
	}
	if (!Array.isArray(results)) throw malformed('results is not an array');

	const locations: Location[] = [];
	const seen = new Set<string>();
	for (const entry of results) {
		// Skip a single invalid entry rather than killing the whole search:
		// forecast requires timezone, so entries without it are unusable anyway.
		if (!isRecord(entry)) continue;
		if (typeof entry['name'] !== 'string' || entry['name'] === '') continue;
		if (typeof entry['latitude'] !== 'number' || typeof entry['longitude'] !== 'number') continue;
		if (typeof entry['timezone'] !== 'string' || entry['timezone'] === '') continue;

		const countryCode =
			typeof entry['country_code'] === 'string' ? entry['country_code'] : undefined;
		const admin1 = typeof entry['admin1'] === 'string' ? entry['admin1'] : undefined;
		const country = typeof entry['country'] === 'string' ? entry['country'] : undefined;

		const lat = entry['latitude'];
		const lon = entry['longitude'];
		const dedupeKey = `${entry['name']}:${admin1 ?? ''}:${country ?? ''}:${lat.toFixed(2)}:${lon.toFixed(2)}`;
		if (seen.has(dedupeKey)) continue;
		seen.add(dedupeKey);

		locations.push({
			id: geoId(lat, lon),
			name: entry['name'],
			admin1,
			country,
			countryCode,
			latitude: lat,
			longitude: lon,
			timezone: entry['timezone']
		});
	}
	return locations;
}

export async function searchLocations(
	query: string,
	limit = 8,
	lang: Language = DEFAULT_LANGUAGE
): Promise<Location[]> {
	const name = query.trim();
	if (name === '') return [];

	const params = new URLSearchParams({
		name,
		count: String(limit),
		language: lang,
		format: 'json'
	});

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	let response: Response;
	try {
		response = await fetch(`${API_URL}?${params.toString()}`, { signal: controller.signal });
	} catch (err) {
		if (controller.signal.aborted) {
			throw new ForecastApiError('timeout', `geocoding request timed out after ${TIMEOUT_MS}ms`, {
				cause: err
			});
		}
		throw new ForecastApiError('network', 'geocoding request failed', { cause: err });
	} finally {
		clearTimeout(timer);
	}

	if (!response.ok) {
		throw new ForecastApiError('http', `geocoding request failed with status ${response.status}`, {
			status: response.status
		});
	}

	let raw: unknown;
	try {
		raw = await response.json();
	} catch (err) {
		throw new ForecastApiError('malformed', 'malformed geocoding response: invalid JSON', {
			cause: err
		});
	}

	return normalizeGeoResults(raw);
}
