const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const TIMEOUT_MS = 8000;

/**
 * Extracts the current European AQI value from an Open-Meteo air-quality response.
 */
export function normalizeAirQuality(raw: unknown): number | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const current = (raw as Record<string, unknown>)['current'];
	if (typeof current !== 'object' || current === null) return null;
	const aqi = (current as Record<string, unknown>)['european_aqi'];
	return typeof aqi === 'number' && Number.isFinite(aqi) ? aqi : null;
}

/**
 * Best-effort current AQI lookup. Any failure (network, timeout, malformed)
 * resolves to null so the UI can show a dash instead of an error state.
 */
export async function getAirQuality(
	latitude: number,
	longitude: number,
	externalSignal?: AbortSignal
): Promise<number | null> {
	if (externalSignal?.aborted) return null;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	const onExternalAbort = () => controller.abort();
	externalSignal?.addEventListener('abort', onExternalAbort);

	try {
		const params = new URLSearchParams({
			latitude: String(latitude),
			longitude: String(longitude),
			current: 'european_aqi'
		});
		const res = await fetch(`${AIR_QUALITY_URL}?${params.toString()}`, {
			signal: controller.signal
		});
		if (!res.ok) return null;
		return normalizeAirQuality(await res.json());
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
		externalSignal?.removeEventListener('abort', onExternalAbort);
	}
}
