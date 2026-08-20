export const STORAGE_KEY = 'weather:settings';

// Phase 2 adds the dark theme; v1 ships 'light' only (no System/Light toggle).
export type Theme = 'light' | 'dark';

export type SettingsStore = {
	readonly theme: Theme;
	readonly lastUpdated: number | null;
	touchLastUpdated(now?: number): void;
};

type SettingsData = {
	theme: Theme;
	lastUpdated: number | null;
};

const DEFAULT_SETTINGS: SettingsData = {
	theme: 'light',
	lastUpdated: null
};

function defaultStorage(): Storage | null {
	return typeof localStorage !== 'undefined' ? localStorage : null;
}

function isTheme(value: unknown): value is Theme {
	return value === 'light' || value === 'dark';
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

	return { theme, lastUpdated: lastUpdated as number | null };
}

export function createSettingsStore(storage: Storage | null = defaultStorage()): SettingsStore {
	const persisted = readSettings(storage);
	let theme = $state<Theme>(persisted?.theme ?? DEFAULT_SETTINGS.theme);
	let lastUpdated = $state<number | null>(persisted?.lastUpdated ?? DEFAULT_SETTINGS.lastUpdated);

	function persist(): void {
		if (storage === null) return;
		try {
			storage.setItem(STORAGE_KEY, JSON.stringify({ theme, lastUpdated } satisfies SettingsData));
		} catch {
			/* storage unavailable — keep running in memory */
		}
	}

	function touchLastUpdated(now = Date.now()): void {
		lastUpdated = now;
		persist();
	}

	return {
		get theme() {
			return theme;
		},
		get lastUpdated() {
			return lastUpdated;
		},
		touchLastUpdated
	};
}

let singleton: SettingsStore | null = null;

export function getSettingsStore(): SettingsStore {
	singleton ??= createSettingsStore();
	return singleton;
}
