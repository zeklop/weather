import { describe, it, expect } from 'vitest';
import { isQuietHours, shouldSendAlertToSubscriber } from '../alerts/dedup';
import type { SubscriptionRecord, WeatherAlertMessage } from '../types';

describe('Alert Deduplication & Suppression', () => {
	it('evaluates quiet hours accurately in subscriber timezone', () => {
		// 2026-08-21 03:00 UTC = 06:00 in Moscow (Europe/Moscow is UTC+3) -> Quiet hours (< 8am)
		const timestampNightInMoscow = Date.UTC(2026, 7, 21, 3, 0);
		expect(isQuietHours('Europe/Moscow', timestampNightInMoscow)).toBe(true);

		// 2026-08-21 11:00 UTC = 14:00 in Moscow -> Daytime
		const timestampDayInMoscow = Date.UTC(2026, 7, 21, 11, 0);
		expect(isQuietHours('Europe/Moscow', timestampDayInMoscow)).toBe(false);
	});

	it('suppresses push alert when user was active in app in the last 15 minutes', () => {
		const now = Date.now();
		const activeSub: SubscriptionRecord = {
			endpoint_hash: 'hash1',
			endpoint: 'https://web.push.apple.com/sub1',
			p256dh: 'key1',
			auth: 'auth1',
			city_name: 'Moscow',
			latitude: 55.75,
			longitude: 37.61,
			timezone: 'Europe/Moscow',
			language: 'ru',
			platform: 'ios',
			alert_types: JSON.stringify({ rain: true, freeze: true, severe: true, quietHours: true }),
			created_at: now - 3600000,
			last_seen_at: now - 5 * 60 * 1000, // 5 minutes ago (< 15 min)
			last_alert_sent_at: null
		};

		const alert: WeatherAlertMessage = {
			id: 'rain1',
			type: 'precipitation',
			severity: 'info',
			title: 'Дождь',
			message: 'Дождь скоро начнется',
			icon: 'rain'
		};

		const result = shouldSendAlertToSubscriber(activeSub, alert, now);
		expect(result.send).toBe(false);
		expect(result.reason).toBe('app_recently_active');
	});

	it('suppresses alert when subscriber received a push less than 3 hours ago (cooldown)', () => {
		const now = Date.now();
		const cooledDownSub: SubscriptionRecord = {
			endpoint_hash: 'hash2',
			endpoint: 'https://web.push.apple.com/sub2',
			p256dh: 'key2',
			auth: 'auth2',
			city_name: 'Moscow',
			latitude: 55.75,
			longitude: 37.61,
			timezone: 'Europe/Moscow',
			language: 'ru',
			platform: 'ios',
			alert_types: JSON.stringify({ rain: true, freeze: true, severe: true, quietHours: false }),
			created_at: now - 86400000,
			last_seen_at: now - 3600000, // 1 hour ago
			last_alert_sent_at: now - 60 * 60 * 1000 // 1 hour ago (< 3h cooldown)
		};

		const alert: WeatherAlertMessage = {
			id: 'rain1',
			type: 'precipitation',
			severity: 'info',
			title: 'Дождь',
			message: 'Дождь скоро начнется',
			icon: 'rain'
		};

		const result = shouldSendAlertToSubscriber(cooledDownSub, alert, now);
		expect(result.send).toBe(false);
		expect(result.reason).toBe('subscriber_cooldown');
	});

	it('allows push when cooldown has passed and app is not recently active', () => {
		const now = Date.now();
		const readySub: SubscriptionRecord = {
			endpoint_hash: 'hash3',
			endpoint: 'https://fcm.googleapis.com/fcm/send/sub3',
			p256dh: 'key3',
			auth: 'auth3',
			city_name: 'Moscow',
			latitude: 55.75,
			longitude: 37.61,
			timezone: 'Europe/Moscow',
			language: 'ru',
			platform: 'android',
			alert_types: JSON.stringify({ rain: true, freeze: true, severe: true, quietHours: false }),
			created_at: now - 86400000,
			last_seen_at: now - 3600000,
			last_alert_sent_at: now - 4 * 3600 * 1000 // 4 hours ago (> 3h cooldown)
		};

		const alert: WeatherAlertMessage = {
			id: 'rain1',
			type: 'precipitation',
			severity: 'info',
			title: 'Дождь',
			message: 'Дождь скоро начнется',
			icon: 'rain'
		};

		const result = shouldSendAlertToSubscriber(readySub, alert, now);
		expect(result.send).toBe(true);
	});
});
