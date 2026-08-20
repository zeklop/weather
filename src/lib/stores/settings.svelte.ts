import { DEFAULT_LANGUAGE, type Language } from '../i18n';

export const STORAGE_KEY = 'weather:settings';

// Phase 2 adds the dark theme; v1 ships 'light' only (no System/Light toggle).
export type Theme = 'light' | 'dark';

export type SettingsStore = {
	readonly theme: Theme;
	readonly language: Language;
	readonly lastUpdated: number | null;
	readonly alertsEnabled: boolean;
	readonly precipitationAlerts: boolean;
	readonly severeAlerts: boolean;
	readonly freezeAlerts: boolean;
	readonly quietHoursEnabled: boolean;
	setLanguage(lang: Language): void;
	touchLastUpdated(now?: number): void;
	setAlertsEnabled(enabled: boolean): void;
	setPrecipitationAlerts(enabled: boolean): void;
	setSevereAlerts(enabled: boolean): void;
	setFreezeAlerts(enabled: boolean): void;
	setQuietHoursEnabled(enabled: boolean): void;
};

type SettingsData = {
	theme: Theme;
	language: Language;
	lastUpdated: number | null;
	alertsEnabled: boolean;
	precipitationAlerts: boolean;
	severeAlerts: boolean;
	freezeAlerts: boolean;
	quietHoursEnabled: boolean;
};

const DEFAULT_SETTINGS: SettingsData = {
	theme: 'light',
	language: DEFAULT_LANGUAGE,
	lastUpdated: null,
	alertsEnabled: false,
	precipitationAlerts: true,
	severeAlerts: true,
	freezeAlerts: true,
	quietHoursEnabled: true
};

function defaultStorage(): Storage | null {
	return typeof localStorage !== 'undefined' ? localStorage : null;
}

function isTheme(value: unknown): value is Theme {
	return value === 'light' || value === 'dark';
}

function isLanguage(value: unknown): value is Language {
	return value === 'en' || value === 'ru';
}

function removeItem(storage: Storage, key: string): void {
	try {
		storage.removeItem(key);
	} catch {
		/* noop */
	}
}

function readSettings(storage: Storage | null): SettingsData | null {
	if (storage === null) return null;
	let raw: string | null;
	try {
		raw = storage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
	if (raw === null) return null;

	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		// Corrupt JSON — self-heal by dropping the bad payload.
		removeItem(storage, STORAGE_KEY);
		return null;
	}
	if (typeof value !== 'object' || value === null) {
		removeItem(storage, STORAGE_KEY);
		return null;
	}

	const entry = value as Record<string, unknown>;
	const theme = entry['theme'];
	const lastUpdated = entry['lastUpdated'];
	if (!isTheme(theme) || (lastUpdated !== null && !Number.isFinite(lastUpdated))) {
		removeItem(storage, STORAGE_KEY);
		return null;
	}

	const language: Language = isLanguage(entry['language'])
		? entry['language']
		: DEFAULT_SETTINGS.language;

	const alertsEnabled =
		typeof entry['alertsEnabled'] === 'boolean'
			? entry['alertsEnabled']
			: DEFAULT_SETTINGS.alertsEnabled;
	const precipitationAlerts =
		typeof entry['precipitationAlerts'] === 'boolean'
			? entry['precipitationAlerts']
			: DEFAULT_SETTINGS.precipitationAlerts;
	const severeAlerts =
		typeof entry['severeAlerts'] === 'boolean'
			? entry['severeAlerts']
			: DEFAULT_SETTINGS.severeAlerts;
	const freezeAlerts =
		typeof entry['freezeAlerts'] === 'boolean'
			? entry['freezeAlerts']
			: DEFAULT_SETTINGS.freezeAlerts;
	const quietHoursEnabled =
		typeof entry['quietHoursEnabled'] === 'boolean'
			? entry['quietHoursEnabled']
			: DEFAULT_SETTINGS.quietHoursEnabled;

	return {
		theme,
		language,
		lastUpdated: lastUpdated as number | null,
		alertsEnabled,
		precipitationAlerts,
		severeAlerts,
		freezeAlerts,
		quietHoursEnabled
	};
}

export function createSettingsStore(storage: Storage | null = defaultStorage()): SettingsStore {
	const persisted = readSettings(storage);
	let theme = $state<Theme>(persisted?.theme ?? DEFAULT_SETTINGS.theme);
	let language = $state<Language>(persisted?.language ?? DEFAULT_SETTINGS.language);
	let lastUpdated = $state<number | null>(persisted?.lastUpdated ?? DEFAULT_SETTINGS.lastUpdated);
	let alertsEnabled = $state<boolean>(persisted?.alertsEnabled ?? DEFAULT_SETTINGS.alertsEnabled);
	let precipitationAlerts = $state<boolean>(
		persisted?.precipitationAlerts ?? DEFAULT_SETTINGS.precipitationAlerts
	);
	let severeAlerts = $state<boolean>(persisted?.severeAlerts ?? DEFAULT_SETTINGS.severeAlerts);
	let freezeAlerts = $state<boolean>(persisted?.freezeAlerts ?? DEFAULT_SETTINGS.freezeAlerts);
	let quietHoursEnabled = $state<boolean>(
		persisted?.quietHoursEnabled ?? DEFAULT_SETTINGS.quietHoursEnabled
	);

	function persist(): void {
		if (storage === null) return;
		try {
			storage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					theme,
					language,
					lastUpdated,
					alertsEnabled,
					precipitationAlerts,
					severeAlerts,
					freezeAlerts,
					quietHoursEnabled
				} satisfies SettingsData)
			);
		} catch {
			/* storage unavailable — keep running in memory */
		}
	}

	function setLanguage(lang: Language): void {
		language = lang;
		persist();
	}

	function touchLastUpdated(now = Date.now()): void {
		lastUpdated = now;
		persist();
	}

	function setAlertsEnabled(enabled: boolean): void {
		alertsEnabled = enabled;
		persist();
	}

	function setPrecipitationAlerts(enabled: boolean): void {
		precipitationAlerts = enabled;
		persist();
	}

	function setSevereAlerts(enabled: boolean): void {
		severeAlerts = enabled;
		persist();
	}

	function setFreezeAlerts(enabled: boolean): void {
		freezeAlerts = enabled;
		persist();
	}

	function setQuietHoursEnabled(enabled: boolean): void {
		quietHoursEnabled = enabled;
		persist();
	}

	return {
		get theme() {
			return theme;
		},
		get language() {
			return language;
		},
		get lastUpdated() {
			return lastUpdated;
		},
		get alertsEnabled() {
			return alertsEnabled;
		},
		get precipitationAlerts() {
			return precipitationAlerts;
		},
		get severeAlerts() {
			return severeAlerts;
		},
		get freezeAlerts() {
			return freezeAlerts;
		},
		get quietHoursEnabled() {
			return quietHoursEnabled;
		},
		setLanguage,
		touchLastUpdated,
		setAlertsEnabled,
		setPrecipitationAlerts,
		setSevereAlerts,
		setFreezeAlerts,
		setQuietHoursEnabled
	};
}

let singleton: SettingsStore | null = null;

export function getSettingsStore(): SettingsStore {
	singleton ??= createSettingsStore();
	return singleton;
}
