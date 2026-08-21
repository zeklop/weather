import type { PollenLevels, Pollutants } from '$lib/types';

export type AqiCategory = 'good' | 'fair' | 'moderate' | 'poor' | 'very_poor' | 'hazardous';
export type MetricCategory = 'good' | 'moderate' | 'high' | 'very_high';
export type PollenCategory = 'none' | 'low' | 'moderate' | 'high' | 'very_high';

export type DominantAllergen = {
	key: keyof PollenLevels;
	value: number;
	category: PollenCategory;
};

/**
 * Returns European AQI classification category (0..100+).
 */
export function getAqiCategory(aqi: number | null): AqiCategory | null {
	if (aqi === null || !Number.isFinite(aqi)) return null;
	if (aqi <= 20) return 'good';
	if (aqi <= 40) return 'fair';
	if (aqi <= 60) return 'moderate';
	if (aqi <= 80) return 'poor';
	if (aqi <= 100) return 'very_poor';
	return 'hazardous';
}

/**
 * Returns category color for an AQI category.
 */
export function getAqiColor(category: AqiCategory | null): string {
	switch (category) {
		case 'good':
			return '#10B981'; // emerald
		case 'fair':
			return '#84CC16'; // lime
		case 'moderate':
			return '#EAB308'; // yellow
		case 'poor':
			return '#F97316'; // orange
		case 'very_poor':
			return '#EF4444'; // red
		case 'hazardous':
			return '#A855F7'; // purple
		default:
			return 'var(--text-secondary)';
	}
}

/**
 * Evaluates individual air pollutants according to WHO guidelines & EU thresholds.
 */
export function getPollutantCategory(
	type: keyof Pollutants,
	value: number | null
): MetricCategory | null {
	if (value === null || !Number.isFinite(value)) return null;

	switch (type) {
		case 'pm2_5':
			if (value <= 15) return 'good';
			if (value <= 25) return 'moderate';
			if (value <= 50) return 'high';
			return 'very_high';
		case 'pm10':
			if (value <= 45) return 'good';
			if (value <= 80) return 'moderate';
			if (value <= 120) return 'high';
			return 'very_high';
		case 'nitrogenDioxide':
			if (value <= 25) return 'good';
			if (value <= 50) return 'moderate';
			if (value <= 100) return 'high';
			return 'very_high';
		case 'ozone':
			if (value <= 60) return 'good';
			if (value <= 100) return 'moderate';
			if (value <= 160) return 'high';
			return 'very_high';
		case 'sulphurDioxide':
			if (value <= 40) return 'good';
			if (value <= 80) return 'moderate';
			if (value <= 150) return 'high';
			return 'very_high';
		case 'carbonMonoxide': // Open-Meteo returns µg/m³ (4000 µg/m³ = 4 mg/m³)
			if (value <= 4000) return 'good';
			if (value <= 9000) return 'moderate';
			if (value <= 15000) return 'high';
			return 'very_high';
		default:
			return 'good';
	}
}

/**
 * Evaluates pollen grain concentrations (grains/m³).
 */
export function getPollenCategory(value: number | null): PollenCategory | null {
	if (value === null || !Number.isFinite(value)) return null;
	if (value === 0) return 'none';
	if (value <= 10) return 'low';
	if (value <= 50) return 'moderate';
	if (value <= 200) return 'high';
	return 'very_high';
}

/**
 * Finds dominant active allergen if any reaches Moderate or above level.
 */
export function getDominantAllergen(pollen: PollenLevels): DominantAllergen | null {
	let maxKey: keyof PollenLevels | null = null;
	let maxValue = 0;

	for (const [k, v] of Object.entries(pollen)) {
		if (typeof v === 'number' && v > maxValue) {
			maxValue = v;
			maxKey = k as keyof PollenLevels;
		}
	}

	// Only return as dominant if it reaches moderate threshold (11+ grains/m³)
	if (maxKey && maxValue > 10) {
		const category = getPollenCategory(maxValue) ?? 'moderate';
		return {
			key: maxKey,
			value: maxValue,
			category
		};
	}

	return null;
}
