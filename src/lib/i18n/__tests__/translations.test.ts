import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_LANGUAGE,
	SUPPORTED_LANGUAGES,
	detectBrowserLanguage,
	getTranslations,
	t,
	translations,
	type Language,
	type Translations
} from '../index';

describe('i18n core configuration', () => {
	it('defines supported languages as en and ru', () => {
		expect(SUPPORTED_LANGUAGES).toEqual(['en', 'ru']);
	});

	it('sets default language to English (en)', () => {
		expect(DEFAULT_LANGUAGE).toBe('en');
	});

	it('provides complete translations for both en and ru', () => {
		expect(translations.en).toBeDefined();
		expect(translations.ru).toBeDefined();
	});
});

describe('detectBrowserLanguage', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('maps a Russian browser locale to ru', () => {
		vi.stubGlobal('navigator', { language: 'ru-RU' });
		expect(detectBrowserLanguage()).toBe('ru');
	});

	it('maps an English browser locale to en', () => {
		vi.stubGlobal('navigator', { language: 'en-US' });
		expect(detectBrowserLanguage()).toBe('en');
	});

	it('falls back to en for an unsupported locale', () => {
		vi.stubGlobal('navigator', { language: 'fr-FR' });
		expect(detectBrowserLanguage()).toBe('en');
	});

	it('walks navigator.languages candidates in order', () => {
		vi.stubGlobal('navigator', { language: 'de-DE', languages: ['de-DE', 'ru', 'en'] });
		expect(detectBrowserLanguage()).toBe('ru');

		vi.stubGlobal('navigator', { language: 'de-DE', languages: ['de-DE', 'en-US'] });
		expect(detectBrowserLanguage()).toBe('en');
	});

	it('returns the default language outside the browser', () => {
		vi.stubGlobal('navigator', undefined);
		expect(detectBrowserLanguage()).toBe(DEFAULT_LANGUAGE);
	});
});

describe('translations dictionary parity', () => {
	function getKeys(obj: unknown, prefix = ''): string[] {
		if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
			return [];
		}
		return Object.entries(obj).flatMap(([key, value]) => {
			const nextKey = prefix ? `${prefix}.${key}` : key;
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				return getKeys(value, nextKey);
			}
			return [nextKey];
		});
	}

	it('has identical keys for en and ru dictionaries', () => {
		const enKeys = getKeys(translations.en).sort();
		const ruKeys = getKeys(translations.ru).sort();
		expect(enKeys).toEqual(ruKeys);
	});

	it('has no empty string translations', () => {
		for (const lang of SUPPORTED_LANGUAGES) {
			const dict = translations[lang];
			const keys = getKeys(dict);
			for (const key of keys) {
				const val = t(key, lang);
				expect(val.length, `Empty translation for key ${key} in ${lang}`).toBeGreaterThan(0);
				expect(val).not.toBe(key);
			}
		}
	});

	it('covers all required domains', () => {
		const requiredSections: (keyof Translations)[] = [
			'app',
			'nav',
			'header',
			'home',
			'forecast',
			'favorites',
			'settings',
			'map',
			'search',
			'errorPage',
			'pwa',
			'units',
			'alerts'
		];

		for (const section of requiredSections) {
			expect(translations.en[section]).toBeDefined();
			expect(translations.ru[section]).toBeDefined();
		}
	});
});

describe('t() translation helper', () => {
	it('translates simple dot-notated keys in en by default', () => {
		expect(t('app.title')).toBe('Gradus');
		expect(t('nav.home')).toBe('Home');
		expect(t('nav.forecast')).toBe('Forecast');
		expect(t('nav.favorites')).toBe('Favorites');
		expect(t('nav.settings')).toBe('Settings');
		expect(t('map.title')).toBe('Map');
		expect(t('settings.theme')).toBe('Theme');
		expect(t('settings.themeSystem')).toBe('System');
		expect(t('settings.themeLight')).toBe('Light');
		expect(t('settings.themeDark')).toBe('Dark');
	});

	it('translates simple dot-notated keys in ru when specified', () => {
		expect(t('app.title', 'ru')).toBe('Градус');
		expect(t('nav.home', 'ru')).toBe('Главная');
		expect(t('nav.forecast', 'ru')).toBe('Прогноз');
		expect(t('nav.favorites', 'ru')).toBe('Избранное');
		expect(t('nav.settings', 'ru')).toBe('Настройки');
		expect(t('map.title', 'ru')).toBe('Карта');
		expect(t('settings.theme', 'ru')).toBe('Тема');
		expect(t('settings.themeSystem', 'ru')).toBe('Системная');
		expect(t('settings.themeLight', 'ru')).toBe('Светлая');
		expect(t('settings.themeDark', 'ru')).toBe('Тёмная');
	});

	it('interpolates template parameters', () => {
		expect(t('home.feelsLike', 'en', { temp: '+18°' })).toBe('Feels like +18°');
		expect(t('home.feelsLike', 'ru', { temp: '+18°' })).toBe('Ощущается как +18°');
		expect(t('home.sunrise', 'en', { time: '05:30' })).toBe('Sunrise: 05:30');
		expect(t('home.sunrise', 'ru', { time: '05:30' })).toBe('Восход: 05:30');
	});

	it('interpolates multiple parameters in strings', () => {
		expect(t('home.wind', 'en', { speed: '5.0 m/s', dir: 'NW' })).toBe('Wind 5.0 m/s, NW');
		expect(t('home.wind', 'ru', { speed: '5,0 м/с', dir: 'СЗ' })).toBe('Ветер 5,0 м/с, СЗ');
	});

	it('falls back gracefully on unknown keys', () => {
		expect(t('nonexistent.key', 'en')).toBe('nonexistent.key');
		expect(t('nonexistent.key', 'ru')).toBe('nonexistent.key');
	});
});

describe('getTranslations helper', () => {
	it('returns the translation object for given language', () => {
		expect(getTranslations('en')).toBe(translations.en);
		expect(getTranslations('ru')).toBe(translations.ru);
		expect(getTranslations()).toBe(translations.en);
	});
});
