import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import PushOnboardingBanner from '../PushOnboardingBanner.svelte';

describe('PushOnboardingBanner component', () => {
	it('renders without error during server-side prerendering', () => {
		const result = render(PushOnboardingBanner);
		// Initially invisible on SSR (mount determines standalone visibility)
		expect(result.html).not.toContain('push-banner');
	});
});
