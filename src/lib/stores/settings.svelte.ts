import { DEFAULT_LANGUAGE, type Language } from '../i18n';

export const STORAGE_KEY = 'weather:settings';

// Phase 2 adds the dark theme; v1 ships 'light' only (no System/Light toggle).
export type Theme = 'light' | 'dark';

export type SettingsStore = {
	readonly theme: Theme;
	readonly language: Language;
	readonly lastUpdated: number | null;
	setLanguage(lang: Language): void;
	touchLastUpdated(now?: number): void;
};

type SettingsData = {
	theme: Theme;
	language: Language;
	lastUpdated: number | null;
};

const DEFAULT_SETTINGS: SettingsData = {
	theme: 'light',
	language: DEFAULT_LANGUAGE,
	lastUpdated: null
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

	return { theme, language, lastUpdated: lastUpdated as number | null };
}

export function createSettingsStore(storage: Storage | null = defaultStorage()): SettingsStore {
	const persisted = readSettings(storage);
	let theme = $state<Theme>(persisted?.theme ?? DEFAULT_SETTINGS.theme);
	let language = $state<Language>(persisted?.language ?? DEFAULT_SETTINGS.language);
	let lastUpdated = $state<number | null>(persisted?.lastUpdated ?? DEFAULT_SETTINGS.lastUpdated);

	function persist(): void {
		if (storage === null) return;
		try {
			storage.setItem(
				STORAGE_KEY,
				JSON.stringify({ theme, language, lastUpdated } satisfies SettingsData)
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
		setLanguage,
		touchLastUpdated
	};
}

let singleton: SettingsStore | null = null;

export function getSettingsStore(): SettingsStore {
	singleton ??= createSettingsStore();
	return singleton;
}
