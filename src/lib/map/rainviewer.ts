import type { Location } from '../types';
import type { RadarFrame, RainViewerApiResponse } from './types';

export const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';

export const UNSUPPORTED_RADAR_COUNTRY_CODES = new Set(['RU', 'BY']);

export const UNSUPPORTED_RADAR_TIMEZONES = new Set([
	'Europe/Moscow',
	'Europe/Kaliningrad',
	'Europe/Samara',
	'Europe/Volgograd',
	'Europe/Kirov',
	'Europe/Astrakhan',
	'Europe/Ulyanovsk',
	'Europe/Saratov',
	'Asia/Yekaterinburg',
	'Asia/Omsk',
	'Asia/Novosibirsk',
	'Asia/Barnaul',
	'Asia/Tomsk',
	'Asia/Novokuznetsk',
	'Asia/Krasnoyarsk',
	'Asia/Irkutsk',
	'Asia/Chita',
	'Asia/Yakutsk',
	'Asia/Khandyga',
	'Asia/Vladivostok',
	'Asia/Ust-Nera',
	'Asia/Magadan',
	'Asia/Sakhalin',
	'Asia/Srednekolymsk',
	'Asia/Kamchatka',
	'Asia/Anadyr',
	'Europe/Minsk'
]);

const UNSUPPORTED_COUNTRY_NAMES = new Set([
	'russia',
	'россия',
	'russian federation',
	'российская федерация',
	'рф',
	'belarus',
	'беларусь',
	'белоруссия',
	'republic of belarus'
]);

/**
 * Checks whether live Doppler weather radar tiles are supported for the given location.
 * RainViewer stopped collecting and serving radar data for Russia and Belarus.
 */
export function isRadarSupported(location: Location | null | undefined): boolean {
	if (!location) return false;
	if (
		location.countryCode &&
		UNSUPPORTED_RADAR_COUNTRY_CODES.has(location.countryCode.toUpperCase())
	) {
		return false;
	}
	if (location.country && UNSUPPORTED_COUNTRY_NAMES.has(location.country.trim().toLowerCase())) {
		return false;
	}
	if (location.timezone && UNSUPPORTED_RADAR_TIMEZONES.has(location.timezone)) {
		return false;
	}
	return true;
}

export interface RadarTileOptions {
	size?: 256 | 512;
	colorScheme?: number; // 1: original, 2: universal blue, 3: TITAN, 4: The Weather Channel, 5: Meteored, 6: NEXRAD, 7: Rainbow, 8: Dark Sky
	smooth?: boolean; // 1 or 0
	snow?: boolean; // 1 or 0
}

// RainViewer serves radar tiles only for zoom levels 0–7; higher zooms return
// a "Zoom Level Not Supported" placeholder image. 512 px tiles at z0–7 give
// one extra level of detail when overzoomed by the map.
export const RADAR_MAX_ZOOM = 7;

/**
 * Builds standard RainViewer raster tile URL template for MapLibre / Leaflet.
 */
export function getRadarTileUrl(
	host: string,
	path: string,
	options: RadarTileOptions = {}
): string {
	const size = options.size ?? 512;
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
	fetchFn: typeof fetch = fetch,
	timeoutMs = 8000
): Promise<{ host: string; frames: RadarFrame[] }> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetchFn(RAINVIEWER_API_URL, {
			headers: { Accept: 'application/json' },
			signal: controller.signal
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
	} finally {
		clearTimeout(timer);
	}
}
export type { RadarFrame, RainViewerApiResponse };
