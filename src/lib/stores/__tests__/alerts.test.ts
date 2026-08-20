import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ForecastPayload } from '../../types';
import { createAlertsStore } from '../alerts.svelte';
import { createSettingsStore } from '../settings.svelte';
import { makeMemoryStorage } from './memoryStorage';

function createMockPayload(overrides: Partial<ForecastPayload> = {}): ForecastPayload {
	return {
		timezone: 'Europe/Moscow',
		current: {
			time: '2026-08-20T14:15',
			temperature: 18,
			apparentTemperature: 18,
			weatherCode: 1,
			humidity: 50,
			pressureHpa: 1013,
			windSpeed: 4,
			windDirection: 180,
			windGusts: 6,
			precipitation: 0
		},
		hourly: [
			'2026-08-20T14:00',
			'2026-08-20T15:00',
			'2026-08-20T16:00',
			'2026-08-20T17:00'
		].map((time, idx) => ({
			time,
			temperature: 18 - idx,
			apparentTemperature: 18 - idx,
			weatherCode: 1,
			precipitationProbability: 0,
			precipitation: 0,
			windSpeed: 4,
			windDirection: 180
		})),
		daily: [],
		...overrides
	};
}

describe('createAlertsStore', () => {
	let mockNotification: any;

	beforeEach(() => {
		mockNotification = vi.fn();
		(mockNotification as any).permission = 'default';
		(mockNotification as any).requestPermission = vi.fn().mockResolvedValue('granted');
		vi.stubGlobal('Notification', mockNotification);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('initializes with empty alerts and default permission', () => {
		const storage = makeMemoryStorage();
		const settings = createSettingsStore(storage);
		const alertsStore = createAlertsStore({
			settingsStore: settings,
			storage,
			getPayload: () => null
		});

		expect(alertsStore.alerts).toEqual([]);
		expect(alertsStore.activeAlert).toBeNull();
		expect(alertsStore.permission).toBe('default');
	});

	it('evaluates alerts when forecast payload has upcoming rain', () => {
		const storage = makeMemoryStorage();
		const settings = createSettingsStore(storage);

		const payload = createMockPayload();
		payload.hourly[1]!.precipitationProbability = 80;
		payload.hourly[1]!.weatherCode = 61;

		const alertsStore = createAlertsStore({
			settingsStore: settings,
			storage,
			getPayload: () => payload
		});

		alertsStore.evaluate(Date.UTC(2026, 7, 20, 11, 15));

		expect(alertsStore.alerts.length).toBeGreaterThan(0);
		expect(alertsStore.activeAlert?.type).toBe('precipitation');
	});

	it('dismissAlert dismisses active alert from view', () => {
		const storage = makeMemoryStorage();
		const settings = createSettingsStore(storage);

		const payload = createMockPayload();
		payload.hourly[1]!.precipitationProbability = 80;
		payload.hourly[1]!.weatherCode = 61;

		const alertsStore = createAlertsStore({
			settingsStore: settings,
			storage,
			getPayload: () => payload
		});

		alertsStore.evaluate(Date.UTC(2026, 7, 20, 11, 15));
		const activeId = alertsStore.activeAlert?.id;
		expect(activeId).toBeDefined();

		alertsStore.dismissAlert(activeId!);
		expect(alertsStore.activeAlert).toBeNull();
	});

	it('requests notification permission and updates state', async () => {
		const storage = makeMemoryStorage();
		const settings = createSettingsStore(storage);
		const alertsStore = createAlertsStore({
			settingsStore: settings,
			storage,
			getPayload: () => null
		});

		const result = await alertsStore.requestPermission();

		expect(mockNotification.requestPermission).toHaveBeenCalled();
		expect(result).toBe('granted');
		expect(alertsStore.permission).toBe('granted');
	});

	it('emits browser notification when alertsEnabled and permission granted', async () => {
		(mockNotification as any).permission = 'granted';
		const storage = makeMemoryStorage();
		const settings = createSettingsStore(storage);
		settings.setAlertsEnabled(true);

		const payload = createMockPayload();
		payload.hourly[1]!.weatherCode = 95; // Thunderstorm

		const alertsStore = createAlertsStore({
			settingsStore: settings,
			storage,
			getPayload: () => payload
		});

		alertsStore.evaluate(Date.UTC(2026, 7, 20, 11, 15));

		// Wait for microtasks
		await Promise.resolve();

		expect(mockNotification).toHaveBeenCalledWith(
			expect.stringContaining('Severe'),
			expect.objectContaining({
				body: expect.stringContaining('Thunderstorm')
			})
		);
	});

	it('does NOT emit notification when alertsEnabled is false', async () => {
		(mockNotification as any).permission = 'granted';
		const storage = makeMemoryStorage();
		const settings = createSettingsStore(storage);
		settings.setAlertsEnabled(false);

		const payload = createMockPayload();
		payload.hourly[1]!.weatherCode = 95;

		const alertsStore = createAlertsStore({
			settingsStore: settings,
			storage,
			getPayload: () => payload
		});

		alertsStore.evaluate(Date.UTC(2026, 7, 20, 11, 15));
		await Promise.resolve();

		expect(mockNotification).not.toHaveBeenCalled();
	});
});
