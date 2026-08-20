interface BadgingNavigator {
	setAppBadge?: (contents?: number) => Promise<void>;
	clearAppBadge?: () => Promise<void>;
}

/**
 * Updates or clears the home screen app icon badge with temperature in whole degrees.
 * Supported in standalone PWA on iOS 16.4+ and Chromium / Android.
 */
export function updateAppBadge(tempCelsius: number | null, enabled: boolean): void {
	if (typeof navigator === 'undefined') return;

	const nav = navigator as unknown as BadgingNavigator;

	if (
		enabled &&
		typeof nav.setAppBadge === 'function' &&
		tempCelsius !== null &&
		!Number.isNaN(tempCelsius)
	) {
		const badgeVal = Math.round(Math.abs(tempCelsius));
		nav.setAppBadge(badgeVal).catch(() => {});
	} else if (typeof nav.clearAppBadge === 'function') {
		nav.clearAppBadge().catch(() => {});
	}
}
