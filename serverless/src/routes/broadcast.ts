import type { Env, SubscriptionRecord, BroadcastRequestBody, PushPayload } from '../types';
import { sendWebPush } from './cron';
import { importVapidPrivateKey } from '../crypto/vapid';

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

export interface BroadcastFilters {
	language?: 'all' | 'ru' | 'en';
	latitude?: number;
	longitude?: number;
}

/** Builds the D1 SELECT targeting subscriptions matching the given filters. */
export function buildTargetQuery(filters: BroadcastFilters): { sql: string; binds: unknown[] } {
	const conditions: string[] = [];
	const binds: unknown[] = [];
	if (filters.language === 'ru' || filters.language === 'en') {
		conditions.push('language = ?');
		binds.push(filters.language);
	}
	if (filters.latitude !== undefined && filters.longitude !== undefined) {
		conditions.push('latitude = ? AND longitude = ?');
		binds.push(filters.latitude, filters.longitude);
	}
	const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
	return { sql: `SELECT * FROM subscriptions${where}`, binds };
}

type ValidationResult = { ok: true; value: BroadcastRequestBody } | { ok: false; error: string };

export function validateBroadcastBody(raw: unknown): ValidationResult {
	if (!raw || typeof raw !== 'object') {
		return { ok: false, error: 'JSON object body required' };
	}
	const b = raw as Record<string, unknown>;
	if (typeof b.body !== 'string' || b.body.length === 0) {
		return { ok: false, error: 'Valid non-empty body (max 500 chars) required' };
	}
	if (b.body.length > 500) {
		return { ok: false, error: 'body exceeds 500 characters' };
	}
	if (b.title !== undefined && (typeof b.title !== 'string' || b.title.length > 100)) {
		return { ok: false, error: 'title must be a string of max 100 characters' };
	}
	if (b.language !== undefined && !['all', 'ru', 'en'].includes(b.language as string)) {
		return { ok: false, error: 'language must be one of: all, ru, en' };
	}
	const hasLat = b.latitude !== undefined;
	const hasLon = b.longitude !== undefined;
	if (hasLat !== hasLon) {
		return { ok: false, error: 'latitude and longitude must be provided together' };
	}
	if (hasLat && (!Number.isFinite(b.latitude) || !Number.isFinite(b.longitude))) {
		return { ok: false, error: 'latitude and longitude must be finite numbers' };
	}
	return {
		ok: true,
		value: {
			body: b.body,
			title: b.title as string | undefined,
			language: b.language as BroadcastRequestBody['language'],
			latitude: b.latitude as number | undefined,
			longitude: b.longitude as number | undefined
		}
	};
}

export async function handleBroadcast(request: Request, env: Env): Promise<Response> {
	// Fail closed: without a configured ADMIN_TOKEN secret the endpoint is unusable
	const adminToken = env.ADMIN_TOKEN;
	if (!adminToken) {
		return new Response(JSON.stringify({ error: 'Broadcast endpoint is not configured (ADMIN_TOKEN missing)' }), {
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

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const validated = validateBroadcastBody(raw);
	if (!validated.ok) {
		return new Response(JSON.stringify({ error: validated.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	const requestBody = validated.value;

	// Mirror the cron VAPID configuration check
	const publicVapidKey = env.PUBLIC_VAPID_KEY && !env.PUBLIC_VAPID_KEY.includes('PLACEHOLDER') ? env.PUBLIC_VAPID_KEY : '';
	if (!publicVapidKey || !env.VAPID_PRIVATE_KEY) {
		return new Response(JSON.stringify({ error: 'Push is not configured' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const now = Date.now();
		const { sql, binds } = buildTargetQuery({
			language: requestBody.language,
			latitude: requestBody.latitude,
			longitude: requestBody.longitude
		});
		const subsResult = await env.DB.prepare(sql).bind(...binds).all<SubscriptionRecord>();
		const subscriptions = subsResult.results || [];
		// Per-subscription base path (set at subscribe time), same resolution as cron.
		// ponytail: sequential fan-out hits the Workers subrequest ceiling
		// (~50/invocation on free plan). Trigger to revisit: recipients > ~40.
		// Upgrade path: batch sends via ctx.waitUntil / queued invocations (see cron.ts).
		const vapidPrivateKey = await importVapidPrivateKey(env.VAPID_PRIVATE_KEY);
		const payload: PushPayload = {
			id: `broadcast_${now}`,
			type: 'broadcast',
			severity: 'info',
			title: requestBody.title ?? '',
			message: requestBody.body
		};

		let sent = 0;
		let failed = 0;
		let removed = 0;

		for (const sub of subscriptions) {
			const pushResult = await sendWebPush(sub, payload, publicVapidKey, vapidPrivateKey, sub.base_path ?? '');
			if (pushResult.success) {
				sent++;
			} else if (pushResult.statusCode === 410 || pushResult.statusCode === 404) {
				// Subscriber unsubscribed or app deleted -> Self clean + log event
				await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint_hash = ?')
					.bind(sub.endpoint_hash)
					.run();
				await env.DB.prepare(`
					INSERT INTO analytics_events (install_id, event_type, platform, city_name, lang, timestamp)
					VALUES (?, 'push_unsubscribed', ?, ?, ?, ?)
				`).bind('sub_' + sub.endpoint_hash.slice(0, 16), sub.platform, sub.city_name, sub.language, now).run();
				removed++;
			} else {
				failed++;
			}
		}

		if (sent > 0) {
			// When filtering by coordinates, attribute the broadcast to that city;
			// otherwise it is a global broadcast.
			const cityKey =
				requestBody.latitude !== undefined && requestBody.longitude !== undefined && subscriptions.length > 0
					? subscriptions[0].city_name
					: 'broadcast';
			await env.DB.prepare(`
				INSERT INTO alert_history (city_key, alert_type, recipients_count, timestamp)
				VALUES (?, 'broadcast', ?, ?)
			`).bind(cityKey, sent, now).run();
		}

		return new Response(JSON.stringify({ targeted: subscriptions.length, sent, failed, removed }), {
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
