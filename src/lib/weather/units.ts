import type { Language } from '$lib/i18n';
import { activeUnits } from './unitsState.svelte';

const MINUS = '\u2212';

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type PressureUnit = 'mmhg' | 'inhg' | 'hpa';
export type WindUnit = 'ms' | 'mph';
export type PrecipUnit = 'mm' | 'in';

// Called by the settings store at startup and on every unit change.
export function configureUnits(units: {
	temperature?: TemperatureUnit;
	pressure?: PressureUnit;
	wind?: WindUnit;
	precip?: PrecipUnit;
}): void {
	if (units.temperature) activeUnits.temperature = units.temperature;
	if (units.pressure) activeUnits.pressure = units.pressure;
	if (units.wind) activeUnits.wind = units.wind;
	if (units.precip) activeUnits.precip = units.precip;
}

// Locale-based default: US → °F/inHg/mph/in, Russian → metric with mmHg,
// everyone else → metric with hPa. Runs at settings-store init, so it must
// never throw. Wind and precip follow NOAA consumer practice for the US.
export function detectDefaultUnits(locale: string): {
	temperature: TemperatureUnit;
	pressure: PressureUnit;
	wind: WindUnit;
	precip: PrecipUnit;
} {
	const fallback = {
		temperature: 'celsius',
		pressure: 'hpa',
		wind: 'ms',
		precip: 'mm'
	} as const;
	if (typeof locale !== 'string') return fallback;
	try {
		if (new Intl.Locale(locale).region === 'US') {
			return { temperature: 'fahrenheit', pressure: 'inhg', wind: 'mph', precip: 'in' };
		}
		if (locale.toLowerCase().startsWith('ru')) {
			return { temperature: 'celsius', pressure: 'mmhg', wind: 'ms', precip: 'mm' };
		}
	} catch {
		/* invalid locale string */
	}
	return fallback;
}

export function hpaToMmhg(hpa: number): number {
	return hpa * 0.750061683;
}

export function msToMph(ms: number): number {
	return ms * 2.2369362921;
}

export function mmToInch(mm: number): number {
	return mm / 25.4;
}

export function hpaToInhg(hpa: number): number {
	return hpa / 33.8638866667;
}

export function celsiusToFahrenheit(celsius: number): number {
	return (celsius * 9) / 5 + 32;
}

export function formatTemp(celsius: number): string {
	const value = Math.round(
		activeUnits.temperature === 'fahrenheit' ? celsiusToFahrenheit(celsius) : celsius
	);
	if (value === 0) return '0°';
	const sign = value > 0 ? '+' : MINUS;
	return `${sign}${Math.abs(value)}°`;
}

export function formatWindSpeed(ms: number, lang: Language = 'en'): string {
	if (activeUnits.wind === 'mph') {
		const mph = (Math.round(msToMph(ms) * 10) / 10).toFixed(1);
		return lang === 'ru' ? `${mph.replace('.', ',')} миль/ч` : `${mph} mph`;
	}
	if (lang === 'ru') {
		return `${ms.toFixed(1).replace('.', ',')} м/с`;
	}
	return `${ms.toFixed(1)} m/s`;
}

export function formatMmhg(mmhg: number, lang: Language = 'en'): string {
	const rounded = Math.round(mmhg);
	return lang === 'ru' ? `${rounded} мм рт. ст.` : `${rounded} mmHg`;
}

export function formatPressure(hpa: number, lang: Language = 'en'): string {
	if (activeUnits.pressure === 'inhg') {
		return `${(Math.round(hpaToInhg(hpa) * 100) / 100).toFixed(2)} inHg`;
	}
	if (activeUnits.pressure === 'hpa') {
		return `${Math.round(hpa)} ${lang === 'ru' ? 'гПа' : 'hPa'}`;
	}
	return formatMmhg(hpaToMmhg(hpa), lang);
}

export function formatPrecipMm(mm: number, lang: Language = 'en'): string {
	if (activeUnits.precip === 'in') {
		const inches = (Math.round(mmToInch(mm) * 100) / 100).toFixed(2);
		return lang === 'ru' ? `${inches.replace('.', ',')} дюйм` : `${inches} in`;
	}
	const rounded = Math.round(mm * 10) / 10;
	if (lang === 'ru') {
		const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',');
		return `${formatted} мм`;
	}
	const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
	return `${formatted} mm`;
}
