const MINUS = '\u2212';

// Fixed Russian defaults. Phase 2: configurable units will read from settings (spec §19).
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

export function formatWind(ms: number): string {
	return `${ms.toFixed(1).replace('.', ',')} м/с`;
}

export function formatMmhg(mmhg: number): string {
	return `${Math.round(mmhg)} мм рт. ст.`;
}

export function formatPrecipMm(mm: number): string {
	const rounded = Math.round(mm * 10) / 10;
	const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',');
	return `${formatted} мм`;
}