import { describe, expect, it } from 'vitest';
import { formatWindDirection, windDirectionAngle } from '../direction';

describe('formatWindDirection', () => {
	it('maps the 8 compass points to English labels by default', () => {
		expect(formatWindDirection(0)).toBe('N');
		expect(formatWindDirection(45)).toBe('NE');
		expect(formatWindDirection(90)).toBe('E');
		expect(formatWindDirection(135)).toBe('SE');
		expect(formatWindDirection(180)).toBe('S');
		expect(formatWindDirection(225)).toBe('SW');
		expect(formatWindDirection(270)).toBe('W');
		expect(formatWindDirection(315)).toBe('NW');
	});

	it('maps the 8 compass points to Russian labels when requested', () => {
		expect(formatWindDirection(0, 'ru')).toBe('С');
		expect(formatWindDirection(45, 'ru')).toBe('СВ');
		expect(formatWindDirection(90, 'ru')).toBe('В');
		expect(formatWindDirection(135, 'ru')).toBe('ЮВ');
		expect(formatWindDirection(180, 'ru')).toBe('Ю');
		expect(formatWindDirection(225, 'ru')).toBe('ЮЗ');
		expect(formatWindDirection(270, 'ru')).toBe('З');
		expect(formatWindDirection(315, 'ru')).toBe('СЗ');
	});

	it('assigns sector boundaries to the next direction (half-open intervals)', () => {
		expect(formatWindDirection(22.5, 'en')).toBe('NE');
		expect(formatWindDirection(337.5, 'en')).toBe('N');
		expect(formatWindDirection(359.9, 'en')).toBe('N');

		expect(formatWindDirection(22.5, 'ru')).toBe('СВ');
		expect(formatWindDirection(337.5, 'ru')).toBe('С');
		expect(formatWindDirection(359.9, 'ru')).toBe('С');
	});

	it('normalizes degrees >= 360 and negatives', () => {
		expect(formatWindDirection(360, 'en')).toBe('N');
		expect(formatWindDirection(405, 'en')).toBe('NE');
		expect(formatWindDirection(-45, 'en')).toBe('NW');
		expect(formatWindDirection(-90, 'en')).toBe('W');

		expect(formatWindDirection(360, 'ru')).toBe('С');
		expect(formatWindDirection(405, 'ru')).toBe('СВ');
		expect(formatWindDirection(-45, 'ru')).toBe('СЗ');
		expect(formatWindDirection(-90, 'ru')).toBe('З');
	});
});

describe('windDirectionAngle', () => {
	it('returns the rotation angle for the direction wind blows to', () => {
		expect(windDirectionAngle(0)).toBe(180);
		expect(windDirectionAngle(90)).toBe(270);
		expect(windDirectionAngle(180)).toBe(0);
		expect(windDirectionAngle(270)).toBe(90);
	});

	it('normalizes input and keeps the angle in [0, 360)', () => {
		expect(windDirectionAngle(360)).toBe(180);
		expect(windDirectionAngle(-90)).toBe(90);
	});
});
