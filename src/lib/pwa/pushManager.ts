import type { Location } from '$lib/types';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export function isPushSupported(): boolean {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
	return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isStandalone(): boolean {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
	const isStandaloneMedia = window.matchMedia?.('(display-mode: standalone)')?.matches;
	const isIosStandalone = (navigator as unknown as { standalone?: boolean })?.standalone === true;
	return Boolean(isStandaloneMedia || isIosStandalone);
}

export function getAnonymousInstallId(): string {
	if (typeof localStorage === 'undefined') return 'inst_ssr';
	const storageKey = 'weather:install_id';
	let installId = localStorage.getItem(storageKey);
	if (!installId) {
		installId = 'inst_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
		localStorage.setItem(storageKey, installId);
	}
	return installId;
}

export function detectPlatform(): 'ios' | 'android' | 'desktop' {
	if (typeof navigator === 'undefined') return 'desktop';
	const ua = navigator.userAgent || '';
	if (/iPad|iPhone|iPod/.test(ua) || ((navigator as unknown as { standalone?: boolean }).standalone !== undefined && /Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
		return 'ios';
	}
	if (/Android/.test(ua)) {
		return 'android';
	}
	return 'desktop';
}

export interface PushManagerConfig {
	workerUrl?: string;
	publicVapidKey?: string;
}

interface SubscriptionFields {
	endpoint: string;
	p256dh: string;
	auth: string;
}

function extractSubscriptionFields(subscription: PushSubscription): SubscriptionFields | null {
	const subJSON = subscription.toJSON();
	if (!subJSON.endpoint || !subJSON.keys?.p256dh || !subJSON.keys?.auth) return null;
	return { endpoint: subJSON.endpoint, p256dh: subJSON.keys.p256dh, auth: subJSON.keys.auth };
}

function sameApplicationServerKey(subscription: PushSubscription, expected: Uint8Array): boolean {
	const current = subscription.options.applicationServerKey;
	if (!current) return false;
	const currentBytes = current instanceof Uint8Array ? current : new Uint8Array(current as ArrayBuffer);
	if (currentBytes.length !== expected.length) return false;
	for (let i = 0; i < currentBytes.length; i++) {
		if (currentBytes[i] !== expected[i]) return false;
	}
	return true;
}

function buildSubscribeBody(
	fields: SubscriptionFields,
	location: Location,
	lang: 'en' | 'ru',
	alertTypes?: { rain: boolean; freeze: boolean; severe: boolean; quietHours: boolean }
): Record<string, unknown> {
	return {
		endpoint: fields.endpoint,
		keys: { p256dh: fields.p256dh, auth: fields.auth },
		city_name: location.name,
		latitude: location.latitude,
		longitude: location.longitude,
		timezone: location.timezone || 'UTC',
		language: lang,
		platform: detectPlatform(),
		...(alertTypes ? { alert_types: alertTypes } : {})
	};
}

export class PushManagerClient {
	private workerUrl: string;
	private publicVapidKey: string;

	constructor(config?: PushManagerConfig) {
		// Reads from import.meta.env with graceful fallback
		const envWorkerUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.PUBLIC_PUSH_WORKER_URL || '';
		const envVapidKey = (import.meta as unknown as { env?: Record<string, string> }).env?.PUBLIC_VAPID_KEY || '';

		this.workerUrl = config?.workerUrl ?? envWorkerUrl;
		this.publicVapidKey = config?.publicVapidKey ?? envVapidKey;
	}

	get isConfigured(): boolean {
		return Boolean(this.workerUrl);
	}

	get baseUrl(): string {
		return this.workerUrl;
	}

	async sendPing(locationName: string, lang: 'en' | 'ru' = 'en'): Promise<boolean> {
		if (!this.isConfigured || typeof window === 'undefined') return false;
		try {
			const installId = getAnonymousInstallId();
			const platform = detectPlatform();
			const res = await fetch(`${this.workerUrl}/api/stats/ping`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					install_id: installId,
					platform,
					city_name: locationName,
					lang
				})
			});
			return res.ok;
		} catch {
			return false;
		}
	}

	async getExistingSubscription(): Promise<PushSubscription | null> {
		if (!isPushSupported()) return null;
		try {
			const registration = await navigator.serviceWorker.ready;
			return await registration.pushManager.getSubscription();
		} catch {
			return null;
		}
	}

	async subscribe(
		location: Location,
		lang: 'en' | 'ru' = 'en',
		alertTypes = { rain: true, freeze: true, severe: true, quietHours: true }
	): Promise<{ success: boolean; error?: string }> {
		if (!this.isConfigured) {
			return { success: false, error: 'Push Worker URL is not configured' };
		}
		if (!isPushSupported()) {
			return { success: false, error: 'Push is not supported on this device/browser' };
		}

		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				return { success: false, error: 'Permission denied' };
			}

			const registration = await navigator.serviceWorker.ready;
			let subscription = await registration.pushManager.getSubscription();

			// A subscription bound to an older/rotated VAPID key is rejected by the
			// push gateway forever (403) with no client-visible error — replace it
			// with one bound to the current key.
			const appServerKey = this.publicVapidKey ? urlBase64ToUint8Array(this.publicVapidKey) : null;
			if (subscription && appServerKey && !sameApplicationServerKey(subscription, appServerKey)) {
				await subscription.unsubscribe();
				subscription = null;
			}

			if (!subscription) {
				if (!appServerKey) {
					return { success: false, error: 'Public VAPID key is missing' };
				}
				subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: appServerKey as unknown as ArrayBuffer
				});
			}

			const fields = extractSubscriptionFields(subscription);
			if (!fields) {
				return { success: false, error: 'Malformed push subscription object' };
			}

			const response = await fetch(`${this.workerUrl}/api/push/subscribe`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildSubscribeBody(fields, location, lang, alertTypes))
			});

			if (!response.ok) {
				const errText = await response.text();
				return { success: false, error: `Worker error (${response.status}): ${errText}` };
			}

			localStorage.setItem('weather:pushSubscribed', 'true');
			return { success: true };
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			return { success: false, error: msg };
		}
	}

	async unsubscribe(): Promise<boolean> {
		if (!isPushSupported()) return false;
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) {
				const endpoint = subscription.endpoint;
				await subscription.unsubscribe();

				if (this.isConfigured) {
					await fetch(`${this.workerUrl}/api/push/unsubscribe`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ endpoint })
					}).catch(() => {});
				}
			}
			localStorage.removeItem('weather:pushSubscribed');
			return true;
		} catch {
			return false;
		}
	}

	async syncLocation(location: Location, lang: 'en' | 'ru' = 'en'): Promise<void> {
		if (!this.isConfigured || !isPushSupported()) return;
		try {
			const isSubscribed = localStorage.getItem('weather:pushSubscribed') === 'true';
			if (!isSubscribed) return;

			const subscription = await this.getExistingSubscription();
			if (!subscription) return;

			const fields = extractSubscriptionFields(subscription);
			if (!fields) return;

			await fetch(`${this.workerUrl}/api/push/subscribe`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildSubscribeBody(fields, location, lang))
			});
		} catch {
			// silent fallback
		}
	}
}

export const pushClient = new PushManagerClient();
