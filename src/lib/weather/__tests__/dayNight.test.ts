import { describe, expect, it } from 'vitest';
import { isDay } from '../dayNight';

const R = '2026-08-20T05:23';
const S = '2026-08-20T20:41';

describe('isDay', () => {
	it('normal day (R < S): at within [R, S] → calculated day', () => {
		expect(isDay('2026-08-20T12:00', R, S)).toEqual({ isDay: true, source: 'calculated' });
	});

	it('normal night (R < S): at outside [R, S] → calculated night', () => {
		expect(isDay('2026-08-20T23:00', R, S)).toEqual({ isDay: false, source: 'calculated' });
	});

	it('boundaries are inclusive: at == R → day, at == S → day, at just before R → night', () => {
		expect(isDay('2026-08-20T05:23', R, S)).toEqual({ isDay: true, source: 'calculated' });
		expect(isDay('2026-08-20T20:41', R, S)).toEqual({ isDay: true, source: 'calculated' });
		expect(isDay('2026-08-20T05:22', R, S)).toEqual({ isDay: false, source: 'calculated' });
	});

	it('cross-midnight day (R > S): day at night hours, night at noon', () => {
		const crossR = '2026-08-20T23:00';
		const crossS = '2026-08-21T05:00';
		expect(isDay('2026-08-21T02:00', crossR, crossS)).toEqual({ isDay: true, source: 'calculated' });
		expect(isDay('2026-08-21T12:00', crossR, crossS)).toEqual({ isDay: false, source: 'calculated' });
		expect(isDay('2026-08-20T23:30', crossR, crossS)).toEqual({ isDay: true, source: 'calculated' });
	});

	it('cross-midnight boundaries are inclusive: at == R → day, at == S → day', () => {
		const crossR = '2026-08-20T23:00';
		const crossS = '2026-08-20T05:00';
		expect(isDay('2026-08-20T23:00', crossR, crossS)).toEqual({ isDay: true, source: 'calculated' });
		expect(isDay('2026-08-20T05:00', crossR, crossS)).toEqual({ isDay: true, source: 'calculated' });
	});

	it('degenerate (R == S): unconditional day', () => {
		expect(isDay('2026-08-20T12:00', '2026-08-20T12:00', '2026-08-20T12:00')).toEqual({
			isDay: true,
			source: 'calculated'
		});
		expect(isDay('2026-08-20T00:00', '2026-08-20T12:00', '2026-08-20T12:00')).toEqual({
			isDay: true,
			source: 'calculated'
		});
	});

	it('missing sunrise → fallback window 07:00 <= T < 19:00', () => {
		expect(isDay('2026-08-20T06:59', null, S)).toEqual({ isDay: false, source: 'fallback' });
		expect(isDay('2026-08-20T07:00', null, S)).toEqual({ isDay: true, source: 'fallback' });
		expect(isDay('2026-08-20T18:59', null, S)).toEqual({ isDay: true, source: 'fallback' });
		expect(isDay('2026-08-20T19:00', null, S)).toEqual({ isDay: false, source: 'fallback' });
	});

	it('missing sunset → same fallback window', () => {
		expect(isDay('2026-08-20T06:59', R, null)).toEqual({ isDay: false, source: 'fallback' });
		expect(isDay('2026-08-20T07:00', R, null)).toEqual({ isDay: true, source: 'fallback' });
		expect(isDay('2026-08-20T18:59', R, null)).toEqual({ isDay: true, source: 'fallback' });
		expect(isDay('2026-08-20T19:00', R, null)).toEqual({ isDay: false, source: 'fallback' });
	});

	it('DST transition day: compares wall-time HH:MM only, no Date math', () => {
		expect(isDay('2026-03-29T12:00', '2026-03-29T05:30', '2026-03-29T18:45')).toEqual({
			isDay: true,
			source: 'calculated'
		});
	});

	it('same HH:MM on different dates → identical result (foreign tz equivalence)', () => {
		expect(isDay('2025-12-21T12:00', '2025-12-21T09:00', '2025-12-21T16:00')).toEqual({
			isDay: true,
			source: 'calculated'
		});
	});
});
