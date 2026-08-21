import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import MarineBadge from '../MarineBadge.svelte';
import type { MarineData } from '$lib/types';

describe('MarineBadge component', () => {
	it('renders water temperature and waves in Russian', () => {
		const marine: MarineData = {
			seaTemperature: 22.4,
			waveHeight: 0.7
		};

		const result = render(MarineBadge, {
			props: { marine, lang: 'ru' }
		});

		expect(result.html).toContain('Вода в море: +22°');
		expect(result.html).toContain('Волны: 0.7 м');
		expect(result.html).toContain('У побережья');
	});

	it('renders in English when lang is en', () => {
		const marine: MarineData = {
			seaTemperature: 19.8,
			waveHeight: 1.2
		};

		const result = render(MarineBadge, {
			props: { marine, lang: 'en' }
		});

		expect(result.html).toContain('Sea water: +20°');
		expect(result.html).toContain('Waves: 1.2 m');
		expect(result.html).toContain('Coastal water');
	});

	it('renders nothing when marine is null or seaTemperature is null', () => {
		const nullResult = render(MarineBadge, {
			props: { marine: null, lang: 'ru' }
		});
		expect(nullResult.html).not.toContain('marine-pill');

		const noTempResult = render(MarineBadge, {
			props: { marine: { seaTemperature: null, waveHeight: 0.5 }, lang: 'ru' }
		});
		expect(noTempResult.html).not.toContain('marine-pill');
	});
});
