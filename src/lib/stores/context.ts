import { getContext, setContext } from 'svelte';
import type { ForecastStore } from './forecast.svelte';
import type { AlertsStore } from './alerts.svelte';

const FORECAST_KEY = Symbol('FORECAST_STORE');
const ALERTS_KEY = Symbol('ALERTS_STORE');

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

export function setAlertsStore(store: AlertsStore): void {
	setContext(ALERTS_KEY, store);
}

export function getAlertsStoreContext(): AlertsStore {
	const store = getContext<AlertsStore>(ALERTS_KEY);
	if (!store) {
		throw new Error('AlertsStore is not available in current Svelte context');
	}
	return store;
}
