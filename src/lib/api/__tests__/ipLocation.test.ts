import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupCityByIp } from '../ipLocation';

afterEach(() => {
	vi.unstubAllGlobals();
});

const GOOD_RESPONSE = {
	success: true,
	ip: '1.2.3.4',
	city: 'Cheboksary',
	country_code: 'RU',
	latitude: 56.1322,
	longitude: 47.2519,
	timezone: { id: 'Europe/Moscow', abbr: 'MSK' }
};

describe('lookupCityByIp', () => {
	it('parses a valid response into coordinates and city', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response(JSON.stringify(GOOD_RESPONSE), { status: 200 }))
		);
		const result = await lookupCityByIp();
		expect(result).toEqual({
			latitude: 56.1322,
			longitude: 47.2519,
			city: 'Cheboksary',
			countryCode: 'RU',
			timezone: 'Europe/Moscow'
		});
	});

	it('returns empty timezone string when provider omits it (store applies its own fallback)', async () => {
		const noTz = { ...GOOD_RESPONSE, timezone: {} };
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(new Response(JSON.stringify(noTz), { status: 200 }))
		);
		expect((await lookupCityByIp())?.timezone).toBe('');
	});

	it('returns null on network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		expect(await lookupCityByIp()).toBeNull();
	});

	it('returns null on non-ok status', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));
		expect(await lookupCityByIp()).toBeNull();
	});

	it('returns null when provider reports failure or bad payload', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 }))
		);
		expect(await lookupCityByIp()).toBeNull();

		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					new Response(JSON.stringify({ success: true, city: 'X' }), { status: 200 })
				)
		);
		expect(await lookupCityByIp()).toBeNull();
	});

	it('aborts after the timeout', async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			'fetch',
			vi.fn((_url: string, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(new Error('timeout')));
				})
			)
		);
		const pending = lookupCityByIp();
		await vi.advanceTimersByTimeAsync(3100);
		expect(await pending).toBeNull();
		vi.useRealTimers();
	});
});
