import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	formatFaviconTemp,
	getWeatherGlyphColor,
	renderFaviconCanvas,
	updateDynamicFavicon
} from '../dynamicFavicon';

describe('formatFaviconTemp', () => {
	it('formats positive temperatures with a plus sign and degree symbol', () => {
		expect(formatFaviconTemp(18)).toBe('+18°');
		expect(formatFaviconTemp(18.4)).toBe('+18°');
		expect(formatFaviconTemp(18.6)).toBe('+19°');
		expect(formatFaviconTemp(1)).toBe('+1°');
	});

	it('formats zero temperature as 0° without sign', () => {
		expect(formatFaviconTemp(0)).toBe('0°');
		expect(formatFaviconTemp(0.2)).toBe('0°');
		expect(formatFaviconTemp(-0.2)).toBe('0°');
	});

	it('formats negative temperatures with minus sign and degree symbol', () => {
		expect(formatFaviconTemp(-5)).toBe('-5°');
		expect(formatFaviconTemp(-5.4)).toBe('-5°');
		expect(formatFaviconTemp(-5.6)).toBe('-6°');
		expect(formatFaviconTemp(-1)).toBe('-1°');
	});
});

describe('getWeatherGlyphColor', () => {
	it('returns sun amber for clear day and indigo for clear night', () => {
		expect(getWeatherGlyphColor(0, true)).toBe('#F59E0B');
		expect(getWeatherGlyphColor(0, false)).toBe('#818CF8');
		expect(getWeatherGlyphColor(1, true)).toBe('#F59E0B');
		expect(getWeatherGlyphColor(1, false)).toBe('#818CF8');
	});

	it('returns rain blue for drizzle and rain', () => {
		expect(getWeatherGlyphColor(51, true)).toBe('#38BDF8');
		expect(getWeatherGlyphColor(61, false)).toBe('#38BDF8');
		expect(getWeatherGlyphColor(80, true)).toBe('#38BDF8');
	});

	it('returns snow ice color for snowfall', () => {
		expect(getWeatherGlyphColor(71, true)).toBe('#93C5FD');
		expect(getWeatherGlyphColor(85, false)).toBe('#93C5FD');
	});

	it('returns storm amber/yellow for thunderstorms', () => {
		expect(getWeatherGlyphColor(95, true)).toBe('#FBBF24');
		expect(getWeatherGlyphColor(99, false)).toBe('#FBBF24');
	});

	it('returns slate for overcast and clouds', () => {
		expect(getWeatherGlyphColor(2, true)).toBe('#94A3B8');
		expect(getWeatherGlyphColor(3, false)).toBe('#94A3B8');
		expect(getWeatherGlyphColor(45, true)).toBe('#94A3B8');
	});
});

describe('renderFaviconCanvas', () => {
	it('renders onto a 32x32 canvas and returns a data URL', () => {
		const mockContext = {
			clearRect: vi.fn(),
			beginPath: vi.fn(),
			arc: vi.fn(),
			roundRect: vi.fn(),
			rect: vi.fn(),
			fill: vi.fn(),
			stroke: vi.fn(),
			fillText: vi.fn(),
			fillStyle: '',
			strokeStyle: '',
			lineWidth: 1,
			font: '',
			textAlign: '',
			textBaseline: ''
		};

		const mockCanvas = {
			width: 0,
			height: 0,
			getContext: vi.fn().mockReturnValue(mockContext),
			toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockfavicon')
		} as unknown as HTMLCanvasElement;

		const result = renderFaviconCanvas(mockCanvas, 22, true, 0, 'light');

		expect(mockCanvas.width).toBe(32);
		expect(mockCanvas.height).toBe(32);
		expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 32, 32);
		expect(mockContext.fillText).toHaveBeenCalledWith('+22°', expect.any(Number), expect.any(Number));
		expect(result).toBe('data:image/png;base64,mockfavicon');
	});
});

describe('updateDynamicFavicon', () => {
	let originalDocument: Document | undefined;
	let headChildren: any[];

	beforeEach(() => {
		originalDocument = globalThis.document;
		headChildren = [];

		const mockHead = {
			appendChild: (child: any) => {
				headChildren.push(child);
				return child;
			},
			querySelector: (sel: string) => {
				if (sel.includes('link[rel="icon"]') || sel.includes('link[rel*="icon"]')) {
					return headChildren.find((el) => el.tagName === 'LINK' && el.rel === 'icon') ?? null;
				}
				return null;
			}
		};

		const mockDoc = {
			head: mockHead,
			createElement: (tag: string) => {
				const el: any = {
					tagName: tag.toUpperCase(),
					type: '',
					rel: '',
					href: '',
					width: 0,
					height: 0
				};
				if (tag === 'canvas') {
					const mockContext = {
						clearRect: vi.fn(),
						beginPath: vi.fn(),
						arc: vi.fn(),
						roundRect: vi.fn(),
						rect: vi.fn(),
						fill: vi.fn(),
						stroke: vi.fn(),
						fillText: vi.fn(),
						fillStyle: '',
						strokeStyle: '',
						lineWidth: 1,
						font: '',
						textAlign: '',
						textBaseline: ''
					};
					el.getContext = vi.fn().mockReturnValue(mockContext);
					el.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockpng');
				}
				return el;
			},
			querySelector: (sel: string) => {
				if (sel.includes('link[rel="icon"]')) {
					return headChildren.find((el) => el.tagName === 'LINK' && el.rel === 'icon') ?? null;
				}
				return null;
			}
		};

		Object.defineProperty(globalThis, 'document', {
			value: mockDoc,
			configurable: true,
			writable: true
		});
	});

	afterEach(() => {
		Object.defineProperty(globalThis, 'document', {
			value: originalDocument,
			configurable: true,
			writable: true
		});
	});

	it('creates a link[rel="icon"] if none exists and updates href', () => {
		const dataUrl = updateDynamicFavicon(15, true, 1, 'light');

		expect(dataUrl).toBe('data:image/png;base64,mockpng');
		const iconLink = (globalThis.document as any).querySelector('link[rel="icon"]');
		expect(iconLink).not.toBeNull();
		expect(iconLink?.href).toBe('data:image/png;base64,mockpng');
	});

	it('updates existing link[rel="icon"] href when available', () => {
		const existingLink = {
			tagName: 'LINK',
			rel: 'icon',
			href: 'original-favicon.ico',
			type: 'image/svg+xml'
		};
		headChildren.push(existingLink);

		const dataUrl = updateDynamicFavicon(-3, false, 71, 'dark');

		expect(dataUrl).toBe('data:image/png;base64,mockpng');
		expect(existingLink.href).toBe('data:image/png;base64,mockpng');
	});

	it('returns null safely when document is undefined (SSR)', () => {
		Object.defineProperty(globalThis, 'document', {
			value: undefined,
			configurable: true,
			writable: true
		});

		expect(updateDynamicFavicon(10, true, 0)).toBeNull();
	});
});
