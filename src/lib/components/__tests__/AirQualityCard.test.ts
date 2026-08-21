import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import AirQualityCard from '../AirQualityCard.svelte';
import type { AirQualityData } from '$lib/types';

describe('AirQualityCard component', () => {
	it('renders summary in Russian with AQI number and category', () => {
		const data: AirQualityData = {
			aqi: 28,
			pollutants: {
				pm2_5: 12,
				pm10: 18,
				nitrogenDioxide: 14,
				sulphurDioxide: 5,
				ozone: 40,
				carbonMonoxide: 300
			},
			pollen: {
				alder: 0,
				birch: 35,
				grass: 5,
				mugwort: 0,
				olive: 0,
				ragweed: 0
			},
			hasPollenCoverage: true
		};

		const result = render(AirQualityCard, {
			props: { data, lang: 'ru' }
		});

		expect(result.html).toContain('Качество воздуха и пыльца');
		expect(result.html).toContain('28');
		expect(result.html).toContain('Хорошее');
		expect(result.html).toContain('Основной аллерген');
		expect(result.html).toContain('Берёза');
	});

	it('renders in English when lang is en', () => {
		const data: AirQualityData = {
			aqi: 15,
			pollutants: {
				pm2_5: 6,
				pm10: 10,
				nitrogenDioxide: 8,
				sulphurDioxide: 2,
				ozone: 30,
				carbonMonoxide: 200
			},
			pollen: {
				alder: 0,
				birch: 0,
				grass: 0,
				mugwort: 0,
				olive: 0,
				ragweed: 0
			},
			hasPollenCoverage: true
		};

		const result = render(AirQualityCard, {
			props: { data, lang: 'en' }
		});

		expect(result.html).toContain('Air Quality &amp; Pollen');
		expect(result.html).toContain('Good');
	});

	it('handles null data gracefully with placeholder', () => {
		const result = render(AirQualityCard, {
			props: { data: null, lang: 'ru' }
		});

		expect(result.html).toContain('Качество воздуха и пыльца');
		expect(result.html).toContain('—');
	});
});
