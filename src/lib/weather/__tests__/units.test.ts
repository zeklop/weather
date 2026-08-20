import { describe, expect, it } from 'vitest';
import { DEFAULT_UNITS, formatMmhg, formatTemp, formatWind, hpaToMmhg } from '../units';

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

describe('formatWind', () => {
	it('formats with comma decimal separator and one decimal', () => {
		expect(formatWind(3.84)).toBe('3,8 м/с');
	});

	it('formats zero with one decimal', () => {
		expect(formatWind(0.0)).toBe('0,0 м/с');
	});

	it('formats whole numbers with one decimal', () => {
		expect(formatWind(20)).toBe('20,0 м/с');
	});
});

describe('formatMmhg', () => {
	it('rounds visually to integer mmHg', () => {
		expect(formatMmhg(759.99998)).toBe('760 мм рт. ст.');
	});

	it('formats fractional mmHg as integer', () => {
		expect(formatMmhg(748.2)).toBe('748 мм рт. ст.');
	});
});

describe('DEFAULT_UNITS', () => {
	it('exposes fixed Russian defaults for future configurability', () => {
		expect(DEFAULT_UNITS).toEqual({
			temperature: 'celsius',
			wind: 'ms',
			pressure: 'mmhg'
		});
	});
});