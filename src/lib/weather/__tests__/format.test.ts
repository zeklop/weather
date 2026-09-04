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
	it('formats in English by default', () => {
		expect(formatDayShort('2026-08-20')).toBe('Thu, 20');
		expect(formatDayShort('2026-08-21')).toBe('Fri, 21');
		expect(formatDayShort('2026-08-23')).toBe('Sun, 23');
	});

	it('formats in Russian when specified', () => {
		expect(formatDayShort('2026-08-20', 'ru')).toBe('чт, 20');
		expect(formatDayShort('2026-08-21', 'ru')).toBe('пт, 21');
		expect(formatDayShort('2026-08-23', 'ru')).toBe('вс, 23');
	});
});

describe('formatDayFull', () => {
	it('formats in English by default (weekday, Month Day)', () => {
		expect(formatDayFull('2026-08-20')).toBe('Thursday, August 20');
	});

	it('formats in Russian when specified (capitalized, genitive month)', () => {
		expect(formatDayFull('2026-08-20', 'ru')).toBe('Четверг, 20 августа');
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
	it('formats date in English by default as "Month Day"', () => {
		expect(formatDateShort('2026-08-20')).toBe('Aug 20');
		expect(formatDateShort('2026-01-05')).toBe('Jan 5');
	});

	it('formats date in Russian as day and short month', () => {
		expect(formatDateShort('2026-08-20', 'ru')).toMatch(/^20 авг/);
		expect(formatDateShort('2026-01-05', 'ru')).toMatch(/^5 янв/);
	});
});

describe('formatStaleTime', () => {
	it('returns only HH:MM when payload time is today in wall time', () => {
		expect(formatStaleTime('2026-08-20T14:00', '2026-08-20T18:30')).toBe('14:00');
	});

	it('returns date and HH:MM in English by default when not today', () => {
		const result = formatStaleTime('2026-08-20T14:00', '2026-08-21T09:00');
		expect(result).toBe('Aug 20, 14:00');
	});

	it('returns date and HH:MM in Russian when requested and not today', () => {
		const result = formatStaleTime('2026-08-20T14:00', '2026-08-21T09:00', 'ru');
		expect(result).toMatch(/^20 авг.*, 14:00$/);
	});

	it('returns date and HH:MM when nowWallTime is null', () => {
		expect(formatStaleTime('2026-08-20T14:00', null)).toBe('Aug 20, 14:00');
		expect(formatStaleTime('2026-08-20T14:00', null, 'ru')).toMatch(/^20 авг.*, 14:00$/);
	});
});

describe('formatRailDateBadge', () => {
	it('returns "Today" / "Tomorrow" in English by default', () => {
		expect(formatRailDateBadge('2026-08-20', '2026-08-20T14:00')).toBe('Today');
		expect(formatRailDateBadge('2026-08-21', '2026-08-20T14:00')).toBe('Tomorrow');
		expect(formatRailDateBadge('2026-08-22', '2026-08-20T14:00')).toBe('Sat, 22');
	});

	it('returns "Сегодня" / "Завтра" in Russian when requested', () => {
		expect(formatRailDateBadge('2026-08-20', '2026-08-20T14:00', 'ru')).toBe('Сегодня');
		expect(formatRailDateBadge('2026-08-21', '2026-08-20T14:00', 'ru')).toBe('Завтра');
		expect(formatRailDateBadge('2026-08-22', '2026-08-20T14:00', 'ru')).toBe('сб, 22');
	});

	it('falls back to formatDayShort when nowWallTime is null', () => {
		expect(formatRailDateBadge('2026-08-21', null)).toBe('Fri, 21');
		expect(formatRailDateBadge('2026-08-21', null, 'ru')).toBe('пт, 21');
	});
});

describe('formatDayHeader', () => {
	it('returns "Today, Month Day" / "Tomorrow, Month Day" in English by default', () => {
		expect(formatDayHeader('2026-08-20', '2026-08-20T14:00')).toBe('Today, August 20');
		expect(formatDayHeader('2026-08-21', '2026-08-20T14:00')).toBe('Tomorrow, August 21');
		expect(formatDayHeader('2026-08-22', '2026-08-20T14:00')).toBe('Saturday, August 22');
	});

	it('returns "Сегодня, 20 августа" / "Завтра, 21 августа" in Russian when requested', () => {
		expect(formatDayHeader('2026-08-20', '2026-08-20T14:00', 'ru')).toBe('Сегодня, 20 августа');
		expect(formatDayHeader('2026-08-21', '2026-08-20T14:00', 'ru')).toBe('Завтра, 21 августа');
		expect(formatDayHeader('2026-08-22', '2026-08-20T14:00', 'ru')).toBe('Суббота, 22 августа');
	});

	it('falls back to formatDayFull when nowWallTime is null', () => {
		expect(formatDayHeader('2026-08-20', null)).toBe('Thursday, August 20');
		expect(formatDayHeader('2026-08-20', null, 'ru')).toBe('Четверг, 20 августа');
	});
});

describe('formatDayAndDate', () => {
	it('formats in English by default as "Weekday, Month Day"', () => {
		expect(formatDayAndDate('2026-08-20')).toBe('Thu, Aug 20');
		expect(formatDayAndDate('2026-08-21')).toBe('Fri, Aug 21');
		expect(formatDayAndDate('2026-08-23')).toBe('Sun, Aug 23');
	});

	it('formats in Russian as "чт, 20 авг"', () => {
		expect(formatDayAndDate('2026-08-20', 'ru')).toBe('чт, 20 авг');
		expect(formatDayAndDate('2026-08-21', 'ru')).toBe('пт, 21 авг');
		expect(formatDayAndDate('2026-08-23', 'ru')).toBe('вс, 23 авг');
	});
});
