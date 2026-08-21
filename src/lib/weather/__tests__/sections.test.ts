import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SECTION_ORDER,
	DEFAULT_VISIBLE_SECTIONS,
	normalizeSectionOrder,
	normalizeVisibleSections,
	type SectionId
} from '../sections';

describe('sections metadata & normalization', () => {
	it('returns default order on empty/invalid inputs', () => {
		expect(normalizeSectionOrder(null)).toEqual(DEFAULT_SECTION_ORDER);
		expect(normalizeSectionOrder(undefined)).toEqual(DEFAULT_SECTION_ORDER);
		expect(normalizeSectionOrder('bad-string')).toEqual(DEFAULT_SECTION_ORDER);
		expect(normalizeSectionOrder({})).toEqual(DEFAULT_SECTION_ORDER);
	});

	it('preserves user custom order while keeping hero and alerts locked at top', () => {
		const custom: SectionId[] = [
			'astronomy',
			'hourlyRail',
			'hero', // user tried to put hero in 3rd place
			'metrics',
			'alerts' // user tried to put alerts in 5th place
		];
		const normalized = normalizeSectionOrder(custom);
		expect(normalized[0]).toBe('hero');
		expect(normalized[1]).toBe('alerts');
		expect(normalized[2]).toBe('astronomy');
		expect(normalized[3]).toBe('hourlyRail');
		expect(normalized[4]).toBe('metrics');
		// Missing sections are appended
		expect(normalized).toContain('dailyForecast');
		expect(normalized).toContain('airQuality');
		expect(normalized.length).toBe(DEFAULT_SECTION_ORDER.length);
	});

	it('strips invalid/unknown IDs and duplicates', () => {
		const raw = ['astronomy', 'unknownSection', 'astronomy', 'metrics', 123, null];
		const normalized = normalizeSectionOrder(raw);
		expect(normalized[0]).toBe('hero');
		expect(normalized[1]).toBe('alerts');
		expect(normalized[2]).toBe('astronomy');
		expect(normalized[3]).toBe('metrics');
		expect(normalized).not.toContain('unknownSection');
		expect(new Set(normalized).size).toBe(DEFAULT_SECTION_ORDER.length);
	});

	it('normalizes visible sections record and enforces locked sections', () => {
		expect(normalizeVisibleSections(null)).toEqual(DEFAULT_VISIBLE_SECTIONS);
		expect(normalizeVisibleSections(undefined)).toEqual(DEFAULT_VISIBLE_SECTIONS);

		const custom = {
			hero: false, // locked
			alerts: false, // locked
			astronomy: false,
			metrics: true
		};
		const normalized = normalizeVisibleSections(custom);
		expect(normalized.hero).toBe(true);
		expect(normalized.alerts).toBe(true);
		expect(normalized.astronomy).toBe(false);
		expect(normalized.metrics).toBe(true);
		expect(normalized.hourlyRail).toBe(true); // default
	});
});
