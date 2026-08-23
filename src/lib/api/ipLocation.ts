export interface IpCityLookup {
	latitude: number;
	longitude: number;
	city: string;
	countryCode: string;
	timezone: string;
}

const PROVIDERS = ['https://ipwho.is/', 'https://get.geojs.io/v1/ip/geo.json'] as const;
// Manual AbortController instead of AbortSignal.timeout: the latter is missing
// on iOS < 16.4 and threw synchronously, silently disabling IP detection.
const TIMEOUT_MS = 5000;

function isValidIpwho(
	value: unknown
): value is {
	city: string;
	country_code: string;
	latitude: number;
	longitude: number;
	timezone?: { id?: string };
} {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	return (
		entry['success'] === true &&
		typeof entry['city'] === 'string' &&
		entry['city'] !== '' &&
		typeof entry['country_code'] === 'string' &&
		typeof entry['latitude'] === 'number' &&
		Number.isFinite(entry['latitude']) &&
		typeof entry['longitude'] === 'number' &&
		Number.isFinite(entry['longitude'])
	);
}

function normalizeIpwho(value: unknown): IpCityLookup | null {
	if (!isValidIpwho(value)) return null;
	return {
		latitude: value.latitude,
		longitude: value.longitude,
		city: value.city,
		countryCode: value.country_code,
		timezone: value.timezone?.id ?? ''
	};
}

// geojs.io returns coordinates as strings.
function normalizeGeojs(value: unknown): IpCityLookup | null {
	if (typeof value !== 'object' || value === null) return null;
	const entry = value as Record<string, unknown>;
	const latitude = Number(entry['latitude']);
	const longitude = Number(entry['longitude']);
	if (
		typeof entry['city'] !== 'string' ||
		entry['city'] === '' ||
		typeof entry['country_code'] !== 'string' ||
		!Number.isFinite(latitude) ||
		!Number.isFinite(longitude)
	) {
		return null;
	}
	return {
		latitude,
		longitude,
		city: entry['city'],
		countryCode: entry['country_code'],
		timezone: typeof entry['timezone'] === 'string' ? entry['timezone'] : ''
	};
}

async function fetchJson(url: string): Promise<unknown | null> {
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const res = await fetch(url, { signal: controller.signal });
			if (!res.ok) return null;
			return await res.json();
		} finally {
			clearTimeout(timer);
		}
	} catch {
		return null;
	}
}

// Best-effort first-launch city detection by IP (keyless, HTTPS providers).
// Any failure → null; the caller silently keeps the default location.
// Never throws. Timezone gets no default here: the correct fallback is the
// device timezone in the location store, not UTC.
export async function lookupCityByIp(): Promise<IpCityLookup | null> {
	const primary = normalizeIpwho(await fetchJson(PROVIDERS[0]));
	if (primary) return primary;
	return normalizeGeojs(await fetchJson(PROVIDERS[1]));
}
