import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchLocations } from '../api/geocoding';
import { cacheKey, createForecastCache } from '../cache/forecastCache';
import { createFavoritesStore } from '../stores/favorites.svelte';
import { createForecastStore } from '../stores/forecast.svelte';
import { createLocationStore } from '../stores/location.svelte';
import { memoryStorage } from '../stores/memoryStorage';
import { createSettingsStore } from '../stores/settings.svelte';
import type { ForecastPayload, Location } from '../types';

const NOW = 1_755_700_000_000;

const MOSCOW_LOCATION: Location = {
	id: '55.7558,37.6173',
	name: 'Москва',
	admin1: 'Москва',
	country: 'Россия',
	countryCode: 'RU',
	latitude: 55.7558,
	longitude: 37.6173,
	timezone: 'Europe/Moscow'
};

const KAZAN_LOCATION: Location = {
	id: '55.7887,49.1221',
	name: 'Казань',
	admin1: 'Татарстан',
	country: 'Россия',
	countryCode: 'RU',
	latitude: 55.7887,
	longitude: 49.1221,
	timezone: 'Europe/Moscow'
};

const SPB_LOCATION: Location = {
	id: '59.9386,30.3141',
	name: 'Санкт-Петербург',
	admin1: 'Санкт-Петербург',
	country: 'Россия',
	countryCode: 'RU',
	latitude: 59.9386,
	longitude: 30.3141,
	timezone: 'Europe/Moscow'
};

function makePayload(temperature: number, timeStr = '2026-08-20T12:00'): ForecastPayload {
	return {
		current: {
			time: timeStr,
			temperature,
			apparentTemperature: temperature + 1,
			weatherCode: 1,
			humidity: 60,
			pressureHpa: 1012,
			windSpeed: 3.5,
			windDirection: 180,
			windGusts: 5.0,
			precipitation: 0
		},
		hourly: [
			{
				time: timeStr,
				temperature,
				apparentTemperature: temperature + 1,
				weatherCode: 1,
				precipitationProbability: 10,
				precipitation: 0,
				windSpeed: 3.5,
				windDirection: 180
			}
		],
		daily: [
			{
				date: timeStr.slice(0, 10),
				weatherCode: 1,
				temperatureMax: temperature + 4,
				temperatureMin: temperature - 4,
				apparentMax: temperature + 5,
				apparentMin: temperature - 3,
				precipitationProbabilityMax: 20,
				precipitationSum: 0,
				windSpeedMax: 5.0,
				windGustMax: 8.0,
				sunrise: `${timeStr.slice(0, 10)}T05:30`,
				sunset: `${timeStr.slice(0, 10)}T20:30`,
				uvIndexMax: 4.5
			}
		],
		timezone: 'Europe/Moscow'
	};
}

async function settle(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

describe('Integration Test Suite', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	describe('Scenario 1: City search -> Selection -> Forecast fetch -> Caching -> Persistence in localStorage and SWR reload', () => {
		it('completes the full flow from geocoding search to SWR cache revalidation', async () => {
			const storage = memoryStorage();
			const locationStore = createLocationStore(storage);
			const settingsStore = createSettingsStore(storage);

			// 1. Mock Geocoding search results
			const geocodingResponse = {
				results: [
					{
						id: 551487,
						name: 'Казань',
						latitude: 55.7887,
						longitude: 49.1221,
						country_code: 'RU',
						admin1: 'Татарстан',
						country: 'Россия',
						timezone: 'Europe/Moscow'
					}
				]
			};
			const fetchMock = vi.fn(async (url: string) => {
				if (url.includes('geocoding-api.open-meteo.com')) {
					return new Response(JSON.stringify(geocodingResponse), {
						status: 200,
						headers: { 'content-type': 'application/json' }
					});
				}
				throw new Error(`Unexpected fetch URL: ${url}`);
			});
			vi.stubGlobal('fetch', fetchMock);

			// 2. User searches for "Казань"
			const searchResults = await searchLocations('Казань');
			expect(searchResults).toHaveLength(1);
			const selectedCity = searchResults[0];
			expect(selectedCity.name).toBe('Казань');
			expect(selectedCity.id).toBe('55.7887,49.1221');

			// 3. User selects the city -> location store updates and persists
			locationStore.setLocation(selectedCity);
			expect(locationStore.current).toEqual(selectedCity);
			expect(JSON.parse(storage.getItem('weather:location')!)).toEqual(selectedCity);

			// 4. Forecast store fetches weather for the selected city
			const initialPayload = makePayload(22);
			const fetcher = vi.fn().mockResolvedValue(initialPayload);

			const forecastStore = createForecastStore({
				storage,
				locationStore,
				settingsStore,
				fetcher
			});

			forecastStore.load(locationStore.current);
			await settle();

			expect(fetcher).toHaveBeenCalledTimes(1);
			expect(fetcher).toHaveBeenCalledWith(selectedCity);
			expect(forecastStore.status).toBe('fresh');
			expect(forecastStore.payload?.current.temperature).toBe(22);
			expect(forecastStore.fetchedAt).toBe(NOW);
			expect(settingsStore.lastUpdated).toBe(NOW);

			// 5. Verify caching and storage persistence
			const cache = createForecastCache(storage);
			const cachedEntry = cache.get(cacheKey(selectedCity.latitude, selectedCity.longitude));
			expect(cachedEntry).not.toBeNull();
			expect(cachedEntry?.payload.current.temperature).toBe(22);
			expect(cachedEntry?.fetchedAt).toBe(NOW);

			// 6. SWR reload within fresh threshold (e.g. 5 minutes later)
			vi.setSystemTime(NOW + 5 * 60 * 1000);
			const freshStore = createForecastStore({
				storage,
				locationStore: createLocationStore(storage),
				settingsStore: createSettingsStore(storage),
				fetcher
			});

			freshStore.load();
			await settle();

			// Serves from cache immediately without network calls
			expect(freshStore.status).toBe('fresh');
			expect(freshStore.payload?.current.temperature).toBe(22);
			expect(freshStore.refreshing).toBe(false);
			expect(fetcher).toHaveBeenCalledTimes(1); // No new network call

			// 7. SWR reload past stale threshold (e.g. 30 minutes later)
			vi.setSystemTime(NOW + 30 * 60 * 1000);
			const updatedPayload = makePayload(26);
			const pendingRefresh: Array<{ resolve: (p: ForecastPayload) => void }> = [];
			const backgroundFetcher = vi.fn(
				() =>
					new Promise<ForecastPayload>((resolve) => {
						pendingRefresh.push({ resolve });
					})
			);

			const staleStore = createForecastStore({
				storage,
				locationStore: createLocationStore(storage),
				settingsStore: createSettingsStore(storage),
				fetcher: backgroundFetcher
			});

			staleStore.load();
			await settle();

			// Serves stale cache instantly without blanking UI, while refreshing in background
			expect(staleStore.status).toBe('stale');
			expect(staleStore.payload?.current.temperature).toBe(22);
			expect(staleStore.refreshing).toBe(true);
			expect(backgroundFetcher).toHaveBeenCalledTimes(1);

			// Background network fetch completes
			pendingRefresh[0].resolve(updatedPayload);
			await settle();

			expect(staleStore.status).toBe('fresh');
			expect(staleStore.payload?.current.temperature).toBe(26);
			expect(staleStore.refreshing).toBe(false);
			expect(staleStore.fetchedAt).toBe(NOW + 30 * 60 * 1000);
		});
	});

	describe('Scenario 2: Offline scenario: starting with cached forecast, offline reconnect, and force retry flow', () => {
		it('handles offline startup, preserves data during failed force retries, and revalidates on online event', async () => {
			const storage = memoryStorage();
			const cachedPayload = makePayload(10);
			const cachedTime = NOW - 2 * 60 * 60 * 1000;

			// Pre-seed storage with cached forecast for Moscow
			createForecastCache(storage).set(
				cacheKey(MOSCOW_LOCATION.latitude, MOSCOW_LOCATION.longitude),
				{
					fetchedAt: cachedTime,
					location: MOSCOW_LOCATION,
					payload: cachedPayload
				}
			);

			let isOnline = false;
			const pendingFetch: Array<{
				resolve: (payload: ForecastPayload) => void;
				reject: (err: unknown) => void;
			}> = [];
			const fetcher = vi.fn(
				() =>
					new Promise<ForecastPayload>((resolve, reject) => {
						pendingFetch.push({ resolve, reject });
					})
			);

			const eventListeners = new Map<string, Set<() => void>>();
			const mockWindow = {
				addEventListener: vi.fn((event: string, handler: () => void) => {
					if (!eventListeners.has(event)) eventListeners.set(event, new Set());
					eventListeners.get(event)!.add(handler);
				}),
				removeEventListener: vi.fn((event: string, handler: () => void) => {
					eventListeners.get(event)?.delete(handler);
				}),
				dispatchEvent: vi.fn((event: { type: string }) => {
					eventListeners.get(event.type)?.forEach((fn) => fn());
					return true;
				})
			};
			vi.stubGlobal('window', mockWindow);

			const locationStore = createLocationStore(storage);
			const settingsStore = createSettingsStore(storage);
			const store = createForecastStore({
				storage,
				locationStore,
				settingsStore,
				fetcher,
				onLine: () => isOnline
			});

			// 1. Startup in offline mode
			store.load();
			await settle();

			expect(store.status).toBe('offline');
			expect(store.payload?.current.temperature).toBe(10);
			expect(store.fetchedAt).toBe(cachedTime);
			expect(fetcher).not.toHaveBeenCalled();

			// 2. User presses "Retry" / "Повторить" while still offline
			store.refresh();
			expect(store.refreshing).toBe(true);
			expect(fetcher).toHaveBeenCalledTimes(1);

			// Network fails again
			pendingFetch[0].reject({ kind: 'network' });
			await settle();

			// Status returns to offline, preserving cached payload on screen without errors
			expect(store.status).toBe('offline');
			expect(store.refreshing).toBe(false);
			expect(store.payload?.current.temperature).toBe(10);
			expect(store.error).toBeNull();

			// 3. Internet is restored -> browser fires 'online' event
			isOnline = true;
			const freshOnlinePayload = makePayload(19);

			// Trigger online event on window
			mockWindow.dispatchEvent({ type: 'online' });
			expect(fetcher).toHaveBeenCalledTimes(2);

			pendingFetch[1].resolve(freshOnlinePayload);
			await settle();

			expect(store.status).toBe('fresh');
			expect(store.payload?.current.temperature).toBe(19);
			expect(store.refreshing).toBe(false);
			expect(store.fetchedAt).toBe(NOW);

			// 4. Destroy cleans up the window event listener
			store.destroy();
			expect(mockWindow.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
		});
	});

	describe('Scenario 3: Favorites lifecycle: adding city, deduplication checks, switching active city, re-checking favorite status, removal from favorites', () => {
		it('manages favorites lifecycle, coordinates-based deduplication, active city sync, and persistence', () => {
			const storage = memoryStorage();
			const favoritesStore = createFavoritesStore(storage);
			const locationStore = createLocationStore(storage);

			expect(favoritesStore.list).toEqual([]);
			expect(favoritesStore.isFavorite(KAZAN_LOCATION)).toBe(false);

			// 1. Add city to favorites
			favoritesStore.toggleFavorite(KAZAN_LOCATION);
			expect(favoritesStore.isFavorite(KAZAN_LOCATION)).toBe(true);
			expect(favoritesStore.list).toHaveLength(1);
			expect(favoritesStore.list[0]).toEqual(KAZAN_LOCATION);

			// Check persistence across store instances
			const restoredStore = createFavoritesStore(storage);
			expect(restoredStore.isFavorite(KAZAN_LOCATION)).toBe(true);
			expect(restoredStore.list).toEqual([KAZAN_LOCATION]);

			// 2. Deduplication check: match by coordinates even with custom ID string
			const kazanDuplicateId: Location = {
				...KAZAN_LOCATION,
				id: 'custom-kazan-entry-123'
			};
			expect(favoritesStore.isFavorite(kazanDuplicateId)).toBe(true);

			// Toggling it removes the existing entry rather than adding a duplicate
			favoritesStore.toggleFavorite(kazanDuplicateId);
			expect(favoritesStore.isFavorite(KAZAN_LOCATION)).toBe(false);
			expect(favoritesStore.list).toEqual([]);

			// 3. Reject adding unnamed / generic geolocation items to favorites (FV-3)
			const unnamedGeo: Location = {
				id: '55.76,37.62',
				name: 'Моё местоположение',
				latitude: 55.76,
				longitude: 37.62,
				timezone: 'Europe/Moscow'
			};
			favoritesStore.toggleFavorite(unnamedGeo);
			expect(favoritesStore.isFavorite(unnamedGeo)).toBe(false);
			expect(favoritesStore.list).toEqual([]);

			// 4. Add multiple cities and switch active city
			favoritesStore.toggleFavorite(KAZAN_LOCATION);
			favoritesStore.toggleFavorite(SPB_LOCATION);
			expect(favoritesStore.list).toHaveLength(2);

			// Active city is SPB -> favorite status should be true
			locationStore.setLocation(SPB_LOCATION);
			expect(favoritesStore.isFavorite(locationStore.current)).toBe(true);

			// Active city is Moscow (not in favorites) -> favorite status should be false
			locationStore.setLocation(MOSCOW_LOCATION);
			expect(favoritesStore.isFavorite(locationStore.current)).toBe(false);

			// 5. Remove from favorites
			favoritesStore.removeFavorite(KAZAN_LOCATION.id);
			expect(favoritesStore.isFavorite(KAZAN_LOCATION)).toBe(false);
			expect(favoritesStore.isFavorite(SPB_LOCATION)).toBe(true);
			expect(favoritesStore.list).toEqual([SPB_LOCATION]);

			// Verify storage matches
			const persistedAfterRemoval = createFavoritesStore(storage);
			expect(persistedAfterRemoval.list).toEqual([SPB_LOCATION]);
		});
	});

	describe('Scenario 4: Geolocation simulation: geocoding reverse coordinates, rounding to 2 decimals, preventing duplicate cache entries on jitter', () => {
		it('rounds geolocation coordinates to 2 decimals and avoids duplicate cache entries on GPS jitter', async () => {
			const storage = memoryStorage();
			let gpsCallback: (pos: unknown) => void = () => {};

			vi.stubGlobal('navigator', {
				geolocation: {
					getCurrentPosition: vi.fn((success: (pos: unknown) => void) => {
						gpsCallback = success;
					})
				}
			});

			const locationStore = createLocationStore(storage);
			const settingsStore = createSettingsStore(storage);
			const fetcher = vi.fn().mockResolvedValue(makePayload(15));

			// 1. Request first GPS position: (55.75582, 37.61731)
			locationStore.requestGeolocation();
			expect(locationStore.geoPending).toBe(true);

			gpsCallback({
				coords: {
					latitude: 55.75582,
					longitude: 37.61731
				}
			});

			expect(locationStore.geoPending).toBe(false);
			expect(locationStore.geoState).toBe('idle');
			// Coordinates rounded to 2 decimals (55.76, 37.62)
			expect(locationStore.current.latitude).toBe(55.76);
			expect(locationStore.current.longitude).toBe(37.62);
			expect(locationStore.current.id).toBe('55.7600,37.6200');
			expect(locationStore.current.name).toBe('Моё местоположение');

			// 2. Fetch forecast for geolocated position
			const forecastStore = createForecastStore({
				storage,
				locationStore,
				settingsStore,
				fetcher
			});

			forecastStore.load(locationStore.current);
			await settle();

			expect(fetcher).toHaveBeenCalledTimes(1);
			expect(forecastStore.status).toBe('fresh');

			// Check forecast cache key
			const cache = createForecastCache(storage);
			const expectedKey = cacheKey(locationStore.current.latitude, locationStore.current.longitude);
			expect(expectedKey).toBe('forecast:55.7600,37.6200');
			expect(cache.get(expectedKey)).not.toBeNull();

			// 3. GPS Jitter: second position arrives with small noise (55.75712, 37.61889) (~160m delta)
			locationStore.requestGeolocation();
			gpsCallback({
				coords: {
					latitude: 55.75712,
					longitude: 37.61889
				}
			});

			// Due to 2-decimal rounding, the produced location ID and coords are identical
			expect(locationStore.current.latitude).toBe(55.76);
			expect(locationStore.current.longitude).toBe(37.62);
			expect(locationStore.current.id).toBe('55.7600,37.6200');

			// 4. Loading forecast for jittered position results in cache hit without redundant fetch
			forecastStore.load(locationStore.current);
			await settle();

			expect(fetcher).toHaveBeenCalledTimes(1); // Still 1, no duplicate network call
			expect(forecastStore.status).toBe('fresh');
		});
	});
});
