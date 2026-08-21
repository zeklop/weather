import { describe, it, expect } from 'vitest';
import { isValidPushEndpoint, isValidPushKeys, hashEndpoint } from '../security/allowlist';

describe('Allowlist & Validation Security', () => {
	it('approves legitimate push endpoints from Apple, Google, Microsoft, Mozilla', () => {
		expect(isValidPushEndpoint('https://web.push.apple.com/QC789012345')).toBe(true);
		expect(isValidPushEndpoint('https://fcm.googleapis.com/fcm/send/abc123xyz')).toBe(true);
		expect(isValidPushEndpoint('https://wns2-sn1p.notify.windows.com/w/?token=123')).toBe(true);
		expect(isValidPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
	});

	it('rejects arbitrary or malicious URLs (SSRF protection)', () => {
		expect(isValidPushEndpoint('http://web.push.apple.com/insecure')).toBe(false);
		expect(isValidPushEndpoint('https://evil.attacker.com/steal-data')).toBe(false);
		expect(isValidPushEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false);
		expect(isValidPushEndpoint('not-a-url')).toBe(false);
	});

	it('validates p256dh and auth key formats', () => {
		const validP256dh = 'BM5a_ZqWqjS6JqB1v7c3a0k3K0Vq9q7fX1zW4K2eG9wL3mP0qR8tY6uI4oP2aS8dF0gH2jK4lZ6xC8vB0nM2wE4rT6yU8';
		const validAuth = 'aB3_dE5-gH7_jK9-mN1_';

		expect(isValidPushKeys({ p256dh: validP256dh, auth: validAuth })).toBe(true);
		expect(isValidPushKeys({ p256dh: 'too_short', auth: validAuth })).toBe(false);
		expect(isValidPushKeys({ p256dh: validP256dh, auth: 'short' })).toBe(false);
		expect(isValidPushKeys(null)).toBe(false);
	});

	it('computes deterministic SHA-256 endpoint hash', async () => {
		const hash1 = await hashEndpoint('https://web.push.apple.com/test1');
		const hash2 = await hashEndpoint('https://web.push.apple.com/test1');
		const hash3 = await hashEndpoint('https://web.push.apple.com/test2');

		expect(hash1).toBe(hash2);
		expect(hash1).not.toBe(hash3);
		expect(hash1).toHaveLength(64);
	});
});
