import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env, SubscriptionRecord } from '../types';

// Mock crypto primitives: we only assert on the plaintext payload passed in
vi.mock('../crypto/webpush', () => ({
	encryptWebPushPayload: vi.fn(async (payload: string) => ({
		body: new TextEncoder().encode(payload),
		contentEncoding: 'aes128gcm'
	}))
}));

vi.mock('../crypto/vapid', () => ({
	importVapidPrivateKey: vi.fn(async () => ({}) as CryptoKey),
	createVapidAuthHeader: vi.fn(async () => ({ authorization: 'vapid t=test,k=test' }))
}));

vi.mock('../alerts/evaluator', () => ({
	evaluateWeatherConditions: vi.fn(() => [
		{ id: 'a1', type: 'rain', title: 'Rain', message: 'Take an umbrella', severity: 'moderate' }
	])
}));

vi.mock('../alerts/dedup', () => ({
	shouldSendAlertToSubscriber: vi.fn(() => ({ send: true }))
}));

import { handleScheduled } from '../routes/cron';
import { encryptWebPushPayload } from '../crypto/webpush';

function makeSub(basePath: string): SubscriptionRecord {
	return {
		endpoint_hash: 'hash-' + basePath,
		endpoint: 'https://fcm.googleapis.com/fcm/send/token-' + (basePath || 'root'),
		p256dh: 'p',
		auth: 'a',
		city_name: 'Test City',
		latitude: 56.13,
		longitude: 47.25,
		timezone: 'Europe/Moscow',
		language: 'en',
		platform: 'desktop',
		alert_types: '{}',
		base_path: basePath,
		created_at: 0,
		last_seen_at: Date.now(),
		last_alert_sent_at: null
	};
}

function makeEnv(subs: SubscriptionRecord[]): Env {
	const prepare = (sql: string) => {
		if (sql.includes('COUNT(*)')) {
			return { first: async () => ({ count: 1 }) };
		}
		if (sql.includes('MIN(city_name)')) {
			return { bind: () => ({ all: async () => ({ results: [{ latitude: 56.13, longitude: 47.25, city_name: 'Test City' }] }) }) };
		}
		if (sql.includes('SELECT * FROM subscriptions')) {
			return { bind: () => ({ all: async () => ({ results: subs }) }) };
		}
		return { bind: () => ({ run: async () => {} }) };
	};
	return {
		DB: { prepare },
		PUBLIC_VAPID_KEY: 'test-public-key',
		VAPID_PRIVATE_KEY: 'test-private-key',
		APP_BASE_PATH: '/weather'
	} as unknown as Env;
}

describe('cron push base path resolution', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.includes('api.open-meteo.com')) {
				return new Response(JSON.stringify({ hourly: { time: [] }, timezone: 'UTC' }), { status: 200 });
			}
			return new Response(null, { status: 201 });
		}) as unknown as typeof fetch;
	});

	it('preserves empty base_path instead of falling back to APP_BASE_PATH', async () => {
		await handleScheduled(makeEnv([makeSub(''), makeSub('/weather')]));
		const payloads = vi.mocked(encryptWebPushPayload).mock.calls.map((c) => JSON.parse(c[0] as string));
		const icons = payloads.map((p) => p.icon).sort();
		expect(icons).toEqual(['/icons/app/icon-192.png', '/weather/icons/app/icon-192.png']);
		expect(payloads.some((p) => p.icon === '/icons/app/icon-192.png' && p.data.url === '/')).toBe(true);
		expect(payloads.every((p) => p.icon !== '/weather/icons/app/icon-192.png' || p.data.url === '/weather/')).toBe(true);
	});

	it('prefixes push title with the subscriber city name', async () => {
		await handleScheduled(makeEnv([makeSub('')]));
		const payloads = vi.mocked(encryptWebPushPayload).mock.calls.map((c) => JSON.parse(c[0] as string));
		expect(payloads[0].title).toBe('Test City: Rain');
	});
});
