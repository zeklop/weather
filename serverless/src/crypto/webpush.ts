import { base64UrlDecode, base64UrlEncode } from './vapid';

function concatBuffers(...buffers: Uint8Array[]): Uint8Array {
	let totalLength = 0;
	for (const buf of buffers) {
		totalLength += buf.byteLength;
	}
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const buf of buffers) {
		result.set(buf, offset);
		offset += buf.byteLength;
	}
	return result;
}

/**
 * Derives bits using HKDF-SHA256 via Web Crypto.
 */
async function hkdf(
	salt: Uint8Array,
	ikm: Uint8Array,
	info: Uint8Array,
	lengthBits: number
): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey('raw', ikm.buffer as ArrayBuffer, 'HKDF', false, ['deriveBits']);
	const derived = await crypto.subtle.deriveBits(
		{
			name: 'HKDF',
			hash: 'SHA-256',
			salt: salt.buffer as ArrayBuffer,
			info: info.buffer as ArrayBuffer
		},
		key,
		lengthBits
	);
	return new Uint8Array(derived);
}

/**
 * Encrypts a plaintext payload according to RFC 8291 (aes128gcm).
 */
export async function encryptWebPushPayload(
	payload: string | Uint8Array,
	subscriberP256dh: string,
	subscriberAuth: string
): Promise<{ body: Uint8Array; contentEncoding: string }> {
	const textEncoder = new TextEncoder();
	const payloadBytes = typeof payload === 'string' ? textEncoder.encode(payload) : payload;

	// 1. Generate local ephemeral ECDH keypair
	const localKeyPair = (await crypto.subtle.generateKey(
		{ name: 'ECDH', namedCurve: 'P-256' },
		true,
		['deriveBits']
	)) as CryptoKeyPair;

	const localRawPub = new Uint8Array(
		await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
	);

	// 2. Import subscriber's public key (65 bytes uncompressed P-256)
	const subscriberPubBytes = base64UrlDecode(subscriberP256dh);
	const subscriberPubKey = await crypto.subtle.importKey(
		'raw',
		subscriberPubBytes.buffer as ArrayBuffer,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[]
	);

	// 3. Compute ECDH shared secret (32 bytes)
	const sharedSecret = new Uint8Array(
		await crypto.subtle.deriveBits(
			{ name: 'ECDH', public: subscriberPubKey },
			localKeyPair.privateKey,
			256
		)
	);

	// 4. Subscriber auth secret (16 bytes)
	const authSecret = base64UrlDecode(subscriberAuth);

	// 5. 16-byte random salt
	const salt = new Uint8Array(16);
	crypto.getRandomValues(salt);

	// 6. HKDF step 1: Derive PRK / IKM using auth secret
	// info: "WebPush: info\0" || subscriberPub || localPub
	const ikmInfo = concatBuffers(
		textEncoder.encode('WebPush: info\0'),
		subscriberPubBytes,
		localRawPub
	);
	const ikm = await hkdf(authSecret, sharedSecret, ikmInfo, 256);

	// 7. HKDF step 2: Derive CEK (16 bytes) and Nonce (12 bytes)
	const cekInfo = textEncoder.encode('Content-Encoding: aes128gcm\0');
	const nonceInfo = textEncoder.encode('Content-Encoding: nonce\0');

	const cek = await hkdf(salt, ikm, cekInfo, 128);
	const nonce = await hkdf(salt, ikm, nonceInfo, 96);

	// 8. Pad payload: payload + 0x02 delimiter
	const paddedPayload = new Uint8Array(payloadBytes.length + 1);
	paddedPayload.set(payloadBytes, 0);
	paddedPayload[payloadBytes.length] = 0x02; // delimiter

	// 9. Encrypt with AES-128-GCM
	const aesKey = await crypto.subtle.importKey('raw', cek.buffer as ArrayBuffer, 'AES-GCM', false, ['encrypt']);
	const encryptedBuffer = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: nonce.buffer as ArrayBuffer, tagLength: 128 },
		aesKey,
		paddedPayload.buffer as ArrayBuffer
	);
	const ciphertext = new Uint8Array(encryptedBuffer);

	// 10. Assemble RFC 8291 binary header:
	// salt (16 bytes) + rs (4 bytes = 4096 = 0x00 00 10 00) + idlen (1 byte = 65) + localPub (65 bytes) + ciphertext
	const recordSize = 4096;
	const rsBytes = new Uint8Array([
		(recordSize >> 24) & 0xff,
		(recordSize >> 16) & 0xff,
		(recordSize >> 8) & 0xff,
		recordSize & 0xff
	]);
	const idLen = new Uint8Array([localRawPub.length]);

	const fullBody = concatBuffers(salt, rsBytes, idLen, localRawPub, ciphertext);

	return {
		body: fullBody,
		contentEncoding: 'aes128gcm'
	};
}
