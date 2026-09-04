import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSubscribe } from '../routes/subscribe';
import type { Env } from '../types';

const VALID_KEYS = {
	p256dh: 'B'.repeat(87),
	auth: 'A'.repeat(22)
};

function makeBody(base_path?: unknown) {
	return {
		endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
		keys: VALID_KEYS,
		city_name: 'Test City',
		latitude: 56.13,
		longitude: 47.25,
		timezone: 'Europe/Moscow',
		language: 'ru',
		base_path,
		alert_types: { rain: true }
	};
}

function makeEnv(onInsert?: (args: unknown[]) => void) {
	const run = vi.fn().mockResolvedValue({});
	return {
		DB: {
			prepare: vi.fn((sql: string) => ({
				bind: (...args: unknown[]) => {
					if (sql.includes('ON CONFLICT')) onInsert?.(args);
					return { run };
				}
			})),
			run
		}
	} as unknown as Env & { DB: { prepare: ReturnType<typeof vi.fn> } };
}

function makeRequest(body: unknown): Request {
	return new Request('https://worker.example/api/push/subscribe', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'cf-connecting-ip': '192.0.2.' + Math.floor(Math.random() * 200 + 1) }
	});
}

describe('subscribe base_path validation', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		['accepts root path', '', 200],
		['accepts subpath', '/weather', 200],
		['rejects missing leading slash', 'weather', 400],
		['rejects trailing slash', '/weather/', 400],
		['rejects traversal', '/../etc', 400],
		['rejects spaces', '/a b', 400],
		['rejects overlong value', '/' + 'a'.repeat(64), 400]
	])('%s', async (_name, basePath, expectedStatus) => {
		const env = makeEnv();
		const res = await handleSubscribe(makeRequest(makeBody(basePath)), env);
		expect(res.status).toBe(expectedStatus);
	});

	it('treats absent base_path as empty string and persists it', async () => {
		let bound: unknown[] = [];
		const env = makeEnv((args) => (bound = args));
		const res = await handleSubscribe(makeRequest(makeBody(undefined)), env);
		expect(res.status).toBe(200);
		expect(bound[11]).toBe('');
	});

	it('persists provided subpath', async () => {
		let bound: unknown[] = [];
		const env = makeEnv((args) => (bound = args));
		const res = await handleSubscribe(makeRequest(makeBody('/weather')), env);
		expect(res.status).toBe(200);
		expect(bound[11]).toBe('/weather');
	});
});

describe('subscribe wind_unit', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('persists explicit mph', async () => {
		let bound: unknown[] = [];
		const env = makeEnv((args) => (bound = args));
		const res = await handleSubscribe(makeRequest({ ...makeBody(''), wind_unit: 'mph' }), env);
		expect(res.status).toBe(200);
		expect(bound[12]).toBe('mph');
	});

	it('coerces unknown values to ms instead of rejecting the subscription', async () => {
		let bound: unknown[] = [];
		const env = makeEnv((args) => (bound = args));
		const res = await handleSubscribe(makeRequest({ ...makeBody(''), wind_unit: 'kmh' }), env);
		expect(res.status).toBe(200);
		expect(bound[12]).toBe('ms');
	});

	it('defaults to ms when absent', async () => {
		let bound: unknown[] = [];
		const env = makeEnv((args) => (bound = args));
		const res = await handleSubscribe(makeRequest(makeBody('')), env);
		expect(res.status).toBe(200);
		expect(bound[12]).toBe('ms');
	});
});
