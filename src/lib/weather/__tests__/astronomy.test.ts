import { describe, expect, it } from 'vitest';
import { getMoonInfo, getSunArcInfo, parseWallMinutes } from '../astronomy';

describe('astronomy module', () => {
	describe('parseWallMinutes', () => {
		it('parses wall ISO timestamps into minutes from midnight', () => {
			expect(parseWallMinutes('2026-08-21T00:00')).toBe(0);
			expect(parseWallMinutes('2026-08-21T05:30')).toBe(330);
			expect(parseWallMinutes('2026-08-21T12:00')).toBe(720);
			expect(parseWallMinutes('2026-08-21T23:59:59')).toBe(1439);
		});

		it('returns null for invalid or missing timestamps', () => {
			expect(parseWallMinutes(null)).toBeNull();
			expect(parseWallMinutes(undefined)).toBeNull();
			expect(parseWallMinutes('')).toBeNull();
			expect(parseWallMinutes('2026-08-21')).toBeNull();
			expect(parseWallMinutes('invalid')).toBeNull();
			expect(parseWallMinutes('2026-08-21T24:00')).toBeNull();
		});
	});

	describe('getMoonInfo', () => {
		it('calculates moon illumination and phase for known dates', () => {
			// Known New Moon: 2000-01-06 18:14 UTC
			const epochUtc = Date.UTC(2000, 0, 6, 18, 14, 0);
			const newMoonInfo = getMoonInfo(epochUtc, 55.75);
			expect(newMoonInfo.phaseName).toBe('new_moon');
			expect(newMoonInfo.illumination).toBeLessThanOrEqual(5);
			expect(newMoonInfo.isWaxing).toBe(true);
			expect(newMoonInfo.isSouthern).toBe(false);

			// Approx 14.76 days later: Full Moon
			const fullMoonUtc = epochUtc + 14.765 * 86_400_000;
			const fullMoonInfo = getMoonInfo(fullMoonUtc, 55.75);
			expect(fullMoonInfo.phaseName).toBe('full_moon');
			expect(fullMoonInfo.illumination).toBeGreaterThanOrEqual(95);

			// Approx 22 days later: Last Quarter / Waning
			const waningUtc = epochUtc + 22.1 * 86_400_000;
			const waningInfo = getMoonInfo(waningUtc, 55.75);
			expect(waningInfo.isWaxing).toBe(false);
		});

		it('correctly sets isSouthern for negative latitudes', () => {
			const moscow = getMoonInfo(Date.now(), 55.75);
			expect(moscow.isSouthern).toBe(false);

			const sydney = getMoonInfo(Date.now(), -33.86);
			expect(sydney.isSouthern).toBe(true);
		});

		it('provides non-negative integers for days to next events', () => {
			const info = getMoonInfo(Date.now(), 55.75);
			expect(info.daysToFullMoon).toBeGreaterThanOrEqual(0);
			expect(info.daysToFullMoon).toBeLessThanOrEqual(30);
			expect(info.daysToNewMoon).toBeGreaterThanOrEqual(0);
			expect(info.daysToNewMoon).toBeLessThanOrEqual(30);
		});
	});

	describe('getSunArcInfo', () => {
		const sunrise = '2026-08-21T06:00';
		const sunset = '2026-08-21T20:00';

		it('identifies status before sunrise and calculates minutesToSunrise', () => {
			const now = '2026-08-21T04:30';
			const arc = getSunArcInfo(sunrise, sunset, now);
			expect(arc.status).toBe('before_sunrise');
			expect(arc.progress).toBe(0);
			expect(arc.minutesToSunrise).toBe(90);
			expect(arc.minutesToSunset).toBeNull();
			expect(arc.sunX).toBe(10);
			expect(arc.sunY).toBe(80);
		});

		it('identifies daytime and calculates progress and peak position', () => {
			const nowMidday = '2026-08-21T13:00';
			const arc = getSunArcInfo(sunrise, sunset, nowMidday);
			expect(arc.status).toBe('day');
			expect(arc.progress).toBe(0.5); // exactly midway between 06:00 and 20:00 (14h daylight)
			expect(arc.minutesToSunset).toBe(420); // 7 hours
			expect(arc.sunX).toBe(50);
			expect(arc.sunY).toBe(20); // peak elevation
		});

		it('identifies after sunset', () => {
			const nowNight = '2026-08-21T22:00';
			const arc = getSunArcInfo(sunrise, sunset, nowNight);
			expect(arc.status).toBe('after_sunset');
			expect(arc.progress).toBe(1);
			expect(arc.minutesToSunrise).toBe(480); // 2h till midnight + 6h till sunrise = 8h (480m)
			expect(arc.sunX).toBe(90);
			expect(arc.sunY).toBe(80);
		});

		it('handles null sunrise/sunset in polar regions gracefully without NaN', () => {
			const arc = getSunArcInfo(null, null, '2026-08-21T12:00');
			expect(arc.status).toBe('polar_day');
			expect(Number.isNaN(arc.sunX)).toBe(false);
			expect(Number.isNaN(arc.sunY)).toBe(false);
			expect(arc.minutesToSunrise).toBeNull();
			expect(arc.minutesToSunset).toBeNull();
		});

		it('infers polar_night for arctic latitude in winter', () => {
			const arc = getSunArcInfo(null, null, '2026-12-21T12:00', 69.0);
			expect(arc.status).toBe('polar_night');
			expect(arc.sunY).toBe(80); // below horizon
		});

		it('infers polar_day for arctic latitude in summer', () => {
			const arc = getSunArcInfo(null, null, '2026-06-21T12:00', 69.0);
			expect(arc.status).toBe('polar_day');
			expect(arc.sunY).toBe(20); // at zenith
		});

		it('infers polar_night for antarctic latitude in southern winter', () => {
			const arc = getSunArcInfo(null, null, '2026-06-21T12:00', -69.0);
			expect(arc.status).toBe('polar_night');
		});
	});
});
