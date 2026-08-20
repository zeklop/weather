import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	fetchRainViewerData,
	getRadarTileUrl,
	formatRadarFrameLabel,
	type RainViewerApiResponse
} from '../rainviewer';

describe('rainviewer map layer utilities', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('getRadarTileUrl', () => {
		it('constructs standard RainViewer raster tile URL template', () => {
			const host = 'https://tilecache.rainviewer.com';
			const path = '/v2/radar/1787248200';
			const url = getRadarTileUrl(host, path);
			expect(url).toBe('https://tilecache.rainviewer.com/v2/radar/1787248200/256/{z}/{x}/{y}/2/1_1.png');
		});

		it('supports 512px tile size and color options', () => {
			const host = 'https://tilecache.rainviewer.com';
			const path = '/v2/radar/1787248200';
			const url = getRadarTileUrl(host, path, { size: 512, colorScheme: 4, smooth: false, snow: false });
			expect(url).toBe('https://tilecache.rainviewer.com/v2/radar/1787248200/512/{z}/{x}/{y}/4/0_0.png');
		});
	});

	describe('formatRadarFrameLabel', () => {
		it('formats past timestamps with negative minutes or HH:mm', () => {
			const nowMs = 1787248200 * 1000; // Reference "now"
			const past20m = (1787248200 - 20 * 60) * 1000;

			const labelRu = formatRadarFrameLabel(past20m / 1000, nowMs, 'ru');
			expect(labelRu).toContain('20');

			const labelEn = formatRadarFrameLabel(past20m / 1000, nowMs, 'en');
			expect(labelEn).toContain('20');
		});

		it('formats current/latest timestamp as "Сейчас" / "Now"', () => {
			const nowSec = 1787248200;
			expect(formatRadarFrameLabel(nowSec, nowSec * 1000, 'ru')).toBe('Сейчас');
			expect(formatRadarFrameLabel(nowSec, nowSec * 1000, 'en')).toBe('Now');
		});
	});

	describe('fetchRainViewerData', () => {
		it('parses past and nowcast radar frames properly', async () => {
			const mockPayload: RainViewerApiResponse = {
				version: 'v2',
				generated: 1787248200,
				host: 'https://tilecache.rainviewer.com',
				radar: {
					past: [
						{ time: 1787247000, path: '/v2/radar/4909c9cb4b1b' },
						{ time: 1787248200, path: '/v2/radar/82b000db4e29' }
					],
					nowcast: [
						{ time: 1787248800, path: '/v2/radar/nowcast_82b000db4e29' }
					]
				}
			};

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockPayload
			});

			const result = await fetchRainViewerData(mockFetch as unknown as typeof fetch);
			expect(result.host).toBe('https://tilecache.rainviewer.com');
			expect(result.frames.length).toBe(3);
			expect(result.frames[0]?.isPast).toBe(true);
			expect(result.frames[2]?.isNowcast).toBe(true);
			expect(result.frames[1]?.tileUrl).toContain('82b000db4e29');
		});

		it('handles API errors gracefully and returns empty list', async () => {
			const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
			const result = await fetchRainViewerData(mockFetch as unknown as typeof fetch);
			expect(result.frames).toEqual([]);
		});
	});
});
