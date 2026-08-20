import { base } from '$app/paths';
import type { ForecastPayload } from '$lib/types';
import {
	evaluateWeatherAlerts,
	type AlertType,
	type WeatherAlert
} from '$lib/weather/alerts';
import { getSettingsStore, type SettingsStore } from './settings.svelte';

export const LAST_SENT_KEY = 'weather:alerts:lastSent';
export const DISMISSED_KEY = 'weather:alerts:dismissed';
const DISMISSED_LIMIT = 50;

export type AlertsStore = {
	readonly alerts: readonly WeatherAlert[];
	readonly activeAlert: WeatherAlert | null;
	readonly permission: NotificationPermission;
	dismissAlert(id: string): void;
	requestPermission(): Promise<NotificationPermission>;
	syncPermission(): void;
	evaluate(nowMs?: number): void;
};

export type CreateAlertsStoreOptions = {
	settingsStore?: SettingsStore;
	storage?: Storage | null;
	getPayload?: () => ForecastPayload | null;
};

function defaultStorage(): Storage | null {
	return typeof localStorage !== 'undefined' ? localStorage : null;
}

function getBrowserPermission(): NotificationPermission {
	if (typeof Notification === 'undefined') {
		return 'default';
	}
	return Notification.permission;
}

function readLastSentTimestamps(storage: Storage | null): Partial<Record<AlertType, number>> {
	if (!storage) return {};
	try {
		const raw = storage.getItem(LAST_SENT_KEY);
		if (!raw) return {};
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

function persistLastSentTimestamps(
	storage: Storage | null,
	timestamps: Partial<Record<AlertType, number>>
): void {
	if (!storage) return;
	try {
		storage.setItem(LAST_SENT_KEY, JSON.stringify(timestamps));
	} catch {
		/* noop */
	}
}

function readDismissedIds(storage: Storage | null): string[] {
	if (!storage) return [];
	try {
		const raw = storage.getItem(DISMISSED_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
	} catch {
		return [];
	}
}

function persistDismissedIds(storage: Storage | null, ids: string[]): void {
	if (!storage) return;
	try {
		storage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-DISMISSED_LIMIT)));
	} catch {
		/* noop */
	}
}

function dispatchNotification(alert: WeatherAlert): void {
	if (typeof Notification === 'undefined') return;
	if (Notification.permission !== 'granted') return;

	try {
		if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.ready
				.then((registration) => {
					if (registration && 'showNotification' in registration) {
						registration.showNotification(alert.title, {
							body: alert.message,
							icon: `${base}/icons/app/icon-192.png`,
							badge: `${base}/icons/app/icon-192.png`,
							tag: alert.id,
							data: { alertId: alert.id }
						});
					} else {
						new Notification(alert.title, {
							body: alert.message,
							icon: `${base}/icons/app/icon-192.png`,
							tag: alert.id
						});
					}
				})
				.catch(() => {
					new Notification(alert.title, {
						body: alert.message,
						icon: `${base}/icons/app/icon-192.png`,
						tag: alert.id
					});
				});
		} else {
			new Notification(alert.title, {
				body: alert.message,
				icon: `${base}/icons/app/icon-192.png`,
				tag: alert.id
			});
		}
	} catch {
		/* noop if notification fails */
	}
}

export function createAlertsStore(options: CreateAlertsStoreOptions = {}): AlertsStore {
	const storage = options.storage ?? defaultStorage();
	const settings = options.settingsStore ?? getSettingsStore();
	const getPayload = options.getPayload ?? (() => null);

	let alerts = $state<WeatherAlert[]>([]);
	let dismissedIds = $state<string[]>(readDismissedIds(storage));
	let permission = $state<NotificationPermission>(getBrowserPermission());
	let lastSentTimestamps = readLastSentTimestamps(storage);

	const activeAlert = $derived.by((): WeatherAlert | null => {
		const unDismissed = alerts.filter((a) => !dismissedIds.includes(a.id));
		if (unDismissed.length === 0) return null;
		// Severe alerts prioritized
		const severe = unDismissed.find((a) => a.severity === 'severe');
		return severe ?? unDismissed[0] ?? null;
	});

	function syncPermission(): void {
		permission = getBrowserPermission();
	}

	async function requestPermission(): Promise<NotificationPermission> {
		if (typeof Notification === 'undefined') {
			return 'denied';
		}
		try {
			const res = await Notification.requestPermission();
			permission = res;
			return res;
		} catch {
			permission = 'denied';
			return 'denied';
		}
	}

	function dismissAlert(id: string): void {
		if (!dismissedIds.includes(id)) {
			dismissedIds = [...dismissedIds, id];
			persistDismissedIds(storage, dismissedIds);
		}
	}

	function evaluate(nowMs: number = Date.now()): void {
		const payload = getPayload();
		if (!payload) {
			alerts = [];
			return;
		}

		syncPermission();

		const enabledTypes: Partial<Record<AlertType, boolean>> = {
			precipitation: settings.precipitationAlerts,
			severe: settings.severeAlerts,
			freeze: settings.freezeAlerts
		};

		const evaluated = evaluateWeatherAlerts(payload, {
			lang: settings.language,
			nowMs,
			quietHours: settings.quietHoursEnabled,
			enabledTypes,
			lastSentTimestamps
		});

		alerts = evaluated;

		// If notifications enabled and permission granted, emit browser notification
		if (settings.alertsEnabled && permission === 'granted') {
			for (const alert of evaluated) {
				const lastSent = lastSentTimestamps[alert.type];
				if (lastSent == null || nowMs - lastSent >= 3 * 60 * 60 * 1000) {
					dispatchNotification(alert);
					lastSentTimestamps = {
						...lastSentTimestamps,
						[alert.type]: nowMs
					};
					persistLastSentTimestamps(storage, lastSentTimestamps);
				}
			}
		}
	}

	return {
		get alerts() {
			return alerts;
		},
		get activeAlert() {
			return activeAlert;
		},
		get permission() {
			return permission;
		},
		dismissAlert,
		requestPermission,
		syncPermission,
		evaluate
	};
}
