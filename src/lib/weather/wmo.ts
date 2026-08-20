import type { Language } from '$lib/i18n/translations';

export type WeatherVisual = {
	code: number;
	label: string;
	shortLabel: string;
	labelRu: string;
	shortLabelRu: string;
	labelEn: string;
	shortLabelEn: string;
	iconDay: string;
	iconNight: string;
};

type Visual = Omit<WeatherVisual, 'code' | 'label' | 'shortLabel'>;

// Icons are @meteocons/svg fill-style names (verified against package v0.1.0).
// Fill set has no day/night variants for precip icons (drizzle/rain/snow/sleet) —
// same icon is used for both, which matches the set.
const VISUALS: Record<number, Visual> = {
	0: {
		labelRu: 'Ясно',
		shortLabelRu: 'Ясно',
		labelEn: 'Clear sky',
		shortLabelEn: 'Clear',
		iconDay: 'clear-day',
		iconNight: 'clear-night'
	},
	1: {
		labelRu: 'Преимущественно ясно',
		shortLabelRu: 'Ясно',
		labelEn: 'Mainly clear',
		shortLabelEn: 'Clear',
		iconDay: 'mostly-clear-day',
		iconNight: 'mostly-clear-night'
	},
	2: {
		labelRu: 'Переменная облачность',
		shortLabelRu: 'Облачно',
		labelEn: 'Partly cloudy',
		shortLabelEn: 'Cloudy',
		iconDay: 'partly-cloudy-day',
		iconNight: 'partly-cloudy-night'
	},
	3: {
		labelRu: 'Пасмурно',
		shortLabelRu: 'Пасмурно',
		labelEn: 'Overcast',
		shortLabelEn: 'Overcast',
		iconDay: 'overcast-day',
		iconNight: 'overcast-night'
	},
	45: {
		labelRu: 'Туман',
		shortLabelRu: 'Туман',
		labelEn: 'Fog',
		shortLabelEn: 'Fog',
		iconDay: 'fog-day',
		iconNight: 'fog-night'
	},
	48: {
		labelRu: 'Туман',
		shortLabelRu: 'Туман',
		labelEn: 'Depositing rime fog',
		shortLabelEn: 'Fog',
		iconDay: 'fog-day',
		iconNight: 'fog-night'
	},
	51: {
		labelRu: 'Морось',
		shortLabelRu: 'Морось',
		labelEn: 'Light drizzle',
		shortLabelEn: 'Drizzle',
		iconDay: 'drizzle',
		iconNight: 'drizzle'
	},
	53: {
		labelRu: 'Морось',
		shortLabelRu: 'Морось',
		labelEn: 'Moderate drizzle',
		shortLabelEn: 'Drizzle',
		iconDay: 'drizzle',
		iconNight: 'drizzle'
	},
	55: {
		labelRu: 'Морось',
		shortLabelRu: 'Морось',
		labelEn: 'Dense drizzle',
		shortLabelEn: 'Drizzle',
		iconDay: 'drizzle',
		iconNight: 'drizzle'
	},
	56: {
		labelRu: 'Ледяная морось',
		shortLabelRu: 'Морось',
		labelEn: 'Light freezing drizzle',
		shortLabelEn: 'Drizzle',
		iconDay: 'sleet',
		iconNight: 'sleet'
	},
	57: {
		labelRu: 'Ледяная морось',
		shortLabelRu: 'Морось',
		labelEn: 'Dense freezing drizzle',
		shortLabelEn: 'Drizzle',
		iconDay: 'sleet',
		iconNight: 'sleet'
	},
	61: {
		labelRu: 'Небольшой дождь',
		shortLabelRu: 'Дождь',
		labelEn: 'Slight rain',
		shortLabelEn: 'Rain',
		iconDay: 'rain',
		iconNight: 'rain'
	},
	63: {
		labelRu: 'Дождь',
		shortLabelRu: 'Дождь',
		labelEn: 'Moderate rain',
		shortLabelEn: 'Rain',
		iconDay: 'rain',
		iconNight: 'rain'
	},
	65: {
		labelRu: 'Сильный дождь',
		shortLabelRu: 'Дождь',
		labelEn: 'Heavy rain',
		shortLabelEn: 'Rain',
		iconDay: 'rain',
		iconNight: 'rain'
	},
	66: {
		labelRu: 'Ледяной дождь',
		shortLabelRu: 'Дождь',
		labelEn: 'Light freezing rain',
		shortLabelEn: 'Rain',
		iconDay: 'sleet',
		iconNight: 'sleet'
	},
	67: {
		labelRu: 'Ледяной дождь',
		shortLabelRu: 'Дождь',
		labelEn: 'Heavy freezing rain',
		shortLabelEn: 'Rain',
		iconDay: 'sleet',
		iconNight: 'sleet'
	},
	71: {
		labelRu: 'Небольшой снег',
		shortLabelRu: 'Снег',
		labelEn: 'Slight snow fall',
		shortLabelEn: 'Snow',
		iconDay: 'snow',
		iconNight: 'snow'
	},
	73: {
		labelRu: 'Снег',
		shortLabelRu: 'Снег',
		labelEn: 'Moderate snow fall',
		shortLabelEn: 'Snow',
		iconDay: 'snow',
		iconNight: 'snow'
	},
	75: {
		labelRu: 'Сильный снег',
		shortLabelRu: 'Снег',
		labelEn: 'Heavy snow fall',
		shortLabelEn: 'Snow',
		iconDay: 'snow',
		iconNight: 'snow'
	},
	77: {
		labelRu: 'Снежные зёрна',
		shortLabelRu: 'Снег',
		labelEn: 'Snow grains',
		shortLabelEn: 'Snow',
		iconDay: 'snow',
		iconNight: 'snow'
	},
	80: {
		labelRu: 'Ливень',
		shortLabelRu: 'Ливень',
		labelEn: 'Slight rain showers',
		shortLabelEn: 'Rain',
		iconDay: 'rain',
		iconNight: 'rain'
	},
	81: {
		labelRu: 'Ливень',
		shortLabelRu: 'Ливень',
		labelEn: 'Moderate rain showers',
		shortLabelEn: 'Rain',
		iconDay: 'rain',
		iconNight: 'rain'
	},
	82: {
		labelRu: 'Ливень',
		shortLabelRu: 'Ливень',
		labelEn: 'Violent rain showers',
		shortLabelEn: 'Rain',
		iconDay: 'rain',
		iconNight: 'rain'
	},
	85: {
		labelRu: 'Снегопад',
		shortLabelRu: 'Снегопад',
		labelEn: 'Slight snow showers',
		shortLabelEn: 'Snow',
		iconDay: 'snow',
		iconNight: 'snow'
	},
	86: {
		labelRu: 'Снегопад',
		shortLabelRu: 'Снегопад',
		labelEn: 'Heavy snow showers',
		shortLabelEn: 'Snow',
		iconDay: 'snow',
		iconNight: 'snow'
	},
	95: {
		labelRu: 'Гроза',
		shortLabelRu: 'Гроза',
		labelEn: 'Thunderstorm',
		shortLabelEn: 'Thunderstorm',
		iconDay: 'thunderstorms-day',
		iconNight: 'thunderstorms-night'
	},
	96: {
		labelRu: 'Гроза с градом',
		shortLabelRu: 'Гроза',
		labelEn: 'Thunderstorm with slight hail',
		shortLabelEn: 'Thunderstorm',
		iconDay: 'thunderstorms-day-rain',
		iconNight: 'thunderstorms-night-rain'
	},
	99: {
		labelRu: 'Гроза с градом',
		shortLabelRu: 'Гроза',
		labelEn: 'Thunderstorm with heavy hail',
		shortLabelEn: 'Thunderstorm',
		iconDay: 'thunderstorms-day-rain',
		iconNight: 'thunderstorms-night-rain'
	}
};

const FALLBACK_VISUAL: Visual = {
	labelRu: 'Неизвестно',
	shortLabelRu: 'Неизвестно',
	labelEn: 'Unknown',
	shortLabelEn: 'Unknown',
	iconDay: 'cloudy',
	iconNight: 'cloudy'
};

export const ICON_NAMES: readonly string[] = [
	...new Set([
		...Object.values(VISUALS).flatMap((v) => [v.iconDay, v.iconNight]),
		FALLBACK_VISUAL.iconDay,
		FALLBACK_VISUAL.iconNight
	])
];

export function getWeatherVisual(code: number, lang: Language = 'en'): WeatherVisual {
	const raw = VISUALS[code] ?? FALLBACK_VISUAL;
	const isRu = lang === 'ru';
	return {
		code,
		...raw,
		label: isRu ? raw.labelRu : raw.labelEn,
		shortLabel: isRu ? raw.shortLabelRu : raw.shortLabelEn
	};
}
