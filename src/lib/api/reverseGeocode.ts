// Best-effort client-side reverse geocoding via BigDataCloud's free keyless
// API. Any failure (network, timeout, non-2xx, empty result) yields null and
// the caller keeps the generic "My location" label.
export const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

export interface ResolvedPlace {
	name: string;
	admin1?: string;
	country?: string;
	countryCode?: string;
}

interface ReverseGeocodeResponse {
	city?: string;
	locality?: string;
	principalSubdivision?: string;
	countryName?: string;
	countryCode?: string;
}

export async function reverseGeocode(
	latitude: number,
	longitude: number,
	language: string = 'en',
	timeoutMs = 4000,
	fetchFn: typeof fetch = fetch
): Promise<ResolvedPlace | null> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const url = `${REVERSE_GEOCODE_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=${encodeURIComponent(language)}`;
		const res = await fetchFn(url, {
			headers: { Accept: 'application/json' },
			signal: controller.signal
		});
		if (!res.ok) return null;
		const data = (await res.json()) as ReverseGeocodeResponse;
		const name = data.city || data.locality || data.principalSubdivision;
		if (!name) return null;
		return {
			name,
			admin1: data.principalSubdivision || undefined,
			country: data.countryName || undefined,
			countryCode: data.countryCode || undefined
		};
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
