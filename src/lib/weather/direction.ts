import type { Language } from '$lib/i18n/translations';

const DIRECTIONS_RU = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'] as const;
const DIRECTIONS_EN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
const SECTOR = 360 / 8;

function normalizeDegrees(degrees: number): number {
	return ((degrees % 360) + 360) % 360;
}

/**
 * Compass label for wind direction (direction the wind blows FROM), 8 points in EN or RU.
 */
export function formatWindDirection(degrees: number, lang: Language = 'en'): string {
	// Round to the nearest 45° sector, north-centered at 0°/360°.
	const sectorIndex = Math.floor((normalizeDegrees(degrees) + SECTOR / 2) / SECTOR) % 8;
	return lang === 'ru' ? DIRECTIONS_RU[sectorIndex] : DIRECTIONS_EN[sectorIndex];
}

/**
 * Backward compatibility alias for formatWindDirection.
 */
export function windDirectionLabel(degrees: number, lang: Language = 'en'): string {
	return formatWindDirection(degrees, lang);
}

// Rotation angle (deg, clockwise) for an up-pointing arrow glyph so it shows
// the direction the wind blows TO: from-direction + 180, normalized.
export function windDirectionAngle(degrees: number): number {
	return (normalizeDegrees(degrees) + 180) % 360;
}
