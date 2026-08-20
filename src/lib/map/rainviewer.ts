import type { RadarFrame, RainViewerApiResponse } from './types';

export const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';

export interface RadarTileOptions {
	size?: 256 | 512;
	colorScheme?: number; // 1: original, 2: universal blue, 3: TITAN, 4: The Weather Channel, 5: Meteored, 6: NEXRAD, 7: Rainbow, 8: Dark Sky
	smooth?: boolean; // 1 or 0
	snow?: boolean; // 1 or 0
}

/**
 * Builds standard RainViewer raster tile URL template for MapLibre / Leaflet.
 */
export function getRadarTileUrl(
	host: string,
	path: string,
	options: RadarTileOptions = {}
): string {
	const size = options.size ?? 256;
	const color = options.colorScheme ?? 2;
	const smooth = options.smooth === false ? 0 : 1;
	const snow = options.snow === false ? 0 : 1;

	// RainViewer tile format: {host}{path}/{size}/{z}/{x}/{y}/{color}/{smooth}_{snow}.png
	const cleanHost = host.replace(/\/+$/, '');
	const cleanPath = path.startsWith('/') ? path : `/${path}`;
	return `${cleanHost}${cleanPath}/${size}/{z}/{x}/{y}/${color}/${smooth}_${snow}.png`;
}

/**
 * Formats a radar frame Unix timestamp into a readable label (e.g. "Сейчас", "-20 мин", "+10 мин" or "14:20").
 */
export function formatRadarFrameLabel(
	timestampSec: number,
	nowMs: number = Date.now(),
	lang: 'ru' | 'en' = 'ru'
): string {
	const frameMs = timestampSec * 1000;
	const diffMinutes = Math.round((frameMs - nowMs) / 60000);

	if (Math.abs(diffMinutes) <= 3) {
		return lang === 'ru' ? 'Сейчас' : 'Now';
	}

	if (diffMinutes < 0) {
		const mins = Math.abs(diffMinutes);
		return lang === 'ru' ? `-${mins} мин` : `-${mins}m`;
	} else {
		return lang === 'ru' ? `+${diffMinutes} мин` : `+${diffMinutes}m`;
	}
}

/**
 * Fetches current radar frames metadata from RainViewer public API.
 */
export async function fetchRainViewerData(
	fetchFn: typeof fetch = fetch
): Promise<{ host: string; frames: RadarFrame[] }> {
	try {
		const res = await fetchFn(RAINVIEWER_API_URL, {
			headers: { Accept: 'application/json' }
		});
		if (!res.ok) {
			return { host: 'https://tilecache.rainviewer.com', frames: [] };
		}
		const data: RainViewerApiResponse = await res.json();
		const host = data.host || 'https://tilecache.rainviewer.com';
		const nowMs = Date.now();

		const pastFrames: RadarFrame[] = (data.radar?.past ?? []).map((item) => ({
			time: item.time,
			path: item.path,
			tileUrl: getRadarTileUrl(host, item.path),
			label: formatRadarFrameLabel(item.time, nowMs),
			isPast: true,
			isNowcast: false
		}));

		const nowcastFrames: RadarFrame[] = (data.radar?.nowcast ?? []).map((item) => ({
			time: item.time,
			path: item.path,
			tileUrl: getRadarTileUrl(host, item.path),
			label: formatRadarFrameLabel(item.time, nowMs),
			isPast: false,
			isNowcast: true
		}));

		// Combine and sort by time
		const allFrames = [...pastFrames, ...nowcastFrames].sort((a, b) => a.time - b.time);

		return {
			host,
			frames: allFrames
		};
	} catch {
		return { host: 'https://tilecache.rainviewer.com', frames: [] };
	}
}
export type { RadarFrame, RainViewerApiResponse };
