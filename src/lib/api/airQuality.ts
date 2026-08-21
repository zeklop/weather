import type { AirQualityData, PollenLevels, Pollutants } from '$lib/types';

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const TIMEOUT_MS = 8000;

export const AIR_QUALITY_FIELDS = [
	'european_aqi',
	'pm10',
	'pm2_5',
	'carbon_monoxide',
	'nitrogen_dioxide',
	'sulphur_dioxide',
	'ozone',
	'alder_pollen',
	'birch_pollen',
	'grass_pollen',
	'mugwort_pollen',
	'olive_pollen',
	'ragweed_pollen'
].join(',');

function numOrNull(val: unknown): number | null {
	return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

/**
 * Extracts the current European AQI value from an Open-Meteo air-quality response.
 */
export function normalizeAirQuality(raw: unknown): number | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const current = (raw as Record<string, unknown>)['current'];
	if (typeof current !== 'object' || current === null) return null;
	const aqi = (current as Record<string, unknown>)['european_aqi'];
	return numOrNull(aqi);
}

/**
 * Normalizes a full Open-Meteo Air Quality API response into structured pollutants & pollen data.
 */
export function normalizeDetailedAirQuality(raw: unknown): AirQualityData | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const current = (raw as Record<string, unknown>)['current'];
	if (typeof current !== 'object' || current === null) return null;

	const c = current as Record<string, unknown>;
	const aqi = numOrNull(c['european_aqi']);

	const pollutants: Pollutants = {
		pm2_5: numOrNull(c['pm2_5']),
		pm10: numOrNull(c['pm10']),
		nitrogenDioxide: numOrNull(c['nitrogen_dioxide']),
		sulphurDioxide: numOrNull(c['sulphur_dioxide']),
		ozone: numOrNull(c['ozone']),
		carbonMonoxide: numOrNull(c['carbon_monoxide'])
	};

	const pollen: PollenLevels = {
		alder: numOrNull(c['alder_pollen']),
		birch: numOrNull(c['birch_pollen']),
		grass: numOrNull(c['grass_pollen']),
		mugwort: numOrNull(c['mugwort_pollen']),
		olive: numOrNull(c['olive_pollen']),
		ragweed: numOrNull(c['ragweed_pollen'])
	};

	// CAMS coverage test: at least one pollen field is a finite number (can be 0)
	const hasPollenCoverage = Object.values(pollen).some((v) => v !== null);

	return {
		aqi,
		pollutants,
		pollen,
		hasPollenCoverage
	};
}

/**
 * Best-effort current AQI lookup (returns number | null).
 */
export async function getAirQuality(
	latitude: number,
	longitude: number,
	externalSignal?: AbortSignal
): Promise<number | null> {
	const data = await getDetailedAirQuality(latitude, longitude, externalSignal);
	return data?.aqi ?? null;
}

/**
 * Best-effort detailed Air Quality and Pollen lookup.
 * Resolves to null on network failure, timeout, or invalid format.
 */
export async function getDetailedAirQuality(
	latitude: number,
	longitude: number,
	externalSignal?: AbortSignal
): Promise<AirQualityData | null> {
	if (externalSignal?.aborted) return null;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	const onExternalAbort = () => controller.abort();
	externalSignal?.addEventListener('abort', onExternalAbort);

	try {
		const params = new URLSearchParams({
			latitude: String(latitude),
			longitude: String(longitude),
			current: AIR_QUALITY_FIELDS
		});
		const res = await fetch(`${AIR_QUALITY_URL}?${params.toString()}`, {
			signal: controller.signal
		});
		if (!res.ok) return null;
		return normalizeDetailedAirQuality(await res.json());
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
		externalSignal?.removeEventListener('abort', onExternalAbort);
	}
}
