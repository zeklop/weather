import { describe, expect, it, vi } from 'vitest';
import {
	PWA_DISMISS_STORAGE_KEY,
	SEVEN_DAYS_MS,
	isStandalone,
	isIosSafari,
	isInstallDismissed,
	dismissInstall
} from '../pwa/install';
import { memoryStorage } from '../stores/memoryStorage';
import { t, translations } from '../i18n';

describe('PWA install utilities', () => {
	describe('isStandalone', () => {
		it('returns false when window or navigator are undefined/null', () => {
			expect(isStandalone(null, null)).toBe(false);
			expect(isStandalone(undefined, undefined)).toBe(false);
		});

		it('returns true when display-mode: standalone matches', () => {
			const mockWindow = {
				matchMedia: (query: string) => ({
					matches: query === '(display-mode: standalone)'
				})
			} as unknown as Window;

			expect(isStandalone(mockWindow, null)).toBe(true);
		});

		it('returns true when navigator.standalone is true', () => {
			const mockWindow = {
				matchMedia: () => ({ matches: false })
			} as unknown as Window;
			const mockNavigator = {
				standalone: true
			} as unknown as Navigator;

			expect(isStandalone(mockWindow, mockNavigator)).toBe(true);
		});

		it('returns false when neither standalone condition is met', () => {
			const mockWindow = {
				matchMedia: () => ({ matches: false })
			} as unknown as Window;
			const mockNavigator = {
				standalone: false
			} as unknown as Navigator;

			expect(isStandalone(mockWindow, mockNavigator)).toBe(false);
		});
	});

	describe('isIosSafari', () => {
		it('returns true for iOS Safari user agents in non-standalone mode', () => {
			const iPhoneNavigator = {
				userAgent:
					'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
				standalone: false
			} as unknown as Navigator;
			const mockWindow = {
				matchMedia: () => ({ matches: false })
			} as unknown as Window;

			expect(isIosSafari(mockWindow, iPhoneNavigator)).toBe(true);
		});

		it('returns true for iPad user agent in non-standalone mode', () => {
			const iPadNavigator = {
				userAgent:
					'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
				standalone: false
			} as unknown as Navigator;
			const mockWindow = {
				matchMedia: () => ({ matches: false })
			} as unknown as Window;

			expect(isIosSafari(mockWindow, iPadNavigator)).toBe(true);
		});

		it('returns false when app is in standalone mode on iOS', () => {
			const iPhoneNavigator = {
				userAgent:
					'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
				standalone: true
			} as unknown as Navigator;
			const mockWindow = {
				matchMedia: () => ({ matches: true })
			} as unknown as Window;

			expect(isIosSafari(mockWindow, iPhoneNavigator)).toBe(false);
		});

		it('returns false for Android user agent', () => {
			const androidNavigator = {
				userAgent:
					'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
				standalone: false
			} as unknown as Navigator;
			const mockWindow = {
				matchMedia: () => ({ matches: false })
			} as unknown as Window;

			expect(isIosSafari(mockWindow, androidNavigator)).toBe(false);
		});

		it('returns false when window.MSStream is defined', () => {
			const iPhoneNavigator = {
				userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
				standalone: false
			} as unknown as Navigator;
			const mockWindow = {
				matchMedia: () => ({ matches: false }),
				MSStream: {}
			} as unknown as Window;

			expect(isIosSafari(mockWindow, iPhoneNavigator)).toBe(false);
		});
	});

	describe('isInstallDismissed and dismissInstall', () => {
		it('returns false if localStorage is empty', () => {
			const storage = memoryStorage();
			expect(isInstallDismissed(storage, 1000000)).toBe(false);
		});

		it('returns false if localStorage is null/unavailable', () => {
			expect(isInstallDismissed(null, 1000000)).toBe(false);
		});

		it('persists dismissed timestamp for 7 days by default', () => {
			const storage = memoryStorage();
			const now = 1700000000000;
			dismissInstall(storage, now);

			const stored = storage.getItem(PWA_DISMISS_STORAGE_KEY);
			expect(stored).toBe(String(now + SEVEN_DAYS_MS));
			expect(isInstallDismissed(storage, now + 1000)).toBe(true);
			expect(isInstallDismissed(storage, now + SEVEN_DAYS_MS - 1000)).toBe(true);
			expect(isInstallDismissed(storage, now + SEVEN_DAYS_MS + 1000)).toBe(false);
		});

		it('returns false if stored value is invalid / corrupted', () => {
			const storage = memoryStorage({
				[PWA_DISMISS_STORAGE_KEY]: 'not-a-number'
			});
			expect(isInstallDismissed(storage, 1700000000000)).toBe(false);
		});
	});

	describe('PWA i18n translation coverage for Phase 2.4', () => {
		it('contains required Android & iOS banner strings in English', () => {
			expect(t('pwa.bannerAndroidText', 'en')).toBe(
				'Install Gradus for quick access and offline mode'
			);
			expect(t('pwa.bannerIosText', 'en')).toBe(
				'Add Gradus to your Home Screen for the best experience'
			);
			expect(t('pwa.installBtn', 'en')).toBe('Install');
			expect(t('pwa.bannerIosAction', 'en')).toBe('How to install');
			expect(t('pwa.bannerDismiss', 'en')).toBe('Dismiss');
		});

		it('contains required Android & iOS banner strings in Russian', () => {
			expect(t('pwa.bannerAndroidText', 'ru')).toBe(
				'Установите приложение Градус для быстрого доступа и оффлайн-режима'
			);
			expect(t('pwa.bannerIosText', 'ru')).toBe(
				'Установите на экран «Домой» для удобной работы'
			);
			expect(t('pwa.installBtn', 'ru')).toBe('Установить');
			expect(t('pwa.bannerIosAction', 'ru')).toBe('Как установить');
			expect(t('pwa.bannerDismiss', 'ru')).toBe('Закрыть');
		});

		it('contains required iOS modal instruction steps in English and Russian', () => {
			expect(t('pwa.modalStep1', 'en')).toBe('Tap the Share button in Safari');
			expect(t('pwa.modalStep2', 'en')).toBe('Scroll and select "Add to Home Screen"');
			expect(t('pwa.modalStep3', 'en')).toBe('Tap "Add" in the top-right corner');
			expect(t('pwa.modalClose', 'en')).toBe('Got it');

			expect(t('pwa.modalStep1', 'ru')).toBe('Нажмите кнопку «Поделиться» в Safari');
			expect(t('pwa.modalStep2', 'ru')).toBe('Прокрутите меню и выберите «На экран "Домой"»');
			expect(t('pwa.modalStep3', 'ru')).toBe('Нажмите «Добавить» в правом верхнем углу');
			expect(t('pwa.modalClose', 'ru')).toBe('Понятно');
		});
	});
});
