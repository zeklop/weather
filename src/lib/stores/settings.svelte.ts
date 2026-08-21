import { DEFAULT_LANGUAGE, detectBrowserLanguage, type Language } from '../i18n';
import {
	DEFAULT_SECTION_ORDER,
	DEFAULT_VISIBLE_SECTIONS,
	normalizeSectionOrder,
	normalizeVisibleSections,
	type SectionId
} from '../weather/sections';

export const STORAGE_KEY = 'weather:settings';
export const CURRENT_SCHEMA_VERSION = 1;

export type Theme = 'system' | 'light' | 'dark';

export type SettingsStore = {
	readonly theme: Theme;
	readonly language: Language;
	readonly lastUpdated: number | null;
	readonly alertsEnabled: boolean;
	readonly precipitationAlerts: boolean;
	readonly severeAlerts: boolean;
	readonly freezeAlerts: boolean;
	readonly quietHoursEnabled: boolean;
	readonly badgeEnabled: boolean;
	readonly schemaVersion: number;
	readonly sectionOrder: SectionId[];
	readonly visibleSections: Record<SectionId, boolean>;
	setTheme(theme: Theme): void;
	setLanguage(lang: Language): void;
	touchLastUpdated(now?: number): void;
	setAlertsEnabled(enabled: boolean): void;
	setPrecipitationAlerts(enabled: boolean): void;
	setSevereAlerts(enabled: boolean): void;
	setFreezeAlerts(enabled: boolean): void;
	setQuietHoursEnabled(enabled: boolean): void;
	setBadgeEnabled(enabled: boolean): void;
	setSectionOrder(order: SectionId[]): void;
	setSectionVisible(id: SectionId, visible: boolean): void;
	moveSection(id: SectionId, direction: 'up' | 'down'): void;
	resetSections(): void;
};

type SettingsData = {
	schemaVersion: number;
	theme: Theme;
	language: Language;
	lastUpdated: number | null;
	alertsEnabled: boolean;
	precipitationAlerts: boolean;
	severeAlerts: boolean;
	freezeAlerts: boolean;
	quietHoursEnabled: boolean;
	badgeEnabled: boolean;
	sectionOrder: SectionId[];
	visibleSections: Record<SectionId, boolean>;
};

const DEFAULT_SETTINGS: SettingsData = {
	schemaVersion: CURRENT_SCHEMA_VERSION,
	theme: 'system',
	language: DEFAULT_LANGUAGE,
	lastUpdated: null,
	alertsEnabled: false,
	precipitationAlerts: true,
	severeAlerts: true,
	freezeAlerts: true,
	quietHoursEnabled: true,
	badgeEnabled: true,
	sectionOrder: DEFAULT_SECTION_ORDER,
	visibleSections: DEFAULT_VISIBLE_SECTIONS
};

function defaultStorage(): Storage | null {
	return typeof localStorage !== 'undefined' ? localStorage : null;
}

function isTheme(value: unknown): value is Theme {
	return value === 'system' || value === 'light' || value === 'dark';
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

export function readSettings(storage: Storage | null): SettingsData | null {
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
	const badgeEnabled =
		typeof entry['badgeEnabled'] === 'boolean'
			? entry['badgeEnabled']
			: DEFAULT_SETTINGS.badgeEnabled;

	const schemaVersion =
		typeof entry['schemaVersion'] === 'number' && Number.isFinite(entry['schemaVersion'])
			? (entry['schemaVersion'] as number)
			: CURRENT_SCHEMA_VERSION;

	const sectionOrder = normalizeSectionOrder(entry['sectionOrder']);
	const visibleSections = normalizeVisibleSections(entry['visibleSections']);

	return {
		schemaVersion,
		theme,
		language,
		lastUpdated: lastUpdated as number | null,
		alertsEnabled,
		precipitationAlerts,
		severeAlerts,
		freezeAlerts,
		quietHoursEnabled,
		badgeEnabled,
		sectionOrder,
		visibleSections
	};
}

export function createSettingsStore(storage: Storage | null = defaultStorage()): SettingsStore {
	const persisted = readSettings(storage);
	let theme = $state<Theme>(persisted?.theme ?? DEFAULT_SETTINGS.theme);
	let language = $state<Language>(persisted?.language ?? detectBrowserLanguage());
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
	let badgeEnabled = $state<boolean>(
		persisted?.badgeEnabled ?? DEFAULT_SETTINGS.badgeEnabled
	);
	let sectionOrder = $state<SectionId[]>(
		persisted?.sectionOrder ?? [...DEFAULT_SETTINGS.sectionOrder]
	);
	let visibleSections = $state<Record<SectionId, boolean>>({
		...(persisted?.visibleSections ?? DEFAULT_SETTINGS.visibleSections)
	});

	function persist(): void {
		if (storage === null) return;
		try {
			storage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					schemaVersion: CURRENT_SCHEMA_VERSION,
					theme,
					language,
					lastUpdated,
					alertsEnabled,
					precipitationAlerts,
					severeAlerts,
					freezeAlerts,
					quietHoursEnabled,
					badgeEnabled,
					sectionOrder: $state.snapshot(sectionOrder),
					visibleSections: $state.snapshot(visibleSections)
				} satisfies SettingsData)
			);
		} catch {
			/* storage unavailable — keep running in memory */
		}
	}

	function setTheme(nextTheme: Theme): void {
		theme = nextTheme;
		persist();
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

	function setBadgeEnabled(enabled: boolean): void {
		badgeEnabled = enabled;
		persist();
	}

	function setSectionOrder(order: SectionId[]): void {
		sectionOrder = normalizeSectionOrder(order);
		persist();
	}

	function setSectionVisible(id: SectionId, visible: boolean): void {
		if (id === 'hero' || id === 'alerts') return; // locked
		visibleSections[id] = visible;
		persist();
	}

	function moveSection(id: SectionId, direction: 'up' | 'down'): void {
		if (id === 'hero' || id === 'alerts') return; // locked at top

		const current = [...sectionOrder];
		const idx = current.indexOf(id);
		if (idx <= 2 && direction === 'up') return; // cannot move before index 2 (after hero & alerts)
		if (idx === current.length - 1 && direction === 'down') return;
		if (idx === -1) return;

		const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
		const temp = current[idx];
		current[idx] = current[targetIdx];
		current[targetIdx] = temp;

		sectionOrder = normalizeSectionOrder(current);
		persist();
	}

	function resetSections(): void {
		sectionOrder = [...DEFAULT_SECTION_ORDER];
		visibleSections = { ...DEFAULT_VISIBLE_SECTIONS };
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
		get badgeEnabled() {
			return badgeEnabled;
		},
		get schemaVersion() {
			return CURRENT_SCHEMA_VERSION;
		},
		get sectionOrder() {
			return sectionOrder;
		},
		get visibleSections() {
			return visibleSections;
		},
		setTheme,
		setLanguage,
		touchLastUpdated,
		setAlertsEnabled,
		setPrecipitationAlerts,
		setSevereAlerts,
		setFreezeAlerts,
		setQuietHoursEnabled,
		setBadgeEnabled,
		setSectionOrder,
		setSectionVisible,
		moveSection,
		resetSections
	};
}

let singleton: SettingsStore | null = null;

export function getSettingsStore(): SettingsStore {
	singleton ??= createSettingsStore();
	return singleton;
}
