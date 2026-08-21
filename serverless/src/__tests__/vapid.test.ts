import { describe, it, expect } from 'vitest';
import { base64UrlEncode, base64UrlDecode, createVapidAuthHeader, importVapidPrivateKey } from '../crypto/vapid';

describe('VAPID & Base64URL Cryptography', () => {
	it('correctly round-trips base64url encode and decode', () => {
		const original = new Uint8Array([1, 2, 3, 4, 250, 255, 0, 128]);
		const encoded = base64UrlEncode(original);
		expect(encoded).not.toContain('+');
		expect(encoded).not.toContain('/');
		expect(encoded).not.toContain('=');

		const decoded = base64UrlDecode(encoded);
		expect(Array.from(decoded)).toEqual(Array.from(original));
	});

	it('creates valid VAPID Authorization header with ES256 signature', async () => {
		// Generate an ephemeral P-256 keypair for testing
		const keyPair = (await crypto.subtle.generateKey(
			{ name: 'ECDSA', namedCurve: 'P-256' },
			true,
			['sign']
		)) as CryptoKeyPair;

		const pubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
		const pubKeyBase64Url = base64UrlEncode(pubRaw);

		const header = await createVapidAuthHeader(
			'https://fcm.googleapis.com/fcm/send/test',
			pubKeyBase64Url,
			keyPair.privateKey,
			'mailto:admin@weather.app'
		);

		expect(header.authorization).toMatch(/^vapid t=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+, k=[A-Za-z0-9_-]+$/);
	});

	it('imports a raw 32-byte VAPID scalar (web-push generate-vapid-keys format)', async () => {
		// Known vector: d = 1 must derive the P-256 generator point G
		const G_X = '6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296';
		const G_Y = '4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5';
		const hexToBase64Url = (hex: string) => base64UrlEncode(new Uint8Array(hex.match(/../g)!.map((b) => parseInt(b, 16))));

		const dOne = new Uint8Array(32);
		dOne[31] = 1;
		const importedG = await importVapidPrivateKey(base64UrlEncode(dOne));
		expect(importedG.type).toBe('private');

		const data = new TextEncoder().encode('vapid test');
		const signatureG = await crypto.subtle.sign({ name: 'ECDSA', hash: { name: 'SHA-256' } }, importedG, data);
		const gPublic = await crypto.subtle.importKey(
			'jwk',
			{ kty: 'EC', crv: 'P-256', x: hexToBase64Url(G_X), y: hexToBase64Url(G_Y) },
			{ name: 'ECDSA', namedCurve: 'P-256' },
			false,
			['verify']
		);
		expect(await crypto.subtle.verify({ name: 'ECDSA', hash: { name: 'SHA-256' } }, gPublic, signatureG, data)).toBe(true);

		// Random keypair round-trip: extract the scalar d from a generated key,
		// re-import it raw, and verify signatures against the original public key
		const keyPair = (await crypto.subtle.generateKey(
			{ name: 'ECDSA', namedCurve: 'P-256' },
			true,
			['sign', 'verify']
		)) as CryptoKeyPair;
		const jwk = (await crypto.subtle.exportKey('jwk', keyPair.privateKey)) as JsonWebKey;

		const imported = await importVapidPrivateKey(jwk.d!);
		const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: { name: 'SHA-256' } }, imported, data);
		expect(
			await crypto.subtle.verify({ name: 'ECDSA', hash: { name: 'SHA-256' } }, keyPair.publicKey, signature, data)
		).toBe(true);
	});
});
