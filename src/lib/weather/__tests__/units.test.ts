import { describe, expect, it } from 'vitest';
import {
	DEFAULT_UNITS,
	formatMmhg,
	formatPrecipMm,
	formatPressure,
	formatTemp,
	formatWind,
	formatWindSpeed,
	hpaToMmhg
} from '../units';

describe('hpaToMmhg', () => {
	it('converts standard pressure 1013.25 hPa to ~760 mmHg', () => {
		expect(hpaToMmhg(1013.25)).toBeCloseTo(760, 5);
	});

	it('converts 750 hPa to ~562.55 mmHg', () => {
		expect(hpaToMmhg(750)).toBeCloseTo(562.54626225, 5);
	});
});

describe('formatTemp', () => {
	it('formats positive with explicit plus sign', () => {
		expect(formatTemp(18)).toBe('+18°');
	});

	it('formats negative with unicode minus U+2212', () => {
		expect(formatTemp(-7)).toBe('−7°');
		expect(formatTemp(-7).charCodeAt(0)).toBe(0x2212);
	});

	it('formats zero without sign', () => {
		expect(formatTemp(0)).toBe('0°');
	});

	it('rounds to integer', () => {
		expect(formatTemp(23.6)).toBe('+24°');
	});

	it('rounds small positive values to zero without sign', () => {
		expect(formatTemp(0.4)).toBe('0°');
	});
});

describe('formatWindSpeed & formatWind', () => {
	it('formats in English by default with dot separator and m/s unit', () => {
		expect(formatWindSpeed(3.84)).toBe('3.8 m/s');
		expect(formatWindSpeed(0.0)).toBe('0.0 m/s');
		expect(formatWindSpeed(20)).toBe('20.0 m/s');
		expect(formatWind(3.84)).toBe('3.8 m/s');
	});

	it('formats in Russian with comma decimal separator and м/с unit', () => {
		expect(formatWindSpeed(3.84, 'ru')).toBe('3,8 м/с');
		expect(formatWindSpeed(0.0, 'ru')).toBe('0,0 м/с');
		expect(formatWindSpeed(20, 'ru')).toBe('20,0 м/с');
		expect(formatWind(3.84, 'ru')).toBe('3,8 м/с');
	});
});

describe('formatPressure & formatMmhg', () => {
	it('formats mmHg in English by default with mmHg suffix', () => {
		expect(formatMmhg(759.99998)).toBe('760 mmHg');
		expect(formatMmhg(748.2)).toBe('748 mmHg');
	});

	it('formats mmHg in Russian when requested with мм рт. ст. suffix', () => {
		expect(formatMmhg(759.99998, 'ru')).toBe('760 мм рт. ст.');
		expect(formatMmhg(748.2, 'ru')).toBe('748 мм рт. ст.');
	});

	it('converts hPa to mmHg and formats directly with formatPressure', () => {
		expect(formatPressure(1013.25, 'en')).toBe('760 mmHg');
		expect(formatPressure(1013.25, 'ru')).toBe('760 мм рт. ст.');
		expect(formatPressure(1000, 'en')).toBe('750 mmHg');
	});
});

describe('formatPrecipMm', () => {
	it('formats in English by default with mm unit and dot decimal', () => {
		expect(formatPrecipMm(0)).toBe('0 mm');
		expect(formatPrecipMm(0.4)).toBe('0.4 mm');
		expect(formatPrecipMm(2.5)).toBe('2.5 mm');
		expect(formatPrecipMm(12.34)).toBe('12.3 mm');
		expect(formatPrecipMm(1)).toBe('1 mm');
		expect(formatPrecipMm(5.0)).toBe('5 mm');
	});

	it('formats in Russian with мм unit and comma decimal', () => {
		expect(formatPrecipMm(0, 'ru')).toBe('0 мм');
		expect(formatPrecipMm(0.4, 'ru')).toBe('0,4 мм');
		expect(formatPrecipMm(2.5, 'ru')).toBe('2,5 мм');
		expect(formatPrecipMm(12.34, 'ru')).toBe('12,3 мм');
		expect(formatPrecipMm(1, 'ru')).toBe('1 мм');
		expect(formatPrecipMm(5.0, 'ru')).toBe('5 мм');
	});
});

describe('DEFAULT_UNITS', () => {
	it('exposes fixed defaults for future configurability', () => {
		expect(DEFAULT_UNITS).toEqual({
			temperature: 'celsius',
			wind: 'ms',
			pressure: 'mmhg'
		});
	});
});
