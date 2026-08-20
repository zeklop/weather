import { describe, expect, it } from 'vitest';
import { windDirectionAngle, windDirectionLabel } from '../direction';

describe('windDirectionLabel', () => {
	it('maps the 8 compass points to Russian labels', () => {
		expect(windDirectionLabel(0)).toBe('С');
		expect(windDirectionLabel(45)).toBe('СВ');
		expect(windDirectionLabel(90)).toBe('В');
		expect(windDirectionLabel(135)).toBe('ЮВ');
		expect(windDirectionLabel(180)).toBe('Ю');
		expect(windDirectionLabel(225)).toBe('ЮЗ');
		expect(windDirectionLabel(270)).toBe('З');
		expect(windDirectionLabel(315)).toBe('СЗ');
	});

	it('assigns sector boundaries to the next direction (half-open intervals)', () => {
		expect(windDirectionLabel(22.5)).toBe('СВ');
		expect(windDirectionLabel(337.5)).toBe('С');
		expect(windDirectionLabel(359.9)).toBe('С');
	});

	it('normalizes degrees >= 360 and negatives', () => {
		expect(windDirectionLabel(360)).toBe('С');
		expect(windDirectionLabel(405)).toBe('СВ');
		expect(windDirectionLabel(-45)).toBe('СЗ');
		expect(windDirectionLabel(-90)).toBe('З');
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
