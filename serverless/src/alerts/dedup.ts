import type { SubscriptionRecord, SubscriptionAlertFlags, WeatherAlertMessage } from '../types';

/**
 * Checks if current wall-clock time in subscriber's timezone is during quiet hours (22:00 to 08:00).
 */
export function isQuietHours(timezone: string, nowTimestamp = Date.now()): boolean {
	try {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			hour: 'numeric',
			hour12: false
		});
		const hour = parseInt(formatter.format(new Date(nowTimestamp)), 10);
		return hour >= 22 || hour < 8;
	} catch {
		return false;
	}
}

/**
 * Determines whether a specific alert should be sent to a subscriber.
 */
export function shouldSendAlertToSubscriber(
	sub: SubscriptionRecord,
	alert: WeatherAlertMessage,
	nowTimestamp = Date.now()
): { send: boolean; reason?: string } {
	// 1. App Active Suppression: If user was active within last 15 minutes, in-app alert was shown
	if (sub.last_seen_at && nowTimestamp - sub.last_seen_at < 15 * 60 * 1000) {
		return { send: false, reason: 'app_recently_active' };
	}

	// 2. Cooldown check: No more than 1 push per 3 hours for the same subscriber
	if (sub.last_alert_sent_at && nowTimestamp - sub.last_alert_sent_at < 3 * 3600 * 1000) {
		return { send: false, reason: 'subscriber_cooldown' };
	}

	// 3. User Alert Preferences
	let flags: SubscriptionAlertFlags = { rain: true, freeze: true, severe: true, quietHours: true };
	try {
		flags = { ...flags, ...JSON.parse(sub.alert_types) };
	} catch {
		// fallback to defaults
	}

	if (alert.type === 'precipitation' && !flags.rain) {
		return { send: false, reason: 'rain_alerts_disabled' };
	}
	if (alert.type === 'frost' && !flags.freeze) {
		return { send: false, reason: 'freeze_alerts_disabled' };
	}
	if ((alert.type === 'thunderstorm' || alert.type === 'severe_wind') && !flags.severe) {
		return { send: false, reason: 'severe_alerts_disabled' };
	}

	// 4. Quiet Hours (Severe alerts bypass quiet hours)
	if (flags.quietHours && alert.severity !== 'severe') {
		if (isQuietHours(sub.timezone, nowTimestamp)) {
			return { send: false, reason: 'quiet_hours_active' };
		}
	}

	return { send: true };
}
