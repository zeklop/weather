import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, createSettingsStore } from '../settings.svelte';
import { makeMemoryStorage } from './memoryStorage';

const NOW = 1_752_000_000_000;

afterEach(() => {
	vi.useRealTimers();
});

describe('createSettingsStore', () => {
	it('defaults to system theme, en language, badgeEnabled true, and no last update', () => {
		const store = createSettingsStore(makeMemoryStorage());

		expect(store.theme).toBe('system');
		expect(store.language).toBe('en');
		expect(store.badgeEnabled).toBe(true);
		expect(store.lastUpdated).toBeNull();
		expect(store.alertsEnabled).toBe(false);
		expect(store.precipitationAlerts).toBe(true);
		expect(store.severeAlerts).toBe(true);
		expect(store.freezeAlerts).toBe(true);
		expect(store.quietHoursEnabled).toBe(true);
	});

	it('setBadgeEnabled updates badgeEnabled and persists it', () => {
		const storage = makeMemoryStorage();
		const store = createSettingsStore(storage);

		expect(store.badgeEnabled).toBe(true);
		store.setBadgeEnabled(false);
		expect(store.badgeEnabled).toBe(false);
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toMatchObject({
			badgeEnabled: false
		});

		const fresh = createSettingsStore(storage);
		expect(fresh.badgeEnabled).toBe(false);
	});

	it('setTheme updates the theme and persists it', () => {
		const storage = makeMemoryStorage();
		const store = createSettingsStore(storage);

		store.setTheme('dark');
		expect(store.theme).toBe('dark');
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toMatchObject({
			theme: 'dark'
		});

		store.setTheme('light');
		expect(store.theme).toBe('light');
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toMatchObject({
			theme: 'light'
		});

		store.setTheme('system');
		expect(store.theme).toBe('system');
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toMatchObject({
			theme: 'system'
		});

		const fresh = createSettingsStore(storage);
		expect(fresh.theme).toBe('system');
	});

	it('persists and updates alert toggles', () => {
		const storage = makeMemoryStorage();
		const store = createSettingsStore(storage);

		store.setAlertsEnabled(true);
		store.setPrecipitationAlerts(false);
		store.setSevereAlerts(true);
		store.setFreezeAlerts(false);
		store.setQuietHoursEnabled(false);

		expect(store.alertsEnabled).toBe(true);
		expect(store.precipitationAlerts).toBe(false);
		expect(store.severeAlerts).toBe(true);
		expect(store.freezeAlerts).toBe(false);
		expect(store.quietHoursEnabled).toBe(false);

		const fresh = createSettingsStore(storage);
		expect(fresh.alertsEnabled).toBe(true);
		expect(fresh.precipitationAlerts).toBe(false);
		expect(fresh.freezeAlerts).toBe(false);
		expect(fresh.quietHoursEnabled).toBe(false);
	});

	it('setLanguage updates the language and persists it', () => {
		const storage = makeMemoryStorage();
		const store = createSettingsStore(storage);

		store.setLanguage('ru');

		expect(store.language).toBe('ru');
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toMatchObject({
			theme: 'system',
			language: 'ru',
			lastUpdated: null,
			alertsEnabled: false,
			precipitationAlerts: true,
			severeAlerts: true,
			freezeAlerts: true,
			quietHoursEnabled: true
		});

		const fresh = createSettingsStore(storage);
		expect(fresh.language).toBe('ru');
	});

	it('migrates legacy settings payload without language field gracefully to en', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ theme: 'dark', lastUpdated: NOW })
		});

		const store = createSettingsStore(storage);

		expect(store.theme).toBe('dark');
		expect(store.language).toBe('en');
		expect(store.badgeEnabled).toBe(true);
		expect(store.lastUpdated).toBe(NOW);
	});

	it('restores persisted badgeEnabled false', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ theme: 'light', badgeEnabled: false, lastUpdated: NOW })
		});

		const store = createSettingsStore(storage);

		expect(store.theme).toBe('light');
		expect(store.badgeEnabled).toBe(false);
	});

	it('restores persisted ru language', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ theme: 'light', language: 'ru', lastUpdated: NOW })
		});

		const store = createSettingsStore(storage);

		expect(store.theme).toBe('light');
		expect(store.language).toBe('ru');
		expect(store.lastUpdated).toBe(NOW);
	});

	it('falls back invalid language to en while preserving theme and lastUpdated', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ theme: 'light', language: 'fr', lastUpdated: NOW })
		});

		const store = createSettingsStore(storage);

		expect(store.theme).toBe('light');
		expect(store.language).toBe('en');
		expect(store.lastUpdated).toBe(NOW);
	});

	it('touchLastUpdated records and persists the timestamp', () => {
		const storage = makeMemoryStorage();
		const store = createSettingsStore(storage);

		store.touchLastUpdated(NOW);

		expect(store.lastUpdated).toBe(NOW);
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toMatchObject({
			theme: 'system',
			language: 'en',
			lastUpdated: NOW,
			alertsEnabled: false,
			precipitationAlerts: true,
			severeAlerts: true,
			freezeAlerts: true,
			quietHoursEnabled: true
		});

		const fresh = createSettingsStore(storage);
		expect(fresh.lastUpdated).toBe(NOW);
		expect(fresh.theme).toBe('system');
		expect(fresh.language).toBe('en');
	});

	it('touchLastUpdated defaults to Date.now()', () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);

		const store = createSettingsStore(makeMemoryStorage());
		store.touchLastUpdated();

		expect(store.lastUpdated).toBe(NOW);
	});

	it('is ready for the Phase 2 dark theme', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ theme: 'dark', lastUpdated: NOW })
		});

		const store = createSettingsStore(storage);

		expect(store.theme).toBe('dark');
		expect(store.lastUpdated).toBe(NOW);
	});

	it('self-heals corrupt settings JSON to defaults', () => {
		const storage = makeMemoryStorage({ [STORAGE_KEY]: 'nope{' });

		const store = createSettingsStore(storage);

		expect(store.theme).toBe('system');
		expect(store.lastUpdated).toBeNull();
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('self-heals settings with an unknown theme to defaults', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ theme: 'neon', lastUpdated: NOW })
		});

		const store = createSettingsStore(storage);

		expect(store.theme).toBe('system');
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('self-heals settings with a non-numeric lastUpdated to defaults', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ theme: 'light', lastUpdated: 'вчера' })
		});

		const store = createSettingsStore(storage);

		expect(store.theme).toBe('system');
		expect(store.lastUpdated).toBeNull();
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('keeps working in memory when storage is unavailable', () => {
		const store = createSettingsStore(null);

		store.touchLastUpdated(NOW);

		expect(store.lastUpdated).toBe(NOW);
		expect(store.theme).toBe('system');
	});

	describe('sections customization & ordering', () => {
		it('initializes with default section order and all visible', () => {
			const store = createSettingsStore(makeMemoryStorage());
			expect(store.sectionOrder[0]).toBe('hero');
			expect(store.sectionOrder[1]).toBe('alerts');
			expect(store.visibleSections.hero).toBe(true);
			expect(store.visibleSections.astronomy).toBe(true);
		});

		it('moveSection shifts order up and down without moving hero and alerts', () => {
			const storage = makeMemoryStorage();
			const store = createSettingsStore(storage);

			// Trying to move hero or alerts does nothing
			store.moveSection('hero', 'down');
			expect(store.sectionOrder[0]).toBe('hero');
			store.moveSection('alerts', 'up');
			expect(store.sectionOrder[1]).toBe('alerts');

			// Move index 2 (precipHeuristic) down
			const initialThird = store.sectionOrder[2];
			const initialFourth = store.sectionOrder[3];
			store.moveSection(initialThird, 'down');

			expect(store.sectionOrder[2]).toBe(initialFourth);
			expect(store.sectionOrder[3]).toBe(initialThird);

			// Move it back up
			store.moveSection(initialThird, 'up');
			expect(store.sectionOrder[2]).toBe(initialThird);
		});

		it('setSectionVisible toggles visibility but keeps locked sections true', () => {
			const storage = makeMemoryStorage();
			const store = createSettingsStore(storage);

			store.setSectionVisible('hero', false); // locked
			expect(store.visibleSections.hero).toBe(true);

			store.setSectionVisible('astronomy', false);
			expect(store.visibleSections.astronomy).toBe(false);

			store.setSectionVisible('astronomy', true);
			expect(store.visibleSections.astronomy).toBe(true);
		});

		it('resetSections restores defaults', () => {
			const storage = makeMemoryStorage();
			const store = createSettingsStore(storage);

			store.setSectionVisible('astronomy', false);
			store.moveSection('metrics', 'up');

			store.resetSections();
			expect(store.visibleSections.astronomy).toBe(true);
			expect(store.sectionOrder[0]).toBe('hero');
			expect(store.sectionOrder[1]).toBe('alerts');
		});
	});
});