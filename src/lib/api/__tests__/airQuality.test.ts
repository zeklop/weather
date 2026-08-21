import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getAirQuality,
	getDetailedAirQuality,
	normalizeAirQuality,
	normalizeDetailedAirQuality
} from '../airQuality';

describe('airQuality API client', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('normalizeAirQuality & normalizeDetailedAirQuality', () => {
		it('extracts AQI and pollutants correctly from valid Open-Meteo payload', () => {
			const raw = {
				current: {
					european_aqi: 35,
					pm10: 18.5,
					pm2_5: 9.2,
					carbon_monoxide: 250,
					nitrogen_dioxide: 14.1,
					sulphur_dioxide: 5.3,
					ozone: 48.0,
					alder_pollen: 0,
					birch_pollen: 25.4,
					grass_pollen: 3.1,
					mugwort_pollen: 0,
					olive_pollen: null,
					ragweed_pollen: 0
				}
			};

			expect(normalizeAirQuality(raw)).toBe(35);

			const detailed = normalizeDetailedAirQuality(raw);
			expect(detailed).not.toBeNull();
			expect(detailed?.aqi).toBe(35);
			expect(detailed?.pollutants.pm2_5).toBe(9.2);
			expect(detailed?.pollutants.pm10).toBe(18.5);
			expect(detailed?.pollutants.carbonMonoxide).toBe(250);
			expect(detailed?.pollen.birch).toBe(25.4);
			expect(detailed?.pollen.olive).toBeNull();
			expect(detailed?.hasPollenCoverage).toBe(true);
		});

		it('handles missing pollen coverage (all pollen null outside Europe)', () => {
			const raw = {
				current: {
					european_aqi: 45,
					pm10: 22,
					pm2_5: 12,
					alder_pollen: null,
					birch_pollen: null,
					grass_pollen: null,
					mugwort_pollen: null,
					olive_pollen: null,
					ragweed_pollen: null
				}
			};

			const detailed = normalizeDetailedAirQuality(raw);
			expect(detailed).not.toBeNull();
			expect(detailed?.aqi).toBe(45);
			expect(detailed?.hasPollenCoverage).toBe(false);
		});

		it('returns null on invalid payloads', () => {
			expect(normalizeAirQuality(null)).toBeNull();
			expect(normalizeAirQuality({})).toBeNull();
			expect(normalizeAirQuality({ current: null })).toBeNull();
			expect(normalizeDetailedAirQuality(null)).toBeNull();
			expect(normalizeDetailedAirQuality({})).toBeNull();
		});
	});

	describe('getDetailedAirQuality network flow', () => {
		it('fetches and parses data successfully', async () => {
			const payload = {
				current: {
					european_aqi: 22,
					pm2_5: 8,
					pm10: 14,
					nitrogen_dioxide: 10,
					sulphur_dioxide: 4,
					ozone: 30,
					carbon_monoxide: 180,
					alder_pollen: 0,
					birch_pollen: 0,
					grass_pollen: 0,
					mugwort_pollen: 0,
					olive_pollen: 0,
					ragweed_pollen: 0
				}
			};

			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				new Response(JSON.stringify(payload), { status: 200 })
			);

			const result = await getDetailedAirQuality(55.75, 37.61);
			expect(result).not.toBeNull();
			expect(result?.aqi).toBe(22);
			expect(result?.hasPollenCoverage).toBe(true);
		});

		it('returns null on HTTP error response', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
				new Response('Server error', { status: 500 })
			);

			const result = await getDetailedAirQuality(55.75, 37.61);
			expect(result).toBeNull();
		});

		it('returns null on network timeout / abort', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('AbortError'));

			const result = await getDetailedAirQuality(55.75, 37.61);
			expect(result).toBeNull();
		});
	});
});
