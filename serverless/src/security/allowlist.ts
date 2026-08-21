const ALLOWED_PUSH_HOST_PATTERNS = [
	/^([a-z0-9-]+\.)*push\.apple\.com$/i,
	/^fcm\.googleapis\.com$/i,
	/^([a-z0-9-]+\.)*notify\.windows\.com$/i,
	/^([a-z0-9-]+\.)*push\.services\.mozilla\.com$/i
];

/**
 * Validates that the push endpoint URL belongs to an allowed push gateway provider.
 * Prevents SSRF / spam relay attacks.
 */
export function isValidPushEndpoint(urlStr: string): boolean {
	try {
		const parsed = new URL(urlStr);
		if (parsed.protocol !== 'https:') {
			return false;
		}
		const hostname = parsed.hostname;
		return ALLOWED_PUSH_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
	} catch {
		return false;
	}
}

/**
 * Validates Web Push key formats:
 * - p256dh: 65-byte uncompressed P-256 public key (87-88 base64url chars)
 * - auth: 16-byte authentication secret (21-24 base64url chars)
 */
export function isValidPushKeys(keys: { p256dh?: string; auth?: string } | null | undefined): boolean {
	if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
		return false;
	}
	const base64UrlRegex = /^[A-Za-z0-9_-]+$/;

	const p256dhValid = keys.p256dh.length >= 80 && keys.p256dh.length <= 100 && base64UrlRegex.test(keys.p256dh);
	const authValid = keys.auth.length >= 20 && keys.auth.length <= 30 && base64UrlRegex.test(keys.auth);

	return p256dhValid && authValid;
}

/**
 * Calculates SHA-256 hash of endpoint for indexed lookup and privacy.
 */
export async function hashEndpoint(endpoint: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(endpoint);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
