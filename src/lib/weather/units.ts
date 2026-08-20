import type { Language } from '$lib/i18n/translations';

const MINUS = '\u2212';

// Fixed defaults. Phase 2: configurable units will read from settings (spec §19).
export const DEFAULT_UNITS = {
	temperature: 'celsius',
	wind: 'ms',
	pressure: 'mmhg'
} as const;

export function hpaToMmhg(hpa: number): number {
	return hpa * 0.750061683;
}

export function formatTemp(celsius: number): string {
	const rounded = Math.round(celsius);
	if (rounded === 0) return '0°';
	const sign = rounded > 0 ? '+' : MINUS;
	return `${sign}${Math.abs(rounded)}°`;
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
