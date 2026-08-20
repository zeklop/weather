import { describe, it, expect, vi } from 'vitest';
import { fetchRainViewerData, getRadarTileUrl, formatRadarFrameLabel } from '../rainviewer';
import { createBasemapStyle, updateRadarLayer } from '../weatherLayer';

describe('Map page integrations and helpers', () => {
	it('formats timeline steps cleanly for both past and nowcast frames', () => {
		const baseTime = 1787248200;
		const nowMs = baseTime * 1000;

		const frameMinus40 = formatRadarFrameLabel(baseTime - 40 * 60, nowMs, 'ru');
		const frameNow = formatRadarFrameLabel(baseTime, nowMs, 'ru');
		const framePlus20 = formatRadarFrameLabel(baseTime + 20 * 60, nowMs, 'ru');

		expect(frameMinus40).toBe('-40 мин');
		expect(frameNow).toBe('Сейчас');
		expect(framePlus20).toBe('+20 мин');
	});

	it('updates radar layer sources and layers on map instance', () => {
		const mockLayers = new Map<string, any>();
		const mockSources = new Map<string, any>();

		const mockMap = {
			getSource: vi.fn((id: string) => mockSources.get(id)),
			addSource: vi.fn((id: string, src: any) => mockSources.set(id, src)),
			removeSource: vi.fn((id: string) => mockSources.delete(id)),
			getLayer: vi.fn((id: string) => mockLayers.get(id)),
			addLayer: vi.fn((layer: any) => mockLayers.set(layer.id, layer)),
			removeLayer: vi.fn((id: string) => mockLayers.delete(id))
		};

		const tileUrl = getRadarTileUrl('https://tilecache.rainviewer.com', '/v2/radar/123456');
		updateRadarLayer(mockMap, tileUrl, 0.8, true);

		expect(mockMap.addSource).toHaveBeenCalled();
		expect(mockMap.addLayer).toHaveBeenCalled();
		expect(mockLayers.get('rainviewer-radar-layer')?.paint?.['raster-opacity']).toBe(0.8);
		expect(mockLayers.get('rainviewer-radar-layer')?.layout?.visibility).toBe('visible');

		// Updating with hidden visibility
		updateRadarLayer(mockMap, tileUrl, 0.8, false);
		expect(mockLayers.get('rainviewer-radar-layer')?.layout?.visibility).toBe('none');
	});
});
