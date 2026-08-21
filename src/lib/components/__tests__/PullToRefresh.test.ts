import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import PullToRefresh from '../PullToRefresh.svelte';

describe('PullToRefresh component', () => {
	it('does not render when state is idle and distance is 0', () => {
		const result = render(PullToRefresh, {
			props: { state: 'idle', distance: 0, lang: 'ru' }
		});

		expect(result.html).not.toContain('ptr-container');
	});

	it('renders pull status in Russian when pulling', () => {
		const result = render(PullToRefresh, {
			props: { state: 'pulling', distance: 30, lang: 'ru' }
		});

		expect(result.html).toContain('Потяните вниз для обновления');
		expect(result.html).toContain('ptr-container');
		expect(result.html).toContain('transform: translateY(30px)');
	});

	it('renders loading spinner and status text', () => {
		const result = render(PullToRefresh, {
			props: { state: 'loading', distance: 65, lang: 'ru' }
		});

		expect(result.html).toContain('Обновляем прогноз…');
		expect(result.html).toContain('ptr-spinner');
		expect(result.html).toContain('role="status"');
	});

	it('renders success state with green checkmark and localized message', () => {
		const result = render(PullToRefresh, {
			props: { state: 'success', distance: 65, lang: 'en' }
		});

		expect(result.html).toContain('Forecast updated');
	});

	it('renders error state with error message', () => {
		const result = render(PullToRefresh, {
			props: { state: 'error', distance: 65, lang: 'ru' }
		});

		expect(result.html).toContain('Не удалось обновить');
	});
});
