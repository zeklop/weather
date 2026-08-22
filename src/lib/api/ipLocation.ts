export interface IpCityLookup {
	latitude: number;
	longitude: number;
	city: string;
	countryCode: string;
	timezone: string;
}

const ENDPOINT = 'https://ipwho.is/';
const TIMEOUT_MS = 3000;

function isValid(
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

// Best-effort first-launch city detection by IP (ipwho.is — keyless, HTTPS).
// Any failure → null; the caller silently keeps the default location.
// Never throws. Timezone gets no default here: the correct fallback is the
// device timezone in the location store, not UTC.
export async function lookupCityByIp(): Promise<IpCityLookup | null> {
	try {
		const res = await fetch(ENDPOINT, { signal: AbortSignal.timeout(TIMEOUT_MS) });
		if (!res.ok) return null;
		const data: unknown = await res.json();
		if (!isValid(data)) return null;
		return {
			latitude: data.latitude,
			longitude: data.longitude,
			city: data.city,
			countryCode: data.country_code,
			timezone: data.timezone?.id ?? ''
		};
	} catch {
		return null;
	}
}
