import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAppBadge } from '../badging';

describe('updateAppBadge', () => {
	const originalNavigator = globalThis.navigator;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		Object.defineProperty(globalThis, 'navigator', {
			value: originalNavigator,
			configurable: true,
			writable: true
		});
	});

	it('calls setAppBadge with rounded absolute temperature when enabled and temp is valid', () => {
		const setAppBadge = vi.fn().mockResolvedValue(undefined);
		const clearAppBadge = vi.fn().mockResolvedValue(undefined);

		Object.defineProperty(globalThis, 'navigator', {
			value: { setAppBadge, clearAppBadge },
			configurable: true,
			writable: true
		});

		updateAppBadge(18.4, true);
		expect(setAppBadge).toHaveBeenCalledWith(18);
		expect(clearAppBadge).not.toHaveBeenCalled();

		updateAppBadge(-5.7, true);
		expect(setAppBadge).toHaveBeenCalledWith(6);

		updateAppBadge(0, true);
		expect(setAppBadge).toHaveBeenCalledWith(0);
	});

	it('calls clearAppBadge when enabled is false', () => {
		const setAppBadge = vi.fn().mockResolvedValue(undefined);
		const clearAppBadge = vi.fn().mockResolvedValue(undefined);

		Object.defineProperty(globalThis, 'navigator', {
			value: { setAppBadge, clearAppBadge },
			configurable: true,
			writable: true
		});

		updateAppBadge(20, false);
		expect(clearAppBadge).toHaveBeenCalled();
		expect(setAppBadge).not.toHaveBeenCalled();
	});

	it('calls clearAppBadge when tempCelsius is null or NaN even if enabled is true', () => {
		const setAppBadge = vi.fn().mockResolvedValue(undefined);
		const clearAppBadge = vi.fn().mockResolvedValue(undefined);

		Object.defineProperty(globalThis, 'navigator', {
			value: { setAppBadge, clearAppBadge },
			configurable: true,
			writable: true
		});

		updateAppBadge(null, true);
		expect(clearAppBadge).toHaveBeenCalled();
		expect(setAppBadge).not.toHaveBeenCalled();

		clearAppBadge.mockClear();

		updateAppBadge(NaN, true);
		expect(clearAppBadge).toHaveBeenCalled();
		expect(setAppBadge).not.toHaveBeenCalled();
	});

	it('handles rejected setAppBadge / clearAppBadge promises gracefully without crashing', async () => {
		const setAppBadge = vi.fn().mockRejectedValue(new Error('Permission denied'));
		const clearAppBadge = vi.fn().mockRejectedValue(new Error('Not supported'));

		Object.defineProperty(globalThis, 'navigator', {
			value: { setAppBadge, clearAppBadge },
			configurable: true,
			writable: true
		});

		expect(() => updateAppBadge(15, true)).not.toThrow();
		expect(() => updateAppBadge(15, false)).not.toThrow();
	});

	it('safely handles missing methods on navigator or unsupported environment', () => {
		Object.defineProperty(globalThis, 'navigator', {
			value: {},
			configurable: true,
			writable: true
		});

		expect(() => updateAppBadge(15, true)).not.toThrow();
		expect(() => updateAppBadge(null, false)).not.toThrow();
	});
});
