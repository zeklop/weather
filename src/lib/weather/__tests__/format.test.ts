import { describe, expect, it } from 'vitest';
import {
	formatDateShort,
	formatDayAndDate,
	formatDayFull,
	formatDayHeader,
	formatDayShort,
	formatHour,
	formatRailDateBadge,
	formatStaleTime,
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

describe('formatDateShort', () => {
	it('formats date as day and short month in Russian', () => {
		expect(formatDateShort('2026-08-20')).toMatch(/^20 авг/);
		expect(formatDateShort('2026-01-05')).toMatch(/^5 янв/);
	});
});

describe('formatStaleTime', () => {
	it('returns only HH:MM when payload time is today in wall time', () => {
		expect(formatStaleTime('2026-08-20T14:00', '2026-08-20T18:30')).toBe('14:00');
	});

	it('returns date and HH:MM when payload time is not today in wall time', () => {
		const result = formatStaleTime('2026-08-20T14:00', '2026-08-21T09:00');
		expect(result).toMatch(/^20 авг.*, 14:00$/);
	});

	it('returns date and HH:MM when nowWallTime is null', () => {
		const result = formatStaleTime('2026-08-20T14:00', null);
		expect(result).toMatch(/^20 авг.*, 14:00$/);
	});
});

describe('formatRailDateBadge', () => {
	it('returns "Завтра" for tomorrow', () => {
		expect(formatRailDateBadge('2026-08-21', '2026-08-20T14:00')).toBe('Завтра');
	});

	it('returns "Сегодня" for today', () => {
		expect(formatRailDateBadge('2026-08-20', '2026-08-20T14:00')).toBe('Сегодня');
	});

	it('returns short formatted day for 2+ days ahead', () => {
		expect(formatRailDateBadge('2026-08-22', '2026-08-20T14:00')).toBe('сб, 22');
	});

	it('falls back to formatDayShort when nowWallTime is null', () => {
		expect(formatRailDateBadge('2026-08-21', null)).toBe('пт, 21');
	});
});

describe('formatDayHeader', () => {
	it('returns "Сегодня, 20 августа" for today', () => {
		expect(formatDayHeader('2026-08-20', '2026-08-20T14:00')).toBe('Сегодня, 20 августа');
	});

	it('returns "Завтра, 21 августа" for tomorrow', () => {
		expect(formatDayHeader('2026-08-21', '2026-08-20T14:00')).toBe('Завтра, 21 августа');
	});

	it('returns full day string like "Суббота, 22 августа" for subsequent days', () => {
		expect(formatDayHeader('2026-08-22', '2026-08-20T14:00')).toBe('Суббота, 22 августа');
	});

	it('falls back to formatDayFull when nowWallTime is null', () => {
		expect(formatDayHeader('2026-08-20', null)).toBe('Четверг, 20 августа');
	});
});

describe('formatDayAndDate', () => {
	it('formats Thursday as "чт, 20 авг"', () => {
		expect(formatDayAndDate('2026-08-20')).toBe('чт, 20 авг');
	});

	it('formats Friday as "пт, 21 авг"', () => {
		expect(formatDayAndDate('2026-08-21')).toBe('пт, 21 авг');
	});

	it('formats Sunday as "вс, 23 авг"', () => {
		expect(formatDayAndDate('2026-08-23')).toBe('вс, 23 авг');
	});
});