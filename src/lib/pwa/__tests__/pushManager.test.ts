import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	urlBase64ToUint8Array,
	isPushSupported,
	isStandalone,
	getAnonymousInstallId,
	detectPlatform,
	PushManagerClient
} from '../pushManager';

describe('Client PushManager & PWA Utilities', () => {
	let memoryStore: Record<string, string> = {};

	beforeEach(() => {
		memoryStore = {};
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => memoryStore[key] ?? null,
			setItem: (key: string, value: string) => {
				memoryStore[key] = value;
			},
			removeItem: (key: string) => {
				delete memoryStore[key];
			},
			clear: () => {
				memoryStore = {};
			}
		});
		vi.restoreAllMocks();
	});

	it('converts base64url string to Uint8Array', () => {
		const base64UrlKey = 'BM5a_ZqWqjS6JqB1v7c3a0k3K0Vq9q7fX1zW4K2e';
		const arr = urlBase64ToUint8Array(base64UrlKey);
		expect(arr).toBeInstanceOf(Uint8Array);
		expect(arr.length).toBeGreaterThan(0);
	});

	it('generates and persists unique anonymous install_id in localStorage', () => {
		const id1 = getAnonymousInstallId();
		expect(id1).toMatch(/^inst_[a-z0-9]+/);
		const id2 = getAnonymousInstallId();
		expect(id1).toBe(id2);
	});

	it('gracefully degrades when workerUrl is not configured', async () => {
		const unconfiguredClient = new PushManagerClient({ workerUrl: '' });
		expect(unconfiguredClient.isConfigured).toBe(false);

		const pingResult = await unconfiguredClient.sendPing('Moscow', 'ru');
		expect(pingResult).toBe(false);

		const mockLocation = {
			id: 'loc_moscow',
			name: 'Moscow',
			latitude: 55.75,
			longitude: 37.61,
			timezone: 'Europe/Moscow'
		};

		const subResult = await unconfiguredClient.subscribe(mockLocation);
		expect(subResult.success).toBe(false);
		expect(subResult.error).toContain('not configured');
	});

	it('detects platform correctly based on navigator', () => {
		const platform = detectPlatform();
		expect(['ios', 'android', 'desktop']).toContain(platform);
	});
});
