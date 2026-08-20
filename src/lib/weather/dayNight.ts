import type { DayResult } from '../types';

const HOUR_RE = /T(\d{2}:\d{2})/;

const FALLBACK_START = 7 * 60;
const FALLBACK_END = 19 * 60;

// Wall-time HH:MM only, per the format.ts contract: never parse these strings
// with `new Date` — the date part is irrelevant and tz math is wrong here.
function minutesFromMidnight(isoWallTime: string): number {
	const match = HOUR_RE.exec(isoWallTime);
	if (!match) return 0;
	const [h, m] = match[1].split(':').map(Number);
	return (h || 0) * 60 + (m || 0);
}

/**
 * Day/night for wall-time in the location tz. Compares HH:MM only; sunrise or
 * sunset missing (polar day/night, provider gap) → fixed 07:00–19:00 window.
 */
export function isDay(at: string, sunrise: string | null, sunset: string | null): DayResult {
	if (!sunrise || !sunset) {
		const t = minutesFromMidnight(at);
		return { isDay: t >= FALLBACK_START && t < FALLBACK_END, source: 'fallback' };
	}

	const t = minutesFromMidnight(at);
	const r = minutesFromMidnight(sunrise);
	const s = minutesFromMidnight(sunset);

	let isDayValue: boolean;
	if (r === s) {
		isDayValue = true;
	} else if (r < s) {
		isDayValue = t >= r && t <= s;
	} else {
		// Day spans midnight (high latitudes): before sunrise or after sunset.
		isDayValue = t >= r || t <= s;
	}
	return { isDay: isDayValue, source: 'calculated' };
}
