import type { Env, PingRequestBody, StatsSummary } from '../types';
import { canPing, checkRateLimit } from '../security/rateLimit';

/** Constant-time string comparison (falls back to strict compare off-Workers). */
function timingSafeEqual(a: string, b: string): boolean {
	const encoder = new TextEncoder();
	const bufA = encoder.encode(a);
	const bufB = encoder.encode(b);
	if (bufA.byteLength !== bufB.byteLength) return false;
	const subtle = crypto.subtle as unknown as { timingSafeEqual?: (a: ArrayBuffer, b: ArrayBuffer) => boolean };
	if (typeof subtle.timingSafeEqual === 'function') {
		return subtle.timingSafeEqual(bufA.buffer as ArrayBuffer, bufB.buffer as ArrayBuffer);
	}
	let diff = 0;
	for (let i = 0; i < bufA.byteLength; i++) {
		diff |= bufA[i] ^ bufB[i];
	}
	return diff === 0;
}

export async function handlePing(request: Request, env: Env): Promise<Response> {
	const ip = request.headers.get('cf-connecting-ip') || 'unknown';
	if (!checkRateLimit(ip, 30, 60000)) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let body: PingRequestBody;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!body.install_id || typeof body.install_id !== 'string') {
		return new Response(JSON.stringify({ error: 'Valid install_id required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Throttle pings to once per 24 hours per install_id
	if (!canPing(body.install_id)) {
		return new Response(JSON.stringify({ success: true, throttled: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const platform = ['ios', 'android', 'desktop'].includes(body.platform) ? body.platform : 'desktop';
	const cityName = String(body.city_name || 'Unknown').slice(0, 80);
	const lang = body.lang === 'ru' ? 'ru' : 'en';
	const now = Date.now();

	try {
		await env.DB.prepare(`
			INSERT INTO analytics_events (install_id, event_type, platform, city_name, lang, timestamp)
			VALUES (?, 'install_open', ?, ?, ?, ?)
		`).bind(body.install_id.slice(0, 64), platform, cityName, lang, now).run();

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return new Response(JSON.stringify({ error: 'Database error', detail: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

export async function handleStatsSummary(request: Request, env: Env): Promise<Response> {
	// Fail closed: without a configured ADMIN_TOKEN secret the endpoint is unusable
	const adminToken = env.ADMIN_TOKEN;
	if (!adminToken) {
		return new Response(JSON.stringify({ error: 'Stats endpoint is not configured (ADMIN_TOKEN missing)' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const authHeader = request.headers.get('Authorization') || '';
	const token = authHeader.replace(/^Bearer\s+/i, '').trim();
	const isAuthorized = token.length > 0 && timingSafeEqual(token, adminToken);

	if (!isAuthorized) {
		return new Response(JSON.stringify({ error: 'Unauthorized. Valid ADMIN_TOKEN required.' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const now = Date.now();
	const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
	const ninetyDaysAgo = now - 90 * 24 * 3600 * 1000;
	const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;

	try {
		// 1. Total subscribers count
		const totalSubscribersRow = await env.DB.prepare(
			'SELECT COUNT(*) as count FROM subscriptions'
		).first<{ count: number }>();
		const totalSubscribers = totalSubscribersRow?.count || 0;

		// 2. Active devices in last 7 days (distinct install_ids)
		const active7DaysRow = await env.DB.prepare(
			'SELECT COUNT(DISTINCT install_id) as count FROM analytics_events WHERE timestamp >= ?'
		).bind(sevenDaysAgo).first<{ count: number }>();
		const activeLast7Days = active7DaysRow?.count || 0;

		// 3. Alerts sent in last 7 days
		const alertsSentRow = await env.DB.prepare(
			'SELECT COALESCE(SUM(recipients_count), 0) as count FROM alert_history WHERE timestamp >= ?'
		).bind(sevenDaysAgo).first<{ count: number }>();
		const alertsSentLast7Days = alertsSentRow?.count || 0;

		// 4. Platform breakdown for subscribers
		const platformRows = await env.DB.prepare(
			'SELECT platform, COUNT(*) as count FROM subscriptions GROUP BY platform'
		).all<{ platform: string; count: number }>();

		const platforms = { ios: 0, android: 0, desktop: 0 };
		if (platformRows.results) {
			for (const r of platformRows.results) {
				if (r.platform === 'ios') platforms.ios = r.count;
				else if (r.platform === 'android') platforms.android = r.count;
				else if (r.platform === 'desktop') platforms.desktop = r.count;
			}
		}

		// 5. Language breakdown for subscribers
		const langRows = await env.DB.prepare(
			'SELECT language, COUNT(*) as count FROM subscriptions GROUP BY language'
		).all<{ language: string; count: number }>();

		const languages = { ru: 0, en: 0 };
		if (langRows.results) {
			for (const r of langRows.results) {
				if (r.language === 'ru') languages.ru = r.count;
				else if (r.language === 'en') languages.en = r.count;
			}
		}

		// 6. Top 10 cities
		const topCitiesRows = await env.DB.prepare(`
			SELECT city_name as cityName, COUNT(*) as subscribers
			FROM subscriptions
			GROUP BY city_name
			ORDER BY subscribers DESC
			LIMIT 10
		`).all<{ cityName: string; subscribers: number }>();

		// 7. Recent alert history
		const recentAlertsRows = await env.DB.prepare(`
			SELECT alert_type as alertType, city_key as cityName, recipients_count as recipientsCount, timestamp
			FROM alert_history
			ORDER BY timestamp DESC
			LIMIT 10
		`).all<{ alertType: string; cityName: string; recipientsCount: number; timestamp: number }>();

		// 7. Daily activity for the last 30 days (opens + alerts per UTC day)
		const opensRows = await env.DB.prepare(`
			SELECT DATE(timestamp / 1000, 'unixepoch') as day, COUNT(*) as count
			FROM analytics_events
			WHERE event_type = 'install_open' AND timestamp >= ?
			GROUP BY day
		`).bind(thirtyDaysAgo).all<{ day: string; count: number }>();

		const alertsPerDayRows = await env.DB.prepare(`
			SELECT DATE(timestamp / 1000, 'unixepoch') as day, COALESCE(SUM(recipients_count), 0) as count
			FROM alert_history
			WHERE timestamp >= ?
			GROUP BY day
		`).bind(thirtyDaysAgo).all<{ day: string; count: number }>();

		const opensByDay = new Map((opensRows.results || []).map((r) => [r.day, r.count]));
		const alertsByDay = new Map((alertsPerDayRows.results || []).map((r) => [r.day, r.count]));
		const dailyActivity: StatsSummary['dailyActivity'] = [];
		for (let i = 29; i >= 0; i--) {
			const key = new Date(now - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
			dailyActivity.push({ day: key, opens: opensByDay.get(key) || 0, alerts: alertsByDay.get(key) || 0 });
		}

		// 8. Push funnel: distinct installs vs push opt-ins
		const totalInstallsRow = await env.DB.prepare(
			'SELECT COUNT(DISTINCT install_id) as count FROM analytics_events'
		).first<{ count: number }>();
		const pushOptInsRow = await env.DB.prepare(
			"SELECT COUNT(DISTINCT install_id) as count FROM analytics_events WHERE event_type = 'push_subscribed'"
		).first<{ count: number }>();
		const funnel = {
			totalInstalls: totalInstallsRow?.count || 0,
			pushOptIns: pushOptInsRow?.count || 0
		};

		// 9. Alert types breakdown
		const alertTypeRows = await env.DB.prepare(`
			SELECT alert_type as alertType, COUNT(*) as count, COALESCE(SUM(recipients_count), 0) as recipients
			FROM alert_history
			GROUP BY alert_type
			ORDER BY count DESC
		`).all<{ alertType: string; count: number; recipients: number }>();

		// 10. Subscription health
		const deadRow = await env.DB.prepare(
			'SELECT COUNT(*) as count FROM subscriptions WHERE last_seen_at < ?'
		).bind(ninetyDaysAgo).first<{ count: number }>();
		const autoRemovedRow = await env.DB.prepare(
			"SELECT COUNT(DISTINCT install_id) as count FROM analytics_events WHERE event_type = 'push_unsubscribed' AND timestamp >= ?"
		).bind(sevenDaysAgo).first<{ count: number }>();
		const neverAlertedRow = await env.DB.prepare(
			'SELECT COUNT(*) as count FROM subscriptions WHERE last_alert_sent_at IS NULL'
		).first<{ count: number }>();
		const health = {
			deadSubscriptions: deadRow?.count || 0,
			autoRemovedLast7Days: autoRemovedRow?.count || 0,
			neverAlerted: neverAlertedRow?.count || 0
		};

		const summary: StatsSummary = {
			totalSubscribers,
			activeLast7Days,
			alertsSentLast7Days,
			platforms,
			languages,
			dailyActivity,
			funnel,
			alertTypes: alertTypeRows.results || [],
			health,
			topCities: topCitiesRows.results || [],
			recentAlerts: recentAlertsRows.results || []
		};

		return new Response(JSON.stringify(summary), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store'
			}
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return new Response(JSON.stringify({ error: 'Database error', detail: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
