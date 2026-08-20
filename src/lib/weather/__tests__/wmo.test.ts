import { describe, expect, it } from 'vitest';
import { getWeatherVisual } from '../wmo';

const ALL_WMO_CODES = [
	0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82,
	85, 86, 95, 96, 99
];

describe('getWeatherVisual', () => {
	it('returns a complete visual for every WMO code Open-Meteo can return in both languages', () => {
		for (const code of ALL_WMO_CODES) {
			const visualEn = getWeatherVisual(code, 'en');
			expect(visualEn.code).toBe(code);
			expect(visualEn.labelEn).not.toBe('Unknown');
			expect(visualEn.labelEn.length).toBeGreaterThan(0);
			expect(visualEn.shortLabelEn.length).toBeGreaterThan(0);
			expect(visualEn.label).toBe(visualEn.labelEn);
			expect(visualEn.shortLabel).toBe(visualEn.shortLabelEn);
			expect(visualEn.iconDay.length).toBeGreaterThan(0);
			expect(visualEn.iconNight.length).toBeGreaterThan(0);

			const visualRu = getWeatherVisual(code, 'ru');
			expect(visualRu.labelRu).not.toBe('Неизвестно');
			expect(visualRu.labelRu.length).toBeGreaterThan(0);
			expect(visualRu.shortLabelRu.length).toBeGreaterThan(0);
			expect(visualRu.label).toBe(visualRu.labelRu);
			expect(visualRu.shortLabel).toBe(visualRu.shortLabelRu);
		}
	});

	it('defaults to English when lang is omitted', () => {
		const visual = getWeatherVisual(0);
		expect(visual.label).toBe('Clear sky');
		expect(visual.shortLabel).toBe('Clear');
		expect(visual.labelRu).toBe('Ясно');
		expect(visual.labelEn).toBe('Clear sky');
	});

	it('maps exact human Russian labels for spot-checked codes', () => {
		expect(getWeatherVisual(0, 'ru').label).toBe('Ясно');
		expect(getWeatherVisual(2, 'ru').label).toBe('Переменная облачность');
		expect(getWeatherVisual(61, 'ru').label).toBe('Небольшой дождь');
		expect(getWeatherVisual(95, 'ru').label).toBe('Гроза');
	});

	it('maps exact human English labels for spot-checked codes', () => {
		expect(getWeatherVisual(0, 'en').label).toBe('Clear sky');
		expect(getWeatherVisual(2, 'en').label).toBe('Partly cloudy');
		expect(getWeatherVisual(61, 'en').label).toBe('Slight rain');
		expect(getWeatherVisual(95, 'en').label).toBe('Thunderstorm');
	});

	it('distinguishes intensity levels within rain and snow groups', () => {
		expect(getWeatherVisual(63, 'ru').labelRu).toBe('Дождь');
		expect(getWeatherVisual(65, 'ru').labelRu).toBe('Сильный дождь');
		expect(getWeatherVisual(71, 'ru').labelRu).toBe('Небольшой снег');
		expect(getWeatherVisual(75, 'ru').labelRu).toBe('Сильный снег');

		expect(getWeatherVisual(63, 'en').labelEn).toBe('Moderate rain');
		expect(getWeatherVisual(65, 'en').labelEn).toBe('Heavy rain');
		expect(getWeatherVisual(71, 'en').labelEn).toBe('Slight snow fall');
		expect(getWeatherVisual(75, 'en').labelEn).toBe('Heavy snow fall');
	});

	it('returns day and night icon variants that differ for at least one code', () => {
		const differing = ALL_WMO_CODES.filter(
			(code) => getWeatherVisual(code).iconDay !== getWeatherVisual(code).iconNight
		);
		expect(differing.length).toBeGreaterThan(0);
	});

	it('shortLabel is never longer than label', () => {
		for (const code of ALL_WMO_CODES) {
			const vRu = getWeatherVisual(code, 'ru');
			expect(vRu.shortLabelRu.length).toBeLessThanOrEqual(vRu.labelRu.length);
			expect(vRu.shortLabel.length).toBeLessThanOrEqual(vRu.label.length);

			const vEn = getWeatherVisual(code, 'en');
			expect(vEn.shortLabelEn.length).toBeLessThanOrEqual(vEn.labelEn.length);
			expect(vEn.shortLabel.length).toBeLessThanOrEqual(vEn.label.length);
		}
	});

	it('falls back to a safe visual for unknown codes without throwing', () => {
		const visualEn = getWeatherVisual(999, 'en');
		expect(visualEn.code).toBe(999);
		expect(visualEn.label).toBe('Unknown');
		expect(visualEn.labelEn).toBe('Unknown');
		expect(visualEn.labelRu).toBe('Неизвестно');
		expect(visualEn.iconDay.length).toBeGreaterThan(0);
		expect(visualEn.iconNight.length).toBeGreaterThan(0);

		const visualRu = getWeatherVisual(999, 'ru');
		expect(visualRu.label).toBe('Неизвестно');
	});
});
