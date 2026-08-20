import { describe, expect, it } from 'vitest';
import { getWeatherVisual } from '../wmo';

const ALL_WMO_CODES = [
	0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82,
	85, 86, 95, 96, 99
];

describe('getWeatherVisual', () => {
	it('returns a complete visual for every WMO code Open-Meteo can return', () => {
		for (const code of ALL_WMO_CODES) {
			const visual = getWeatherVisual(code);
			expect(visual.code).toBe(code);
			expect(visual.labelRu).not.toBe('Неизвестно');
			expect(visual.labelRu.length).toBeGreaterThan(0);
			expect(visual.shortLabelRu.length).toBeGreaterThan(0);
			expect(visual.iconDay.length).toBeGreaterThan(0);
			expect(visual.iconNight.length).toBeGreaterThan(0);
		}
	});

	it('maps exact human Russian labels for spot-checked codes', () => {
		expect(getWeatherVisual(0).labelRu).toBe('Ясно');
		expect(getWeatherVisual(2).labelRu).toBe('Переменная облачность');
		expect(getWeatherVisual(61).labelRu).toBe('Небольшой дождь');
		expect(getWeatherVisual(95).labelRu).toBe('Гроза');
	});

	it('distinguishes intensity levels within rain and snow groups', () => {
		expect(getWeatherVisual(63).labelRu).toBe('Дождь');
		expect(getWeatherVisual(65).labelRu).toBe('Сильный дождь');
		expect(getWeatherVisual(71).labelRu).toBe('Небольшой снег');
		expect(getWeatherVisual(75).labelRu).toBe('Сильный снег');
	});

	it('returns day and night icon variants that differ for at least one code', () => {
		const differing = ALL_WMO_CODES.filter(
			(code) => getWeatherVisual(code).iconDay !== getWeatherVisual(code).iconNight
		);
		expect(differing.length).toBeGreaterThan(0);
	});

	it('shortLabelRu is never longer than labelRu', () => {
		for (const code of ALL_WMO_CODES) {
			const visual = getWeatherVisual(code);
			expect(visual.shortLabelRu.length).toBeLessThanOrEqual(visual.labelRu.length);
		}
	});

	it('falls back to a safe visual for unknown codes without throwing', () => {
		const visual = getWeatherVisual(999);
		expect(visual.code).toBe(999);
		expect(visual.labelRu).toBe('Неизвестно');
		expect(visual.iconDay.length).toBeGreaterThan(0);
		expect(visual.iconNight.length).toBeGreaterThan(0);
	});
});