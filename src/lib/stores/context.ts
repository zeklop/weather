import { getContext, setContext } from 'svelte';
import type { ForecastStore } from './forecast.svelte';

const FORECAST_KEY = Symbol('FORECAST_STORE');

export function setForecastStore(store: ForecastStore): void {
	setContext(FORECAST_KEY, store);
}

export function getForecastStore(): ForecastStore {
	const store = getContext<ForecastStore>(FORECAST_KEY);
	if (!store) {
		throw new Error('ForecastStore is not available in current Svelte context');
	}
	return store;
}
