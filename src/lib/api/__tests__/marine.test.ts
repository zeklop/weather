import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMarineData, normalizeMarine } from '../marine';

describe('marine API client', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		if (typeof localStorage !== 'undefined') {
			localStorage.clear();
		}
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('normalizeMarine', () => {
		it('extracts sea surface temperature and wave height correctly', () => {
			const raw = {
				current: {
					sea_surface_temperature: 23.4,
					wave_height: 1.2
				}
			};
			const data = normalizeMarine(raw);
			expect(data).not.toBeNull();
			expect(data?.seaTemperature).toBe(23.4);
			expect(data?.waveHeight).toBe(1.2);
		});

		it('returns null if both sea temperature and wave height are missing or null', () => {
			expect(normalizeMarine(null)).toBeNull();
			expect(normalizeMarine({})).toBeNull();
			expect(normalizeMarine({ current: { sea_surface_temperature: null, wave_height: null } })).toBeNull();
		});
	});

	describe('getMarineData network flow & negative caching', () => {
		it('fetches marine data for sea coordinates successfully', async () => {
			const raw = {
				current: {
					sea_surface_temperature: 21.0,
					wave_height: 0.8
				}
			};
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				new Response(JSON.stringify(raw), { status: 200 })
			);

			const result = await getMarineData(43.58, 39.72); // Sochi
			expect(result).not.toBeNull();
			expect(result?.seaTemperature).toBe(21.0);
			expect(result?.waveHeight).toBe(0.8);
		});

		it('gracefully handles HTTP 400 (inland location) by returning null and caching negatively', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				new Response(JSON.stringify({ error: true, reason: 'Latitude not on sea' }), {
					status: 400
				})
			);

			// First call: hits network and gets 400
			const result1 = await getMarineData(55.75, 37.61); // Moscow
			expect(result1).toBeNull();
			expect(globalThis.fetch).toHaveBeenCalledTimes(1);

			// Second call: served from negative cache immediately without calling fetch
			const result2 = await getMarineData(55.75, 37.61);
			expect(result2).toBeNull();
			expect(globalThis.fetch).toHaveBeenCalledTimes(1); // No new network call
		});

		it('returns null on network failure/timeout', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

			const result = await getMarineData(30.0, 30.0);
			expect(result).toBeNull();
		});
	});
});
