export const PWA_DISMISS_STORAGE_KEY = 'weather:pwaInstallDismissedUntil';
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

export interface PwaInstallControllerOptions {
	storage?: Storage | null;
	now?: () => number;
	isStandalone?: () => boolean;
	isIosSafari?: () => boolean;
}

export interface PwaInstallController {
	readonly bannerType: BannerType;
	readonly showBanner: boolean;
	readonly showModal: boolean;
	handleBeforeInstallPrompt(event: BeforeInstallPromptEvent): void;
	handleAppInstalled(): void;
	promptInstall(): Promise<{ outcome: 'accepted' | 'dismissed'; platform: string } | null>;
	dismiss(): void;
	openModal(): void;
	closeModal(): void;
}

export function createPwaInstallController(
	options: PwaInstallControllerOptions = {}
): PwaInstallController {
	const getStorage = () =>
		options.storage !== undefined
			? options.storage
			: typeof localStorage !== 'undefined'
				? localStorage
				: null;
	const getNow = () => (options.now ? options.now() : Date.now());
	const checkStandalone = () => (options.isStandalone ? options.isStandalone() : isStandalone());
	const checkIosSafari = () => (options.isIosSafari ? options.isIosSafari() : isIosSafari());

	let promptEvent: BeforeInstallPromptEvent | null = null;
	let bannerType: BannerType = 'none';
	let showBanner = false;
	let showModal = false;

	if (!checkStandalone() && !isInstallDismissed(getStorage(), getNow())) {
		if (checkIosSafari()) {
			bannerType = 'ios';
			showBanner = true;
		}
	}

	return {
		get bannerType() {
			return bannerType;
		},
		get showBanner() {
			return showBanner;
		},
		get showModal() {
			return showModal;
		},
		handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
			event.preventDefault();
			promptEvent = event;
			if (!checkStandalone() && !isInstallDismissed(getStorage(), getNow())) {
				bannerType = 'android';
				showBanner = true;
			}
		},
		handleAppInstalled() {
			showBanner = false;
			bannerType = 'none';
			promptEvent = null;
		},
		async promptInstall() {
			if (!promptEvent) return null;
			try {
				await promptEvent.prompt();
				const choice = await promptEvent.userChoice;
				if (choice && choice.outcome === 'accepted') {
					showBanner = false;
					promptEvent = null;
				}
				return choice ?? null;
			} catch {
				return null;
			}
		},
		dismiss() {
			showBanner = false;
			dismissInstall(getStorage(), getNow());
		},
		openModal() {
			showModal = true;
		},
		closeModal() {
			showModal = false;
		}
	};
}
