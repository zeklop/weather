import { geoId } from '../api/geocoding';
import { reverseGeocode } from '../api/reverseGeocode';
import type { Language } from '../i18n';
import { isUnnamedLocation, type FavoritesStore } from './favorites.svelte';
import type { LocationStore } from './location.svelte';

/**
 * Best-effort rename of the current location and all favorites into the given
 * UI language. Persisted locations keep the name of the language that was
 * active at selection time; this re-resolves them via reverse geocoding after
 * a language switch. Every lookup is independent — a failure just leaves the
 * old name in place.
 */
export async function relocalizeStoredNames(
	locationStore: LocationStore,
	favoritesStore: FavoritesStore,
	lang: Language
): Promise<void> {
	const current = locationStore.current;
	// Unique targets by stable key: the current city is often favorited too.
	const targets = new Map<string, { latitude: number; longitude: number }>();
	if (!isUnnamedLocation(current)) {
		targets.set(current.id, { latitude: current.latitude, longitude: current.longitude });
	}
	for (const fav of favoritesStore.list) {
		targets.set(geoId(fav.latitude, fav.longitude), {
			latitude: fav.latitude,
			longitude: fav.longitude
		});
	}

	await Promise.all(
		[...targets.entries()].map(async ([key, coords]) => {
			const resolved = await reverseGeocode(coords.latitude, coords.longitude, lang);
			if (!resolved) return;
			// The user may have switched city mid-flight — only rename what's shown.
			if (locationStore.current.id === key && !isUnnamedLocation(locationStore.current)) {
				locationStore.setLocation({ ...locationStore.current, ...resolved });
			}
			favoritesStore.renameFavorite(key, resolved);
		})
	);
}
