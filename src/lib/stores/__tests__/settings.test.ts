import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, createSettingsStore } from '../settings.svelte';
import { makeMemoryStorage } from './memoryStorage';

const NOW = 1_752_000_000_000;

afterEach(() => {
	vi.useRealTimers();
});

describe('createSettingsStore', () => {
	it('defaults to light theme and no last update', () => {
		const store = createSettingsStore(makeMemoryStorage());

		expect(store.theme).toBe('light');
		expect(store.lastUpdated).toBeNull();
	});

	it('touchLastUpdated records and persists the timestamp', () => {
		const storage = makeMemoryStorage();
		const store = createSettingsStore(storage);

		store.touchLastUpdated(NOW);

		expect(store.lastUpdated).toBe(NOW);
		expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({
			theme: 'light',
			lastUpdated: NOW
		});

		const fresh = createSettingsStore(storage);
		expect(fresh.lastUpdated).toBe(NOW);
		expect(fresh.theme).toBe('light');
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

		expect(store.theme).toBe('light');
		expect(store.lastUpdated).toBeNull();
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('self-heals settings with an unknown theme to defaults', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ theme: 'neon', lastUpdated: NOW })
		});

		const store = createSettingsStore(storage);

		expect(store.theme).toBe('light');
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('self-heals settings with a non-numeric lastUpdated to defaults', () => {
		const storage = makeMemoryStorage({
			[STORAGE_KEY]: JSON.stringify({ theme: 'light', lastUpdated: 'вчера' })
		});

		const store = createSettingsStore(storage);

		expect(store.theme).toBe('light');
		expect(store.lastUpdated).toBeNull();
		expect(storage.getItem(STORAGE_KEY)).toBeNull();
	});

	it('keeps working in memory when storage is unavailable', () => {
		const store = createSettingsStore(null);

		store.touchLastUpdated(NOW);

		expect(store.lastUpdated).toBe(NOW);
		expect(store.theme).toBe('light');
	});
});