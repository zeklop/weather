export const PWA_DISMISS_STORAGE_KEY = 'weather:installBannerDismissedUntil';
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{
		outcome: 'accepted' | 'dismissed';
		platform: string;
	}>;
}

export type BannerType = 'none' | 'android' | 'ios';

export function isStandalone(
	windowObj?: Window | null,
	navigatorObj?: Navigator | null
): boolean {
	const win = windowObj !== undefined ? windowObj : typeof window !== 'undefined' ? window : null;
	const nav =
		navigatorObj !== undefined ? navigatorObj : typeof navigator !== 'undefined' ? navigator : null;
	if (!win && !nav) return false;

	if (win?.matchMedia?.('(display-mode: standalone)')?.matches) {
		return true;
	}
	if ((nav as (Navigator & { standalone?: boolean }) | null)?.standalone === true) {
		return true;
	}
	return false;
}

export function isIosSafari(
	windowObj?: Window | null,
	navigatorObj?: Navigator | null
): boolean {
	const win = windowObj !== undefined ? windowObj : typeof window !== 'undefined' ? window : null;
	const nav =
		navigatorObj !== undefined ? navigatorObj : typeof navigator !== 'undefined' ? navigator : null;
	if (!nav) return false;

	if (win && (win as unknown as { MSStream?: unknown }).MSStream) {
		return false;
	}

	const ua = nav.userAgent || '';
	const isIos = /iPad|iPhone|iPod/.test(ua);
	if (!isIos) return false;

	return !isStandalone(win, nav);
}

export function isInstallDismissed(
	storage?: Storage | null,
	now: number = Date.now()
): boolean {
	try {
		const store = storage !== undefined ? storage : typeof localStorage !== 'undefined' ? localStorage : null;
		if (!store) return false;
		const val = store.getItem(PWA_DISMISS_STORAGE_KEY);
		if (!val) return false;
		const until = parseInt(val, 10);
		if (Number.isNaN(until)) return false;
		return until > now;
	} catch {
		return false;
	}
}

export function dismissInstall(
	storage?: Storage | null,
	now: number = Date.now(),
	durationMs: number = SEVEN_DAYS_MS
): void {
	try {
		const store = storage !== undefined ? storage : typeof localStorage !== 'undefined' ? localStorage : null;
		if (!store) return;
		store.setItem(PWA_DISMISS_STORAGE_KEY, String(now + durationMs));
	} catch {
		// ignore storage errors
	}
}
