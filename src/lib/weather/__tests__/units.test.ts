import { beforeEach, describe, expect, it } from 'vitest';
import {
	configureUnits,
	celsiusToFahrenheit,
	detectDefaultUnits,
	formatMmhg,
	formatPrecipMm,
	formatPressure,
	formatTemp,
	formatWindSpeed,
	hpaToInhg,
	hpaToMmhg
} from '../units';

beforeEach(() => {
	// Reset module-level unit state so tests don't leak into each other.
	configureUnits({ temperature: 'celsius', pressure: 'mmhg' });
});

describe('celsiusToFahrenheit', () => {
	it('converts celsius to fahrenheit', () => {
		expect(celsiusToFahrenheit(0)).toBe(32);
		expect(celsiusToFahrenheit(100)).toBe(212);
		expect(celsiusToFahrenheit(-40)).toBe(-40);
		expect(celsiusToFahrenheit(18)).toBeCloseTo(64.4);
	});
});

describe('hpaToInhg', () => {
	it('converts standard pressure to ~29.92 inHg', () => {
		expect(hpaToInhg(1013.25)).toBeCloseTo(29.92, 2);
	});
});

describe('detectDefaultUnits', () => {
	it('US locale gets fahrenheit + inHg', () => {
		expect(detectDefaultUnits('en-US')).toEqual({ temperature: 'fahrenheit', pressure: 'inhg' });
	});

	it('ru locale gets celsius + mmHg', () => {
		expect(detectDefaultUnits('ru-RU')).toEqual({ temperature: 'celsius', pressure: 'mmhg' });
	});

	it('other locales get celsius + hPa', () => {
		expect(detectDefaultUnits('en-GB')).toEqual({ temperature: 'celsius', pressure: 'hpa' });
		expect(detectDefaultUnits('de')).toEqual({ temperature: 'celsius', pressure: 'hpa' });
	});

	it('falls back to celsius + hPa on invalid input', () => {
		expect(detectDefaultUnits(undefined as unknown as string)).toEqual({
			temperature: 'celsius',
			pressure: 'hpa'
		});
		expect(detectDefaultUnits('')).toEqual({ temperature: 'celsius', pressure: 'hpa' });
	});
});

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

	it('formats fahrenheit after configureUnits', () => {
		configureUnits({ temperature: 'fahrenheit' });
		expect(formatTemp(0)).toBe('+32°');
		expect(formatTemp(100)).toBe('+212°');
		// -18°C = -0.4°F, Math.round(-0.4) === -0, and -0 === 0 in JS —
		// same zero special case as formatTemp(0.4)
		expect(formatTemp(-18)).toBe('0°');
	});
});

describe('formatWindSpeed', () => {
	it('formats in English by default with dot separator and m/s unit', () => {
		expect(formatWindSpeed(3.84)).toBe('3.8 m/s');
		expect(formatWindSpeed(0.0)).toBe('0.0 m/s');
		expect(formatWindSpeed(20)).toBe('20.0 m/s');
	});

	it('formats in Russian with comma decimal separator and м/с unit', () => {
		expect(formatWindSpeed(3.84, 'ru')).toBe('3,8 м/с');
		expect(formatWindSpeed(0.0, 'ru')).toBe('0,0 м/с');
		expect(formatWindSpeed(20, 'ru')).toBe('20,0 м/с');
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

	it('formats inHg after configureUnits with two decimals', () => {
		configureUnits({ pressure: 'inhg' });
		expect(formatPressure(1013.25, 'en')).toBe('29.92 inHg');
	});

	it('formats hPa without conversion', () => {
		configureUnits({ pressure: 'hpa' });
		expect(formatPressure(1013, 'en')).toBe('1013 hPa');
		expect(formatPressure(1013, 'ru')).toBe('1013 гПа');
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
