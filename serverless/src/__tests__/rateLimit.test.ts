import { describe, it, expect } from 'vitest';
import { checkRateLimit, canPing } from '../security/rateLimit';

describe('Rate Limiting & Ping Throttling', () => {
	it('allows requests within limit and throttles when exceeded', () => {
		const testIp = '192.0.2.42';
		for (let i = 0; i < 5; i++) {
			expect(checkRateLimit(testIp, 5, 10000)).toBe(true);
		}
		// 6th request should fail
		expect(checkRateLimit(testIp, 5, 10000)).toBe(false);
	});

	it('throttles pings from the same install_id within 24 hours', () => {
		const installId = 'test_install_123';
		expect(canPing(installId, 10000)).toBe(true);
		expect(canPing(installId, 10000)).toBe(false);
	});
});
