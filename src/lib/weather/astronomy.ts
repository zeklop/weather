export type MoonPhaseName =
	| 'new_moon'
	| 'waxing_crescent'
	| 'first_quarter'
	| 'waxing_gibbous'
	| 'full_moon'
	| 'waning_gibbous'
	| 'last_quarter'
	| 'waning_crescent';

export type MoonInfo = {
	phase: number; // 0.0 ... 0.999
	phaseName: MoonPhaseName;
	illumination: number; // 0 ... 100 (%)
	daysToFullMoon: number; // approximate days
	daysToNewMoon: number; // approximate days
	isWaxing: boolean;
	isSouthern: boolean;
};

export type SunArcStatus = 'day' | 'before_sunrise' | 'after_sunset' | 'polar_day' | 'polar_night';

export type SunArcInfo = {
	status: SunArcStatus;
	progress: number; // 0.0 ... 1.0 (clamped between sunrise and sunset)
	sunriseMinutes: number | null;
	sunsetMinutes: number | null;
	nowMinutes: number;
	daylightMinutes: number | null;
	minutesToSunset: number | null;
	minutesToSunrise: number | null;
	sunX: number; // 0..100 (%)
	sunY: number; // 0..100 (%)
};

const SYNODIC_MONTH_DAYS = 29.53058867;
const SYNODIC_MONTH_MS = SYNODIC_MONTH_DAYS * 86_400_000;
// Reference epoch: 2000-01-06 18:14 UTC (Known New Moon)
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);

/**
 * Calculates current Moon Phase, illumination percentage and days to next major events.
 * Reference epoch is UTC-based and must be computed from global UTC timestamp `Date.now()`.
 */
export function getMoonInfo(utcTimestampMs: number = Date.now(), latitude = 55.75): MoonInfo {
	const diffMs = utcTimestampMs - KNOWN_NEW_MOON_UTC;
	const cycles = diffMs / SYNODIC_MONTH_MS;
	const normalizedPhase = ((cycles % 1) + 1) % 1; // [0, 1)

	// Illumination percentage from 0 to 100%
	const illumination = Math.round(50 * (1 - Math.cos(2 * Math.PI * normalizedPhase)));

	let phaseName: MoonPhaseName;
	if (normalizedPhase < 0.025 || normalizedPhase >= 0.975) {
		phaseName = 'new_moon';
	} else if (normalizedPhase < 0.225) {
		phaseName = 'waxing_crescent';
	} else if (normalizedPhase < 0.275) {
		phaseName = 'first_quarter';
	} else if (normalizedPhase < 0.475) {
		phaseName = 'waxing_gibbous';
	} else if (normalizedPhase < 0.525) {
		phaseName = 'full_moon';
	} else if (normalizedPhase < 0.725) {
		phaseName = 'waning_gibbous';
	} else if (normalizedPhase < 0.775) {
		phaseName = 'last_quarter';
	} else {
		phaseName = 'waning_crescent';
	}

	const isWaxing = normalizedPhase < 0.5;

	// Approximate days to full moon (phase 0.5) and new moon (phase 0.0 / 1.0)
	const phaseToFull = (0.5 - normalizedPhase + 1) % 1;
	const daysToFullMoon = Math.max(0, Math.round(phaseToFull * SYNODIC_MONTH_DAYS));

	const phaseToNew = (1.0 - normalizedPhase) % 1;
	const daysToNewMoon = Math.max(0, Math.round(phaseToNew * SYNODIC_MONTH_DAYS));

	return {
		phase: normalizedPhase,
		phaseName,
		illumination,
		daysToFullMoon,
		daysToNewMoon,
		isWaxing,
		isSouthern: latitude < 0
	};
}

/**
 * Parses naive wall-time ISO string (e.g. "2026-08-21T05:42" or "2026-08-21T05:42:00")
 * into hours, minutes and total minutes from midnight (0..1439).
 */
export function parseWallMinutes(wallIso: string | null | undefined): number | null {
	if (!wallIso || typeof wallIso !== 'string') return null;
	const tIdx = wallIso.indexOf('T');
	if (tIdx === -1) return null;
	const timePart = wallIso.slice(tIdx + 1);
	const [hStr, mStr] = timePart.split(':');
	const h = Number.parseInt(hStr, 10);
	const m = Number.parseInt(mStr, 10);
	if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
		return null;
	}
	return h * 60 + m;
}

// Months (0-indexed) when the Northern Hemisphere is in winter darkness
const NORTH_WINTER_MONTHS = new Set([10, 11, 0, 1]); // Nov–Feb

/**
 * Infers polar_day vs polar_night when Open-Meteo returns null sunrise/sunset.
 * Uses latitude + month heuristic: above Arctic/Antarctic circle in local winter → polar_night.
 */
function inferPolarStatus(nowWallIso: string, latitude?: number): SunArcStatus {
	if (latitude == null) return 'polar_day'; // no latitude → safe fallback
	const isArctic = Math.abs(latitude) > 63; // slightly below 66.5° to cover subpolar twilight gaps
	if (!isArctic) return 'polar_day';

	// Extract month from wall-time ISO string (YYYY-MM-DDT...)
	const month = Number.parseInt(nowWallIso.slice(5, 7), 10) - 1; // 0-indexed
	if (Number.isNaN(month)) return 'polar_day';

	const isNorthernWinter = NORTH_WINTER_MONTHS.has(month);
	const inNorth = latitude > 0;
	// Northern hemisphere + northern winter months → polar night
	// Southern hemisphere + southern winter months (May–Aug = NOT in NORTH_WINTER) → polar night
	if ((inNorth && isNorthernWinter) || (!inNorth && !isNorthernWinter)) {
		return 'polar_night';
	}
	return 'polar_day';
}

/**
 * Computes Sun Arc geometry, progression and status from naive wall times.
 * Sunrise and sunset are interpreted in the city's timezone wall-time.
 */
export function getSunArcInfo(
	sunriseIso: string | null,
	sunsetIso: string | null,
	nowWallIso: string,
	latitude?: number
): SunArcInfo {
	const nowMinutes = parseWallMinutes(nowWallIso) ?? 0;
	const sunriseMinutes = parseWallMinutes(sunriseIso);
	const sunsetMinutes = parseWallMinutes(sunsetIso);

	// Polar Day or Polar Night (sunrise/sunset is null or empty)
	if (sunriseMinutes === null || sunsetMinutes === null) {
		const status = inferPolarStatus(nowWallIso, latitude);
		return {
			status,
			progress: status === 'polar_day' ? 0.5 : 0,
			sunriseMinutes: null,
			sunsetMinutes: null,
			nowMinutes,
			daylightMinutes: null,
			minutesToSunset: null,
			minutesToSunrise: null,
			sunX: status === 'polar_day' ? 50 : 50,
			sunY: status === 'polar_day' ? 20 : 80
		};
	}

	let daylightMinutes = sunsetMinutes - sunriseMinutes;
	if (daylightMinutes < 0) {
		// Sunset is on the next calendar day in extreme subpolar cases
		daylightMinutes += 1440;
	}

	let status: SunArcStatus;
	let progress: number;
	let minutesToSunset: number | null = null;
	let minutesToSunrise: number | null = null;

	if (nowMinutes >= sunriseMinutes && nowMinutes <= sunsetMinutes) {
		status = 'day';
		progress = daylightMinutes > 0 ? (nowMinutes - sunriseMinutes) / daylightMinutes : 0.5;
		minutesToSunset = sunsetMinutes - nowMinutes;
	} else if (nowMinutes < sunriseMinutes) {
		status = 'before_sunrise';
		progress = 0;
		minutesToSunrise = sunriseMinutes - nowMinutes;
	} else {
		status = 'after_sunset';
		progress = 1;
		minutesToSunrise = 1440 - nowMinutes + sunriseMinutes;
	}

	// Calculate (x, y) on a symmetrical parabolic/semicircle arc:
	// x spans from 10% to 90% (80% total width)
	// y follows a sine arch from 80% (horizon) to 20% (zenith)
	const clampedProgress = Math.max(0, Math.min(1, progress));
	const sunX = 10 + clampedProgress * 80;
	const sunY = 80 - Math.sin(clampedProgress * Math.PI) * 60;

	return {
		status,
		progress: clampedProgress,
		sunriseMinutes,
		sunsetMinutes,
		nowMinutes,
		daylightMinutes,
		minutesToSunset,
		minutesToSunrise,
		sunX: Math.round(sunX * 10) / 10,
		sunY: Math.round(sunY * 10) / 10
	};
}

/**
 * Formats a duration in minutes into a localized compact string (e.g. "3h 25m" / "3 ч 25 мин").
 */
export function formatDurationMinutes(minutes: number, lang: 'en' | 'ru' = 'en'): string {
	const safeMinutes = Math.max(0, Math.round(minutes));
	const h = Math.floor(safeMinutes / 60);
	const m = safeMinutes % 60;
	if (h > 0) {
		return lang === 'ru' ? `${h} ч ${m} мин` : `${h}h ${m}m`;
	}
	return lang === 'ru' ? `${m} мин` : `${m}m`;
}

