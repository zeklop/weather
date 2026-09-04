import type { Env, SubscribeRequestBody, UnsubscribeRequestBody } from '../types';
import { isValidPushEndpoint, isValidPushKeys, hashEndpoint } from '../security/allowlist';
import { checkRateLimit } from '../security/rateLimit';

export async function handleSubscribe(request: Request, env: Env): Promise<Response> {
	const ip = request.headers.get('cf-connecting-ip') || 'unknown';
	if (!checkRateLimit(ip, 15, 60000)) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let body: SubscribeRequestBody;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!body.endpoint || !isValidPushEndpoint(body.endpoint)) {
		return new Response(JSON.stringify({ error: 'Invalid or forbidden push endpoint' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (body.endpoint.length > 2048) {
		return new Response(JSON.stringify({ error: 'Push endpoint too long' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Reject non-finite or out-of-range coordinates before they reach D1
	const lat = Number(body.latitude);
	const lon = Number(body.longitude);
	if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
		return new Response(JSON.stringify({ error: 'Invalid coordinates' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!isValidPushKeys(body.keys)) {
		return new Response(JSON.stringify({ error: 'Invalid push encryption keys' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const endpointHash = await hashEndpoint(body.endpoint);
	const now = Date.now();

	// Sanitize and round coordinates to ~1km (0.01 deg) for privacy
	const roundedLat = Math.round(lat * 100) / 100;
	const roundedLon = Math.round(lon * 100) / 100;
	const cityName = String(body.city_name || 'My Location').slice(0, 80);
	const timezone = String(body.timezone || 'UTC').slice(0, 50);
	const lang = body.language === 'ru' ? 'ru' : 'en';
	const platform = ['ios', 'android', 'desktop'].includes(body.platform || '') ? body.platform! : 'desktop';
	const alertTypes = JSON.stringify({
		rain: body.alert_types?.rain ?? true,
		freeze: body.alert_types?.freeze ?? true,
		severe: body.alert_types?.severe ?? true,
		quietHours: body.alert_types?.quietHours ?? true
	});
	// Per-subscription URL base path so push icon/click URLs resolve on the
	// subscriber's own deployment ("" root or "/weather" GitHub Pages subpath)
	const basePath = body.base_path ?? '';
	if (basePath !== '' && (!/^\/[a-zA-Z0-9._~-]*$/.test(basePath) || basePath.length > 64)) {
		return new Response(JSON.stringify({ error: 'Invalid base path' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	// Cosmetic column: unknown values coerce to the default instead of rejecting
	// the whole subscription (same style as the language coercion above).
	const windUnit = body.wind_unit === 'mph' ? 'mph' : 'ms';

	try {
		await env.DB.prepare(`
			INSERT INTO subscriptions (
				endpoint_hash, endpoint, p256dh, auth, city_name, latitude, longitude,
				timezone, language, platform, alert_types, base_path, wind_unit, created_at, last_seen_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(endpoint_hash) DO UPDATE SET
				city_name = excluded.city_name,
				latitude = excluded.latitude,
				longitude = excluded.longitude,
				timezone = excluded.timezone,
				language = excluded.language,
				platform = excluded.platform,
				alert_types = excluded.alert_types,
				base_path = excluded.base_path,
				wind_unit = excluded.wind_unit,
				last_seen_at = excluded.last_seen_at
		`).bind(
			endpointHash,
			body.endpoint,
			body.keys.p256dh,
			body.keys.auth,
			cityName,
			roundedLat,
			roundedLon,
			timezone,
			lang,
			platform,
			alertTypes,
			basePath,
			windUnit,
			now,
			now
		).run();

		// Record anonymous event
		await env.DB.prepare(`
			INSERT INTO analytics_events (install_id, event_type, platform, city_name, lang, timestamp)
			VALUES (?, 'push_subscribed', ?, ?, ?, ?)
		`).bind('sub_' + endpointHash.slice(0, 16), platform, cityName, lang, now).run();

		return new Response(JSON.stringify({ success: true, endpointHash }), {
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

export async function handleUnsubscribe(request: Request, env: Env): Promise<Response> {
	const ip = request.headers.get('cf-connecting-ip') || 'unknown';
	if (!checkRateLimit(ip, 15, 60000)) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let body: UnsubscribeRequestBody;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!body.endpoint) {
		return new Response(JSON.stringify({ error: 'Endpoint required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const endpointHash = await hashEndpoint(body.endpoint);
	try {
		await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint_hash = ?').bind(endpointHash).run();

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
