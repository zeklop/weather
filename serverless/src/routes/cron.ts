import type { Env, SubscriptionRecord, WeatherAlertMessage } from '../types';
import { evaluateWeatherConditions, type OpenMeteoForecastResponse } from '../alerts/evaluator';
import { shouldSendAlertToSubscriber } from '../alerts/dedup';
import { encryptWebPushPayload } from '../crypto/webpush';
import { createVapidAuthHeader, importVapidPrivateKey } from '../crypto/vapid';

interface CityCoord {
	latitude: number;
	longitude: number;
	city_name: string;
}

const CITY_BATCH_SIZE = 30;
// ponytail: sequential fan-out below hits the Workers subrequest ceiling
// (~50/invocation on free plan: 30 cities × (1 forecast + N pushes + D1 writes)).
// Trigger to revisit: totalCities > ~20 with active subscribers, or skipped-city
// errors in logs. Upgrade path: batch sends via ctx.waitUntil / queued invocations.

/**
 * Resolves the hourly array index matching the current wall-clock hour in the
 * forecast's local timezone. Open-Meteo with timezone=auto returns local
 * wall-clock timestamps ("YYYY-MM-DDTHH:00"), so index 0 is always midnight.
 */
export function currentHourIndex(hourlyTime: string[], timezone: string, now: number): number {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			hourCycle: 'h23'
		}).formatToParts(new Date(now));
		const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
		const key = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:00`;
		const index = hourlyTime.findIndex((t) => t.startsWith(key));
		return index >= 0 ? index : 0;
	} catch {
		return 0;
	}
}

/**
 * Main Cron Entry point. Called every 30 minutes by Cloudflare Triggers.
 */
export async function handleScheduled(env: Env): Promise<{ citiesEvaluated: number; pushesSent: number }> {
	const now = Date.now();
	let pushesSent = 0;

	// Prepare VAPID keys if configured. A configured-but-invalid private key
	// throws so the cron run fails visibly instead of silently disabling push.
	let vapidPrivateKey: CryptoKey | null = null;
	const publicVapidKey = env.PUBLIC_VAPID_KEY && !env.PUBLIC_VAPID_KEY.includes('PLACEHOLDER') ? env.PUBLIC_VAPID_KEY : '';
	if (env.VAPID_PRIVATE_KEY) {
		vapidPrivateKey = await importVapidPrivateKey(env.VAPID_PRIVATE_KEY);
	}

	// 1. Fetch distinct city coordinates with rotation so every city group is
	// eventually evaluated even when there are more than CITY_BATCH_SIZE groups.
	const totalRow = await env.DB.prepare(
		'SELECT COUNT(*) as count FROM (SELECT 1 FROM subscriptions GROUP BY latitude, longitude)'
	).first<{ count: number }>();
	const totalCities = totalRow?.count || 0;
	if (totalCities === 0) {
		return { citiesEvaluated: 0, pushesSent: 0 };
	}

	const rotation = Math.floor(now / (30 * 60 * 1000));
	const offset = (rotation * CITY_BATCH_SIZE) % totalCities;
	const citiesResult = await env.DB.prepare(`
		SELECT latitude, longitude, MIN(city_name) as city_name
		FROM subscriptions
		GROUP BY latitude, longitude
		ORDER BY latitude, longitude
		LIMIT ? OFFSET ?
	`).bind(CITY_BATCH_SIZE, offset).all<CityCoord>();

	const cities = citiesResult.results || [];
	if (cities.length === 0) {
		return { citiesEvaluated: 0, pushesSent: 0 };
	}

	for (const city of cities) {
		try {
			// 2. Fetch Open-Meteo for this city (1 request per unique city)
			const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&forecast_days=2&timezone=auto`;
			const res = await fetch(forecastUrl, { headers: { 'User-Agent': 'WeatherPWA-CloudflareWorker/1.0' } });
			if (!res.ok) continue;

			const forecast = (await res.json()) as OpenMeteoForecastResponse;

			// 3. Evaluate alerts for the current local hour, not midnight
			const nowIndex = currentHourIndex(forecast.hourly?.time || [], forecast.timezone, now);
			const enAlerts = evaluateWeatherConditions(forecast, 'en', nowIndex);
			const ruAlerts = evaluateWeatherConditions(forecast, 'ru', nowIndex);

			if (enAlerts.length === 0 && ruAlerts.length === 0) {
				continue;
			}

			// 4. Fetch subscribers for this city
			const subsResult = await env.DB.prepare(`
				SELECT * FROM subscriptions
				WHERE latitude = ? AND longitude = ?
			`).bind(city.latitude, city.longitude).all<SubscriptionRecord>();

			const subscribers = subsResult.results || [];
			let cityAlertsSent = 0;

			for (const sub of subscribers) {
				const alertList = sub.language === 'ru' ? ruAlerts : enAlerts;
				if (alertList.length === 0) continue;

				const targetAlert = alertList[0];
				const decision = shouldSendAlertToSubscriber(sub, targetAlert, now);
				if (!decision.send) continue;

				// 5. Send push if VAPID is configured
				if (vapidPrivateKey && publicVapidKey) {
					// Per-subscription base path (set at subscribe time). Legacy rows are
					// backfilled to APP_BASE_PATH by the one-off migration, so no fallback
					// here: '' is a legitimate root-domain path and must be preserved.
					const pushResult = await sendWebPush(sub, targetAlert, publicVapidKey, vapidPrivateKey, sub.base_path ?? '');
					if (pushResult.success) {
						cityAlertsSent++;
						pushesSent++;
						// Update last_alert_sent_at
						await env.DB.prepare('UPDATE subscriptions SET last_alert_sent_at = ? WHERE endpoint_hash = ?')
							.bind(now, sub.endpoint_hash)
							.run();
					} else if (pushResult.statusCode === 410 || pushResult.statusCode === 404) {
						// Subscriber unsubscribed or app deleted -> Self clean + log event
						await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint_hash = ?')
							.bind(sub.endpoint_hash)
							.run();
						await env.DB.prepare(`
							INSERT INTO analytics_events (install_id, event_type, platform, city_name, lang, timestamp)
							VALUES (?, 'push_unsubscribed', ?, ?, ?, ?)
						`).bind('sub_' + sub.endpoint_hash.slice(0, 16), sub.platform, sub.city_name, sub.language, now).run();
					}
				}
			}

			if (cityAlertsSent > 0) {
				// Record history
				const alertType = (enAlerts[0] || ruAlerts[0])?.type || 'weather_alert';
				await env.DB.prepare(`
					INSERT INTO alert_history (city_key, alert_type, recipients_count, timestamp)
					VALUES (?, ?, ?, ?)
				`).bind(city.city_name, alertType, cityAlertsSent, now).run();
			}
		} catch (err) {
			console.error(`Error processing city ${city.city_name}:`, err);
		}
	}

	// 6. Retention cleanup: prune analytics older than 90 days and alert
	// history older than 30 days (alert_history is scanned by /api/stats/summary).
	const ninetyDaysAgo = now - 90 * 24 * 3600 * 1000;
	const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
	try {
		await env.DB.prepare('DELETE FROM analytics_events WHERE timestamp < ?').bind(ninetyDaysAgo).run();
		await env.DB.prepare('DELETE FROM alert_history WHERE timestamp < ?').bind(thirtyDaysAgo).run();
	} catch {
		// ignore
	}

	return { citiesEvaluated: cities.length, pushesSent };
}

/**
 * Dispatches an encrypted RFC 8291 Web Push message to the push gateway.
 */
export async function sendWebPush(
	sub: SubscriptionRecord,
	alert: WeatherAlertMessage,
	publicVapidKey: string,
	privateKey: CryptoKey,
	basePath = ''
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
	try {
		const payloadJSON = JSON.stringify({
			title: alert.title,
			body: alert.message,
			icon: `${basePath}/icons/app/icon-192.png`,
			badge: `${basePath}/icons/app/icon-192.png`,
			tag: alert.type,
			data: {
				url: `${basePath}/`,
				alertId: alert.id,
				timestamp: Date.now()
			}
		});

		const encrypted = await encryptWebPushPayload(payloadJSON, sub.p256dh, sub.auth);
		const vapidHeader = await createVapidAuthHeader(sub.endpoint, publicVapidKey, privateKey);

		const headers: Record<string, string> = {
			'Content-Type': 'application/octet-stream',
			'Content-Encoding': encrypted.contentEncoding,
			Authorization: vapidHeader.authorization,
			TTL: '7200', // 2 hours
			Urgency: alert.severity === 'severe' ? 'high' : 'normal'
		};

		// Apple APNs specific headers
		if (sub.endpoint.includes('push.apple.com')) {
			headers['apns-push-type'] = 'alert';
			headers['apns-priority'] = alert.severity === 'severe' ? '10' : '5';
			headers['apns-expiration'] = String(Math.floor(Date.now() / 1000) + 7200);
		}

		const response = await fetch(sub.endpoint, {
			method: 'POST',
			headers,
			body: encrypted.body
		});

		if (response.status === 201 || response.status === 200 || response.status === 202) {
			return { success: true, statusCode: response.status };
		}

		return { success: false, statusCode: response.status, error: await response.text() };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return { success: false, error: message };
	}
}
