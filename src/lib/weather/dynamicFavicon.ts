export type FaviconTheme = 'light' | 'dark';

/**
 * Formats temperature for the compact 32x32 favicon display.
 * Examples: +18°, 0°, -5°
 */
export function formatFaviconTemp(tempCelsius: number): string {
	const rounded = Math.round(tempCelsius);
	if (rounded === 0 || Object.is(rounded, -0)) return '0°';
	const sign = rounded > 0 ? '+' : '';
	return `${sign}${rounded}°`;
}

/**
 * Returns a high-contrast accent color for the weather indicator glyph.
 */
export function getWeatherGlyphColor(weatherCode: number, isDay: boolean): string {
	// Clear sky / mainly clear
	if (weatherCode === 0 || weatherCode === 1) {
		return isDay ? '#F59E0B' : '#818CF8';
	}
	// Thunderstorm
	if (weatherCode >= 95) {
		return '#FBBF24';
	}
	// Snow / snow grains / snow showers
	if ((weatherCode >= 71 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) {
		return '#93C5FD';
	}
	// Rain / drizzle / showers / freezing rain
	if (
		(weatherCode >= 51 && weatherCode <= 67) ||
		(weatherCode >= 80 && weatherCode <= 82)
	) {
		return '#38BDF8';
	}
	// Fog / overcast / cloudy
	return '#94A3B8';
}

/**
 * Renders temperature and weather status indicator onto a 32x32 canvas
 * and returns the resulting PNG Data URL.
 */
export function renderFaviconCanvas(
	canvas: HTMLCanvasElement,
	tempCelsius: number,
	isDay: boolean,
	weatherCode: number,
	theme: FaviconTheme = 'light'
): string {
	canvas.width = 32;
	canvas.height = 32;

	const ctx = canvas.getContext('2d');
	if (!ctx) return '';

	const isDark = theme === 'dark';

	ctx.clearRect(0, 0, 32, 32);

	// Card background with rounded corners
	ctx.beginPath();
	if (typeof ctx.roundRect === 'function') {
		ctx.roundRect(1, 1, 30, 30, 6);
	} else {
		ctx.rect(1, 1, 30, 30);
	}
	ctx.fillStyle = isDark ? '#0F172A' : '#FFFFFF';
	ctx.fill();

	ctx.lineWidth = 1.5;
	ctx.strokeStyle = isDark ? '#334155' : '#CBD5E1';
	ctx.stroke();

	// Weather indicator glyph dot
	const glyphColor = getWeatherGlyphColor(weatherCode, isDay);
	ctx.beginPath();
	ctx.arc(24, 7, 3, 0, Math.PI * 2);
	ctx.fillStyle = glyphColor;
	ctx.fill();

	// Temperature text
	const tempText = formatFaviconTemp(tempCelsius);
	const textLength = tempText.length;

	let fontSize = 12;
	if (textLength >= 5) {
		fontSize = 9.5;
	} else if (textLength === 4) {
		fontSize = 11;
	} else if (textLength <= 2) {
		fontSize = 13;
	}

	ctx.font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
	ctx.fillText(tempText, 14, 18);

	return canvas.toDataURL('image/png');
}

/**
 * Generates dynamic favicon canvas and updates <link rel="icon"> in document.head.
 */
export function updateDynamicFavicon(
	tempCelsius: number,
	isDay: boolean,
	weatherCode: number,
	theme: FaviconTheme = 'light'
): string | null {
	if (typeof document === 'undefined') return null;

	const canvas = document.createElement('canvas');
	const dataUrl = renderFaviconCanvas(canvas, tempCelsius, isDay, weatherCode, theme);
	if (!dataUrl) return null;

	let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
	if (!link) {
		link = document.createElement('link');
		link.rel = 'icon';
		document.head.appendChild(link);
	}
	link.type = 'image/png';
	link.href = dataUrl;

	return dataUrl;
}
