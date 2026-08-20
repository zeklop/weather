import { describe, it, expect } from 'vitest';
import {
	createBasemapStyle,
	CARTO_LIGHT_TILES,
	CARTO_DARK_TILES,
	OSM_TILES
} from '../weatherLayer';

describe('weatherLayer style configurations', () => {
	it('creates light style with CartoDB Voyager tiles by default', () => {
		const style = createBasemapStyle('light');
		expect(style.version).toBe(8);
		const source = style.sources?.['basemap'] as { type: string; tiles: string[] };
		expect(source).toBeDefined();
		expect(source.type).toBe('raster');
		expect(source.tiles).toEqual(CARTO_LIGHT_TILES);
		const layer = style.layers?.[0];
		expect(layer?.id).toBe('basemap-layer');
	});

	it('creates dark style with CartoDB Dark tiles', () => {
		const style = createBasemapStyle('dark');
		const source = style.sources?.['basemap'] as { type: string; tiles: string[] };
		expect(source.tiles).toEqual(CARTO_DARK_TILES);
	});

	it('supports fallback to OSM tiles', () => {
		const style = createBasemapStyle('osm');
		const source = style.sources?.['basemap'] as { type: string; tiles: string[] };
		expect(source.tiles).toEqual(OSM_TILES);
	});
});
