import { describe, it, expect } from 'vitest';
import { buildTargetQuery, validateBroadcastBody, handleBroadcast } from '../routes/broadcast';
import type { Env } from '../types';

describe('buildTargetQuery', () => {
	it('returns no WHERE clause when there are no filters', () => {
		const { sql, binds } = buildTargetQuery({});
		expect(sql).toBe('SELECT * FROM subscriptions');
		expect(binds).toEqual([]);
	});

	it('filters by language when language is ru', () => {
		const { sql, binds } = buildTargetQuery({ language: 'ru' });
		expect(sql).toBe('SELECT * FROM subscriptions WHERE language = ?');
		expect(binds).toEqual(['ru']);
	});

	it('filters by language when language is en', () => {
		const { sql, binds } = buildTargetQuery({ language: 'en' });
		expect(sql).toBe('SELECT * FROM subscriptions WHERE language = ?');
		expect(binds).toEqual(['en']);
	});

	it('ignores language=all', () => {
		const { sql, binds } = buildTargetQuery({ language: 'all' });
		expect(sql).toBe('SELECT * FROM subscriptions');
		expect(binds).toEqual([]);
	});

	it('filters by coordinates only', () => {
		const { sql, binds } = buildTargetQuery({ latitude: 56.13, longitude: 47.25 });
		expect(sql).toBe('SELECT * FROM subscriptions WHERE latitude = ? AND longitude = ?');
		expect(binds).toEqual([56.13, 47.25]);
	});

	it('combines language and coordinates in order', () => {
		const { sql, binds } = buildTargetQuery({ language: 'ru', latitude: 56.13, longitude: 47.25 });
		expect(sql).toBe('SELECT * FROM subscriptions WHERE language = ? AND latitude = ? AND longitude = ?');
		expect(binds).toEqual(['ru', 56.13, 47.25]);
	});
});

describe('handleBroadcast auth', () => {
	const request = (auth?: string) =>
		new Request('https://worker/api/push/broadcast', {
			method: 'POST',
			headers: auth ? { Authorization: auth } : {},
			body: JSON.stringify({ body: 'hi' })
		});

	it('returns 503 when ADMIN_TOKEN is not configured', async () => {
		const res = await handleBroadcast(request(), {} as Env);
		expect(res.status).toBe(503);
		const json = await res.json() as { error: string };
		expect(json.error).toContain('ADMIN_TOKEN');
	});

	it('returns 401 on wrong bearer token', async () => {
		const env = { ADMIN_TOKEN: 'secret' } as Env;
		const res = await handleBroadcast(request('Bearer wrong'), env);
		expect(res.status).toBe(401);
	});
});

describe('validateBroadcastBody', () => {
	it('rejects missing body', () => {
		const result = validateBroadcastBody({});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain('body');
	});

	it('rejects non-object body', () => {
		expect(validateBroadcastBody(null).ok).toBe(false);
		expect(validateBroadcastBody('string').ok).toBe(false);
	});

	it('rejects empty body string', () => {
		const result = validateBroadcastBody({ body: '' });
		expect(result.ok).toBe(false);
	});

	it('rejects body longer than 500 chars', () => {
		const result = validateBroadcastBody({ body: 'a'.repeat(501) });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain('500');
	});

	it('rejects title longer than 100 chars', () => {
		const result = validateBroadcastBody({ body: 'hi', title: 't'.repeat(101) });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain('title');
	});

	it('rejects invalid language', () => {
		expect(validateBroadcastBody({ body: 'hi', language: 'fr' }).ok).toBe(false);
		expect(validateBroadcastBody({ body: 'hi', language: 42 }).ok).toBe(false);
	});

	it('accepts valid languages', () => {
		for (const language of ['all', 'ru', 'en']) {
			expect(validateBroadcastBody({ body: 'hi', language }).ok).toBe(true);
		}
	});

	it('rejects coordinates without a pair', () => {
		expect(validateBroadcastBody({ body: 'hi', latitude: 56 }).ok).toBe(false);
		expect(validateBroadcastBody({ body: 'hi', longitude: 47 }).ok).toBe(false);
	});

	it('rejects non-finite coordinates', () => {
		expect(validateBroadcastBody({ body: 'hi', latitude: NaN, longitude: 47 }).ok).toBe(false);
		expect(validateBroadcastBody({ body: 'hi', latitude: 'x', longitude: 47 }).ok).toBe(false);
	});

	it('accepts minimal valid body', () => {
		const result = validateBroadcastBody({ body: 'Sunny day' });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual({ body: 'Sunny day' });
	});

	it('accepts full valid body', () => {
		const raw = {
			title: 'Heads up',
			body: 'Sunny day',
			language: 'ru',
			latitude: 56.13,
			longitude: 47.25
		};
		const result = validateBroadcastBody(raw);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(raw);
	});
});
