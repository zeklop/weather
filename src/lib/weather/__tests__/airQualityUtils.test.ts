import { describe, expect, it } from 'vitest';
import {
	getAqiCategory,
	getAqiColor,
	getDominantAllergen,
	getPollenCategory,
	getPollutantCategory
} from '../airQualityUtils';
import type { PollenLevels } from '$lib/types';

describe('airQualityUtils', () => {
	describe('getAqiCategory & getAqiColor', () => {
		it('categorizes European AQI correctly across all bands', () => {
			expect(getAqiCategory(10)).toBe('good');
			expect(getAqiCategory(30)).toBe('fair');
			expect(getAqiCategory(50)).toBe('moderate');
			expect(getAqiCategory(75)).toBe('poor');
			expect(getAqiCategory(95)).toBe('very_poor');
			expect(getAqiCategory(120)).toBe('hazardous');
			expect(getAqiCategory(null)).toBeNull();
		});

		it('returns distinct hex color codes for categories', () => {
			expect(getAqiColor('good')).toBe('#10B981');
			expect(getAqiColor('fair')).toBe('#84CC16');
			expect(getAqiColor('moderate')).toBe('#EAB308');
			expect(getAqiColor('poor')).toBe('#F97316');
			expect(getAqiColor('very_poor')).toBe('#EF4444');
			expect(getAqiColor('hazardous')).toBe('#A855F7');
			expect(getAqiColor(null)).toBe('var(--text-secondary)');
		});
	});

	describe('getPollutantCategory (WHO guidelines)', () => {
		it('evaluates PM2.5, PM10, NO2, O3, SO2, CO thresholds correctly', () => {
			expect(getPollutantCategory('pm2_5', 10)).toBe('good');
			expect(getPollutantCategory('pm2_5', 20)).toBe('moderate');
			expect(getPollutantCategory('pm2_5', 35)).toBe('high');
			expect(getPollutantCategory('pm2_5', 60)).toBe('very_high');

			expect(getPollutantCategory('pm10', 30)).toBe('good');
			expect(getPollutantCategory('pm10', 60)).toBe('moderate');

			expect(getPollutantCategory('carbonMonoxide', 2500)).toBe('good');
			expect(getPollutantCategory('carbonMonoxide', 6000)).toBe('moderate');
			expect(getPollutantCategory('carbonMonoxide', 18000)).toBe('very_high');

			expect(getPollutantCategory('pm2_5', null)).toBeNull();
		});
	});

	describe('getPollenCategory & getDominantAllergen', () => {
		it('categorizes pollen concentrations', () => {
			expect(getPollenCategory(0)).toBe('none');
			expect(getPollenCategory(5)).toBe('low');
			expect(getPollenCategory(25)).toBe('moderate');
			expect(getPollenCategory(100)).toBe('high');
			expect(getPollenCategory(250)).toBe('very_high');
			expect(getPollenCategory(null)).toBeNull();
		});

		it('finds dominant allergen only when reaching moderate threshold (11+ grains/m³)', () => {
			const lowPollen: PollenLevels = {
				alder: 4,
				birch: 8,
				grass: 2,
				mugwort: 0,
				olive: 0,
				ragweed: 0
			};
			expect(getDominantAllergen(lowPollen)).toBeNull();

			const highPollen: PollenLevels = {
				alder: 10,
				birch: 65,
				grass: 15,
				mugwort: 0,
				olive: 0,
				ragweed: 0
			};
			const dom = getDominantAllergen(highPollen);
			expect(dom).not.toBeNull();
			expect(dom?.key).toBe('birch');
			expect(dom?.value).toBe(65);
			expect(dom?.category).toBe('high');
		});
	});
});
