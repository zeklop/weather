import type { BasemapTheme } from './types';

export const CARTO_LIGHT_TILES = [
	'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
	'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
	'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
	'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
];

export const CARTO_DARK_TILES = [
	'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
	'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
	'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png',
	'https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png'
];

export const OSM_TILES = [
	'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
];

export interface MaplibreStyleSpec {
	version: 8;
	sources: Record<string, {
		type: 'raster';
		tiles: string[];
		tileSize: number;
		attribution?: string;
		minzoom?: number;
		maxzoom?: number;
	}>;
	layers: Array<{
		id: string;
		type: 'raster';
		source: string;
		minzoom?: number;
		maxzoom?: number;
		paint?: Record<string, number | string>;
		layout?: Record<string, string>;
	}>;
}

/**
 * Creates a MapLibre raster style specification for the requested theme.
 */
export function createBasemapStyle(theme: BasemapTheme): MaplibreStyleSpec {
	let tiles = CARTO_LIGHT_TILES;
	let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';

	if (theme === 'dark') {
		tiles = CARTO_DARK_TILES;
	} else if (theme === 'osm') {
		tiles = OSM_TILES;
		attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
	}

	return {
		version: 8,
		sources: {
			basemap: {
				type: 'raster',
				tiles,
				tileSize: 256,
				attribution,
				minzoom: 0,
				maxzoom: 19
			}
		},
		layers: [
			{
				id: 'basemap-layer',
				type: 'raster',
				source: 'basemap',
				minzoom: 0,
				maxzoom: 19
			}
		]
	};
}

export const RADAR_SOURCE_ID = 'rainviewer-radar-source';
export const RADAR_LAYER_ID = 'rainviewer-radar-layer';

/**
 * Safely adds or updates the RainViewer radar raster layer on a MapLibre map.
 */
export function updateRadarLayer(
	map: {
		getSource: (id: string) => any;
		addSource: (id: string, source: any) => void;
		getLayer: (id: string) => any;
		addLayer: (layer: any) => void;
		setLayoutProperty?: (layerId: string, name: string, value: any) => void;
		setPaintProperty?: (layerId: string, name: string, value: any) => void;
		removeLayer: (id: string) => void;
		removeSource: (id: string) => void;
	},
	tileUrl: string,
	opacity = 0.75,
	visible = true
): void {
	if (!map) return;

	try {
		// If source already exists, re-creating or updating tiles
		if (map.getLayer(RADAR_LAYER_ID)) {
			map.removeLayer(RADAR_LAYER_ID);
		}
		if (map.getSource(RADAR_SOURCE_ID)) {
			map.removeSource(RADAR_SOURCE_ID);
		}

		map.addSource(RADAR_SOURCE_ID, {
			type: 'raster',
			tiles: [tileUrl],
			tileSize: 256,
			minzoom: 0,
			maxzoom: 19
		});

		map.addLayer({
			id: RADAR_LAYER_ID,
			type: 'raster',
			source: RADAR_SOURCE_ID,
			layout: {
				visibility: visible ? 'visible' : 'none'
			},
			paint: {
				'raster-opacity': opacity,
				'raster-fade-duration': 150
			}
		});
	} catch (e) {
		console.error('Failed to update radar layer on map:', e);
	}
}
