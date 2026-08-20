export type WeatherVisual = {
	code: number;
	labelRu: string;
	shortLabelRu: string;
	iconDay: string;
	iconNight: string;
};

type Visual = Omit<WeatherVisual, 'code'>;

// Icons are @meteocons/svg fill-style names (verified against package v0.1.0).
// Fill set has no day/night variants for precip icons (drizzle/rain/snow/sleet) —
// same icon is used for both, which matches the set.
const VISUALS: Record<number, Visual> = {
	0: { labelRu: 'Ясно', shortLabelRu: 'Ясно', iconDay: 'clear-day', iconNight: 'clear-night' },
	1: {
		labelRu: 'Преимущественно ясно',
		shortLabelRu: 'Ясно',
		iconDay: 'mostly-clear-day',
		iconNight: 'mostly-clear-night'
	},
	2: {
		labelRu: 'Переменная облачность',
		shortLabelRu: 'Облачно',
		iconDay: 'partly-cloudy-day',
		iconNight: 'partly-cloudy-night'
	},
	3: { labelRu: 'Пасмурно', shortLabelRu: 'Пасмурно', iconDay: 'overcast-day', iconNight: 'overcast-night' },
	45: { labelRu: 'Туман', shortLabelRu: 'Туман', iconDay: 'fog-day', iconNight: 'fog-night' },
	48: { labelRu: 'Туман', shortLabelRu: 'Туман', iconDay: 'fog-day', iconNight: 'fog-night' },
	51: { labelRu: 'Морось', shortLabelRu: 'Морось', iconDay: 'drizzle', iconNight: 'drizzle' },
	53: { labelRu: 'Морось', shortLabelRu: 'Морось', iconDay: 'drizzle', iconNight: 'drizzle' },
	55: { labelRu: 'Морось', shortLabelRu: 'Морось', iconDay: 'drizzle', iconNight: 'drizzle' },
	56: {
		labelRu: 'Ледяная морось',
		shortLabelRu: 'Морось',
		iconDay: 'sleet',
		iconNight: 'sleet'
	},
	57: {
		labelRu: 'Ледяная морось',
		shortLabelRu: 'Морось',
		iconDay: 'sleet',
		iconNight: 'sleet'
	},
	61: {
		labelRu: 'Небольшой дождь',
		shortLabelRu: 'Дождь',
		iconDay: 'rain',
		iconNight: 'rain'
	},
	63: { labelRu: 'Дождь', shortLabelRu: 'Дождь', iconDay: 'rain', iconNight: 'rain' },
	65: {
		labelRu: 'Сильный дождь',
		shortLabelRu: 'Дождь',
		iconDay: 'rain',
		iconNight: 'rain'
	},
	66: {
		labelRu: 'Ледяной дождь',
		shortLabelRu: 'Дождь',
		iconDay: 'sleet',
		iconNight: 'sleet'
	},
	67: {
		labelRu: 'Ледяной дождь',
		shortLabelRu: 'Дождь',
		iconDay: 'sleet',
		iconNight: 'sleet'
	},
	71: { labelRu: 'Небольшой снег', shortLabelRu: 'Снег', iconDay: 'snow', iconNight: 'snow' },
	73: { labelRu: 'Снег', shortLabelRu: 'Снег', iconDay: 'snow', iconNight: 'snow' },
	75: { labelRu: 'Сильный снег', shortLabelRu: 'Снег', iconDay: 'snow', iconNight: 'snow' },
	77: { labelRu: 'Снежные зёрна', shortLabelRu: 'Снег', iconDay: 'snow', iconNight: 'snow' },
	80: { labelRu: 'Ливень', shortLabelRu: 'Ливень', iconDay: 'rain', iconNight: 'rain' },
	81: { labelRu: 'Ливень', shortLabelRu: 'Ливень', iconDay: 'rain', iconNight: 'rain' },
	82: { labelRu: 'Ливень', shortLabelRu: 'Ливень', iconDay: 'rain', iconNight: 'rain' },
	85: { labelRu: 'Снегопад', shortLabelRu: 'Снегопад', iconDay: 'snow', iconNight: 'snow' },
	86: { labelRu: 'Снегопад', shortLabelRu: 'Снегопад', iconDay: 'snow', iconNight: 'snow' },
	95: {
		labelRu: 'Гроза',
		shortLabelRu: 'Гроза',
		iconDay: 'thunderstorms-day',
		iconNight: 'thunderstorms-night'
	},
	96: {
		labelRu: 'Гроза с градом',
		shortLabelRu: 'Гроза',
		iconDay: 'thunderstorms-day-rain',
		iconNight: 'thunderstorms-night-rain'
	},
	99: {
		labelRu: 'Гроза с градом',
		shortLabelRu: 'Гроза',
		iconDay: 'thunderstorms-day-rain',
		iconNight: 'thunderstorms-night-rain'
	}
};

const FALLBACK_VISUAL: Visual = {
	labelRu: 'Неизвестно',
	shortLabelRu: 'Неизвестно',
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

export function getWeatherVisual(code: number): WeatherVisual {
	return { code, ...(VISUALS[code] ?? FALLBACK_VISUAL) };
}