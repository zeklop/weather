export interface RadarFrame {
	time: number; // Unix timestamp in seconds
	path: string;
	tileUrl: string;
	label: string;
	isPast: boolean;
	isNowcast: boolean;
}

export interface RainViewerApiResponse {
	version: string;
	generated: number;
	host: string;
	radar: {
		past: { time: number; path: string }[];
		nowcast?: { time: number; path: string }[];
	};
	satellite?: {
		infrared?: { time: number; path: string }[];
	};
}

export type BasemapTheme = 'light' | 'dark' | 'osm';
export type MapLayerType = 'radar' | 'standard';
