import { describe, it, expect } from 'vitest';
import { encryptWebPushPayload } from '../crypto/webpush';
import { base64UrlEncode } from '../crypto/vapid';

describe('RFC 8291 Web Push Encryption', () => {
	it('encrypts payload into valid binary structure with salt, record size, and key headers', async () => {
		// Generate subscriber test keypair
		const subscriberKeyPair = (await crypto.subtle.generateKey(
			{ name: 'ECDH', namedCurve: 'P-256' },
			true,
			['deriveBits']
		)) as CryptoKeyPair;

		const subscriberPubRaw = new Uint8Array(
			await crypto.subtle.exportKey('raw', subscriberKeyPair.publicKey)
		);
		const subscriberP256dh = base64UrlEncode(subscriberPubRaw);

		// 16-byte random auth
		const authBytes = new Uint8Array(16);
		crypto.getRandomValues(authBytes);
		const subscriberAuth = base64UrlEncode(authBytes);

		const plaintext = JSON.stringify({ title: 'Test Alert', body: 'Rain starting in 15 mins' });
		const encrypted = await encryptWebPushPayload(plaintext, subscriberP256dh, subscriberAuth);

		expect(encrypted.contentEncoding).toBe('aes128gcm');
		expect(encrypted.body.byteLength).toBeGreaterThan(16 + 4 + 1 + 65 + plaintext.length);

		// Verify header offsets:
		// salt (16 bytes)
		// rs (4 bytes) -> 4096 (0x00, 0x00, 0x10, 0x00)
		expect(encrypted.body[16]).toBe(0x00);
		expect(encrypted.body[17]).toBe(0x00);
		expect(encrypted.body[18]).toBe(0x10);
		expect(encrypted.body[19]).toBe(0x00);

		// idlen (1 byte) -> 65 (0x41)
		expect(encrypted.body[20]).toBe(65);
	});
});
