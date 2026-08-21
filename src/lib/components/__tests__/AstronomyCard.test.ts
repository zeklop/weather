import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import AstronomyCard from '../AstronomyCard.svelte';

describe('AstronomyCard component', () => {
	it('renders Sun arc and Moon phase in Russian', () => {
		const result = render(AstronomyCard, {
			props: {
				sunrise: '2026-08-21T05:30',
				sunset: '2026-08-21T20:15',
				timezone: 'Europe/Moscow',
				latitude: 55.75,
				lang: 'ru'
			}
		});

		expect(result.html).toContain('Солнце и Луна');
		expect(result.html).toContain('Восход');
		expect(result.html).toContain('05:30');
		expect(result.html).toContain('Закат');
		expect(result.html).toContain('20:15');
		expect(result.html).toContain('Фаза Луны');
		expect(result.html).toContain('sun-arc-svg');
		expect(result.html).toContain('moon-svg');
	});

	it('renders in English when lang is en', () => {
		const result = render(AstronomyCard, {
			props: {
				sunrise: '2026-08-21T05:30',
				sunset: '2026-08-21T20:15',
				timezone: 'Europe/London',
				latitude: 51.5,
				lang: 'en'
			}
		});

		expect(result.html).toContain('Sun &amp; Moon');
		expect(result.html).toContain('Sunrise');
		expect(result.html).toContain('Sunset');
		expect(result.html).toContain('Moon Phase');
	});

	it('applies rotate(180deg) for southern hemisphere latitude', () => {
		const result = render(AstronomyCard, {
			props: {
				sunrise: '2026-08-21T06:30',
				sunset: '2026-08-21T18:00',
				timezone: 'Australia/Sydney',
				latitude: -33.86,
				lang: 'en'
			}
		});

		expect(result.html).toContain('transform: rotate(180deg);');
	});
});
