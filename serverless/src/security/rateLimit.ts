interface RateLimitEntry {
	count: number;
	resetAt: number;
}

// ponytail: counters are per-isolate in-memory — Cloudflare evicts isolates on
// deploys and low load, resetting all windows. This is best-effort abuse
// protection, not a hard guarantee. Trigger to revisit: observed abuse or
// billing alarms. Upgrade path: D1/KV-backed counters keyed by IP/install_id.
const rateLimitMap = new Map<string, RateLimitEntry>();
const pingThrottleMap = new Map<string, number>();

const MAX_MAP_SIZE = 5000;

function cleanupMap<T extends { resetAt?: number }>(map: Map<string, T | number>, now: number) {
	if (map.size > MAX_MAP_SIZE) {
		for (const [key, val] of map.entries()) {
			if (typeof val === 'number') {
				if (val < now) map.delete(key);
			} else if (val && typeof val.resetAt === 'number') {
				if (val.resetAt < now) map.delete(key);
			}
		}
	}
}

/**
 * Checks in-memory sliding window rate limit per IP.
 * @param ip Client IP address
 * @param limit Max allowed requests within window
 * @param windowMs Window in milliseconds (e.g. 60000 = 1 minute)
 */
export function checkRateLimit(ip: string, limit = 15, windowMs = 60000): boolean {
	const now = Date.now();
	cleanupMap(rateLimitMap, now);

	const entry = rateLimitMap.get(ip);
	if (!entry || entry.resetAt < now) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
		return true;
	}

	if (entry.count >= limit) {
		return false;
	}

	entry.count++;
	return true;
}

/**
 * Ensures an install_id can only ping once per 24 hours.
 */
export function canPing(installId: string, minIntervalMs = 24 * 60 * 60 * 1000): boolean {
	const now = Date.now();
	cleanupMap(pingThrottleMap, now);

	const nextAllowed = pingThrottleMap.get(installId);
	if (nextAllowed && nextAllowed > now) {
		return false;
	}

	pingThrottleMap.set(installId, now + minIntervalMs);
	return true;
}
