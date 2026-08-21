/**
 * Base64URL string / ArrayBuffer conversion utilities.
 */
export function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(str: string): Uint8Array {
	let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
	while (base64.length % 4) {
		base64 += '=';
	}
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

// P-256 curve constants
const P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const A = P - 3n;
const N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const G_X = 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n;
const G_Y = 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n;

type EcPoint = { x: bigint; y: bigint } | null;

function mod(a: bigint, m: bigint): bigint {
	const r = a % m;
	return r >= 0n ? r : r + m;
}

function modInv(a: bigint, m: bigint): bigint {
	let result = 1n;
	let base = mod(a, m);
	let exp = m - 2n;
	while (exp > 0n) {
		if (exp & 1n) result = mod(result * base, m);
		base = mod(base * base, m);
		exp >>= 1n;
	}
	return result;
}

function pointAdd(p: EcPoint, q: EcPoint): EcPoint {
	if (!p) return q;
	if (!q) return p;
	if (p.x === q.x && mod(p.y + q.y, P) === 0n) return null;
	let slope: bigint;
	if (p.x === q.x && p.y === q.y) {
		slope = mod((3n * p.x * p.x + A) * modInv(2n * p.y, P), P);
	} else {
		slope = mod((q.y - p.y) * modInv(q.x - p.x, P), P);
	}
	const x = mod(slope * slope - p.x - q.x, P);
	const y = mod(slope * (p.x - x) - p.y, P);
	return { x, y };
}

/** Derives the P-256 public point (x, y) from a raw private scalar d. */
function derivePublicPoint(d: bigint): EcPoint {
	let result: EcPoint = null;
	let addend: EcPoint = { x: G_X, y: G_Y };
	let n = d;
	while (n > 0n) {
		if (n & 1n) result = pointAdd(result, addend);
		addend = pointAdd(addend, addend);
		n >>= 1n;
	}
	return result;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
	let result = 0n;
	for (const b of bytes) result = (result << 8n) | BigInt(b);
	return result;
}

function bigIntTo32Bytes(value: bigint): Uint8Array {
	const bytes = new Uint8Array(32);
	let v = value;
	for (let i = 31; i >= 0; i--) {
		bytes[i] = Number(v & 0xffn);
		v >>= 8n;
	}
	return bytes;
}

/**
 * Imports a VAPID private key in any common format into a CryptoKey:
 * - raw JWK JSON, or base64url-encoded JWK JSON (must contain d, x, y)
 * - raw 32-byte scalar d (base64url) as produced by `npx web-push generate-vapid-keys`
 *   (x/y public components are derived via P-256 point multiplication)
 * - PKCS#8 DER (base64url)
 */
export async function importVapidPrivateKey(privateKey: string): Promise<CryptoKey> {
	const algorithm = { name: 'ECDSA', namedCurve: 'P-256' };
	const importJwk = (jwk: JsonWebKey) => crypto.subtle.importKey('jwk', jwk, algorithm, false, ['sign']);

	const trimmed = privateKey.trim();

	// Raw JWK JSON
	if (trimmed.startsWith('{')) {
		return importJwk(JSON.parse(trimmed) as JsonWebKey);
	}

	const raw = base64UrlDecode(trimmed);
	const text = new TextDecoder().decode(raw);

	// Base64url-encoded JWK JSON
	if (text.startsWith('{')) {
		return importJwk(JSON.parse(text) as JsonWebKey);
	}

	// Raw 32-byte private scalar d: WebCrypto JWK import requires x/y, so derive them
	if (raw.length === 32) {
		const d = bytesToBigInt(raw);
		if (d <= 0n || d >= N) {
			throw new Error('Invalid VAPID private key: scalar out of range');
		}
		const point = derivePublicPoint(d);
		if (!point) {
			throw new Error('Invalid VAPID private key: public point derivation failed');
		}
		return importJwk({
			kty: 'EC',
			crv: 'P-256',
			d: base64UrlEncode(raw),
			x: base64UrlEncode(bigIntTo32Bytes(point.x)),
			y: base64UrlEncode(bigIntTo32Bytes(point.y)),
			ext: true
		});
	}

	// PKCS#8 DER
	const der = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
	return crypto.subtle.importKey('pkcs8', der, algorithm, false, ['sign']);
}

/**
 * Creates a VAPID Authorization JWT for a given push endpoint.
 */
export async function createVapidAuthHeader(
	endpoint: string,
	publicKeyBase64Url: string,
	privateKey: CryptoKey,
	subject = 'mailto:admin@weather-pwa.app',
	expirationSeconds = 12 * 3600
): Promise<{ authorization: string }> {
	const parsed = new URL(endpoint);
	const audience = `${parsed.protocol}//${parsed.host}`;

	const header = {
		typ: 'JWT',
		alg: 'ES256'
	};

	const now = Math.floor(Date.now() / 1000);
	const payload = {
		aud: audience,
		exp: now + expirationSeconds,
		sub: subject
	};

	const encoder = new TextEncoder();
	const unsignedToken = `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.${base64UrlEncode(
		encoder.encode(JSON.stringify(payload))
	)}`;

	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: { name: 'SHA-256' } },
		privateKey,
		encoder.encode(unsignedToken)
	);

	const jwt = `${unsignedToken}.${base64UrlEncode(signature)}`;
	return {
		authorization: `vapid t=${jwt}, k=${publicKeyBase64Url}`
	};
}
