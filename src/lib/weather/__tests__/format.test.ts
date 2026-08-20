import { describe, expect, it } from 'vitest';
import {
	formatDayFull,
	formatDayShort,
	formatHour,
	formatTimeShort,
	isToday
} from '../format';

// TZ-safety contract: Open-Meteo timestamps are wall-time ISO strings in the
// LOCATION's timezone. They are NEVER parsed with `new Date(...)` (which would
// shift them into the phone tz) and never formatted with a location-timezone
// Intl. Calendar formatting goes through the Date.UTC trick + timeZone:'UTC',
// so output is identical regardless of the test runner's local timezone.

describe('formatHour', () => {
	it('extracts HH:MM from wall-time ISO without time part', () => {
		expect(formatHour('2026-08-20T11:00')).toBe('11:00');
	});

	it('extracts HH:MM from ISO with seconds', () => {
		expect(formatHour('2026-08-20T11:00:00')).toBe('11:00');
	});

	it('zero-pads hour and minute', () => {
		expect(formatHour('2026-08-20T00:05')).toBe('00:05');
	});
});

describe('formatDayShort', () => {
	it('formats Thursday as "чт, 20"', () => {
		expect(formatDayShort('2026-08-20')).toBe('чт, 20');
	});

	it('formats Friday as "пт, 21"', () => {
		expect(formatDayShort('2026-08-21')).toBe('пт, 21');
	});

	it('formats Sunday as "вс, 23"', () => {
		expect(formatDayShort('2026-08-23')).toBe('вс, 23');
	});
});

describe('formatDayFull', () => {
	it('formats weekday capitalized, day and genitive month', () => {
		expect(formatDayFull('2026-08-20')).toBe('Четверг, 20 августа');
	});
});

describe('formatTimeShort', () => {
	it('extracts HH:MM from wall-time ISO with seconds', () => {
		expect(formatTimeShort('2026-08-20T08:42:00')).toBe('08:42');
	});
});

describe('isToday', () => {
	it('matches same date', () => {
		expect(isToday('2026-08-20', '2026-08-20T15:00')).toBe(true);
	});

	it('rejects a different date', () => {
		expect(isToday('2026-08-21', '2026-08-20T15:00')).toBe(false);
	});
});