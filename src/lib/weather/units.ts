import type { Language } from '$lib/i18n';
import { activeUnits } from './unitsState.svelte';

const MINUS = '\u2212';

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type PressureUnit = 'mmhg' | 'inhg' | 'hpa';

// Called by the settings store at startup and on every unit change.
export function configureUnits(units: {
	temperature?: TemperatureUnit;
	pressure?: PressureUnit;
}): void {
	if (units.temperature) activeUnits.temperature = units.temperature;
	if (units.pressure) activeUnits.pressure = units.pressure;
}

// Locale-based default: US → °F/inHg, Russian → °C/mmHg, everyone else →
// °C/hPa. Runs at settings-store init, so it must never throw.
export function detectDefaultUnits(locale: string): {
	temperature: TemperatureUnit;
	pressure: PressureUnit;
} {
	const fallback = { temperature: 'celsius', pressure: 'hpa' } as const;
	if (typeof locale !== 'string') return fallback;
	try {
		if (new Intl.Locale(locale).region === 'US') {
			return { temperature: 'fahrenheit', pressure: 'inhg' };
		}
		if (locale.toLowerCase().startsWith('ru')) {
			return { temperature: 'celsius', pressure: 'mmhg' };
		}
	} catch {
		/* invalid locale string */
	}
	return fallback;
}

export function hpaToMmhg(hpa: number): number {
	return hpa * 0.750061683;
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
	const rounded = Math.round(mm * 10) / 10;
	if (lang === 'ru') {
		const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',');
		return `${formatted} мм`;
	}
	const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
	return `${formatted} mm`;
}
