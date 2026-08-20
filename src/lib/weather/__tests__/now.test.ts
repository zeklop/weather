import { describe, expect, it } from 'vitest';
import {
	formatPrecipitationPhrase,
	getHourStartIdx,
	getWallNow,
	spanWord,
	wallMinutesBetween
} from '../now';

describe('getWallNow', () => {
	it('formats ISO wall time in UTC', () => {
		const ms = Date.UTC(2026, 7, 20, 14, 30);
		expect(getWallNow('UTC', ms)).toBe('2026-08-20T14:30');
	});

	it('formats ISO wall time in Europe/Moscow (UTC+3)', () => {
		const ms = Date.UTC(2026, 7, 20, 14, 30);
		expect(getWallNow('Europe/Moscow', ms)).toBe('2026-08-20T17:30');
	});

	it('formats ISO wall time in Asia/Tokyo (UTC+9)', () => {
		const ms = Date.UTC(2026, 7, 20, 14, 30);
		expect(getWallNow('Asia/Tokyo', ms)).toBe('2026-08-20T23:30');
	});

	it('formats ISO wall time in America/New_York (EDT, UTC-4)', () => {
		const ms = Date.UTC(2026, 7, 20, 14, 30);
		expect(getWallNow('America/New_York', ms)).toBe('2026-08-20T10:30');
	});

	it('handles midnight hour rollover (00:xx instead of 24:xx)', () => {
		const ms = Date.UTC(2026, 7, 20, 21, 5, 0); // 00:05 in Moscow
		expect(getWallNow('Europe/Moscow', ms)).toBe('2026-08-21T00:05');
	});

	it('gracefully falls back on invalid timezone without throwing', () => {
		const ms = Date.UTC(2026, 7, 20, 14, 30);
		expect(getWallNow('Invalid/Timezone_Name', ms)).toBe('2026-08-20T14:30');
	});

	it('uses current time by default when ms is omitted', () => {
		const nowStr = getWallNow('UTC');
		expect(nowStr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
	});
});

describe('getHourStartIdx', () => {
	const sampleTimes = [
		'2026-08-20T10:00',
		'2026-08-20T11:00',
		'2026-08-20T12:00',
		'2026-08-20T13:00',
		'2026-08-20T14:00'
	];

	it('returns 0 if nowIso is before the first hour in payload', () => {
		expect(getHourStartIdx(sampleTimes, '2026-08-20T09:15')).toBe(0);
	});

	it('returns exact index on exact hour match', () => {
		expect(getHourStartIdx(sampleTimes, '2026-08-20T12:00')).toBe(2);
	});

	it('returns current hour index when nowIso is in middle of the hour', () => {
		expect(getHourStartIdx(sampleTimes, '2026-08-20T12:45')).toBe(2);
	});

	it('returns last index when nowIso is within the last hourly block', () => {
		expect(getHourStartIdx(sampleTimes, '2026-08-20T14:59')).toBe(4);
	});

	it('returns -1 when nowIso is past the last hourly block (expired payload)', () => {
		expect(getHourStartIdx(sampleTimes, '2026-08-20T15:00')).toBe(-1);
		expect(getHourStartIdx(sampleTimes, '2026-08-21T10:00')).toBe(-1);
	});

	it('returns -1 on empty times array', () => {
		expect(getHourStartIdx([], '2026-08-20T12:00')).toBe(-1);
	});
});

describe('spanWord', () => {
	it('formats English words by default', () => {
		expect(spanWord(1)).toBe('1 minute');
		expect(spanWord(2)).toBe('2 minutes');
		expect(spanWord(15)).toBe('15 minutes');
		expect(spanWord(40)).toBe('40 minutes');
		expect(spanWord(60)).toBe('1 hour');
		expect(spanWord(90)).toBe('1.5 hours');
		expect(spanWord(120)).toBe('2 hours');
	});

	it('formats Russian declension for minutes when requested', () => {
		expect(spanWord(1, 'ru')).toBe('1 минуту');
		expect(spanWord(2, 'ru')).toBe('2 минуты');
		expect(spanWord(4, 'ru')).toBe('4 минуты');
		expect(spanWord(5, 'ru')).toBe('5 минут');
		expect(spanWord(11, 'ru')).toBe('11 минут');
		expect(spanWord(21, 'ru')).toBe('21 минуту');
		expect(spanWord(22, 'ru')).toBe('22 минуты');
		expect(spanWord(40, 'ru')).toBe('40 минут');
	});

	it('formats Russian phrases for hour spans when requested', () => {
		expect(spanWord(60, 'ru')).toBe('1 час');
		expect(spanWord(90, 'ru')).toBe('1,5 часа');
		expect(spanWord(120, 'ru')).toBe('2 часа');
	});
});

describe('wallMinutesBetween', () => {
	it('computes difference in minutes between two wall-time ISO strings', () => {
		expect(wallMinutesBetween('2026-08-20T14:00', '2026-08-20T14:40')).toBe(40);
		expect(wallMinutesBetween('2026-08-20T14:45', '2026-08-20T15:00')).toBe(15);
		expect(wallMinutesBetween('2026-08-20T23:50', '2026-08-21T00:10')).toBe(20);
	});
});

describe('formatPrecipitationPhrase', () => {
	it('formats in English by default for active precipitation', () => {
		expect(formatPrecipitationPhrase('Rain', null, true)).toBe('Rain is falling');
		expect(formatPrecipitationPhrase('Snow', null, true)).toBe('Snow is falling');
		expect(formatPrecipitationPhrase('Drizzle', null, true)).toBe('Drizzle is falling');
	});

	it('formats in English by default when currently raining and stopping time is known', () => {
		expect(formatPrecipitationPhrase('Snow', 15, true)).toBe('Snow will stop in ~15 minutes');
		expect(formatPrecipitationPhrase('Rain', 1, true)).toBe('Rain will stop in ~1 minute');
	});

	it('formats in English by default when precipitation will start in future', () => {
		expect(formatPrecipitationPhrase('Rain', 40, false)).toBe('Rain will start in ~40 minutes');
		expect(formatPrecipitationPhrase('Snow', 60, false)).toBe('Snow will start in ~1 hour');
		expect(formatPrecipitationPhrase('Rain', 90, false)).toBe('Rain will start in ~1.5 hours');
	});

	it('formats "No precipitation" in English by default when dry', () => {
		expect(formatPrecipitationPhrase('Rain', null, false)).toBe('No precipitation');
		expect(formatPrecipitationPhrase('Clear', null, false)).toBe('No precipitation');
	});

	it('formats current precipitation using Russian phrase when requested', () => {
		expect(formatPrecipitationPhrase('Дождь', null, true, 'ru')).toBe('Дождь идёт');
		expect(formatPrecipitationPhrase('Снег', null, true, 'ru')).toBe('Снег идёт');
		expect(formatPrecipitationPhrase('Морось', null, true, 'ru')).toBe('Морось идёт');
		expect(formatPrecipitationPhrase('Ливень', null, true, 'ru')).toBe('Ливень идёт');
		expect(formatPrecipitationPhrase('Снегопад', null, true, 'ru')).toBe('Снегопад идёт');
		expect(formatPrecipitationPhrase('Гроза', null, true, 'ru')).toBe('Гроза идёт');
	});

	it('formats precipitation ending phrase in Russian when currently raining and minutes are provided', () => {
		expect(formatPrecipitationPhrase('Дождь', 15, true, 'ru')).toBe('Дождь закончится через 15 минут');
		expect(formatPrecipitationPhrase('Снег', 1, true, 'ru')).toBe('Снег закончится через 1 минуту');
	});

	it('formats precipitation starting phrase in Russian when not currently raining and minutes are provided', () => {
		expect(formatPrecipitationPhrase('Дождь', 40, false, 'ru')).toBe('Дождь начнётся примерно через 40 минут');
		expect(formatPrecipitationPhrase('Морось', 20, false, 'ru')).toBe('Морось начнётся примерно через 20 минут');
		expect(formatPrecipitationPhrase('Снег', 60, false, 'ru')).toBe('Снег начнётся примерно через 1 час');
		expect(formatPrecipitationPhrase('Ливень', 90, false, 'ru')).toBe('Ливень начнётся примерно через 1,5 часа');
	});

	it('formats "Без осадков" in Russian when not currently raining and no upcoming precipitation minutes', () => {
		expect(formatPrecipitationPhrase('Дождь', null, false, 'ru')).toBe('Без осадков');
		expect(formatPrecipitationPhrase('Ясно', null, false, 'ru')).toBe('Без осадков');
	});
});
