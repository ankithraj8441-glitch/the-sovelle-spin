// Edge Web Crypto authentication helpers for Cloudflare Pages Functions
// Runs 100% natively on Cloudflare Workers / Pages V8 edge runtime without Node.js dependencies

const DEFAULT_SECRET = 'sovelle-spin-edge-secret-production-key-2026';

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBuffer(str) {
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

function textToBase64Url(str) {
  return bufferToBase64Url(new TextEncoder().encode(str));
}

function base64UrlToText(str) {
  return new TextDecoder().decode(base64UrlToBuffer(str));
}

/**
 * Hash password with PBKDF2 (SHA-256, 100,000 iterations) using Web Crypto API.
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return `${toHex(salt)}:${toHex(derivedBits)}`;
}

/**
 * Verify password against stored salt:hash string.
 * Also supports plain password match fallback for initial seed or legacy scrypt.
 */
export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  // Support direct match if plain password was seeded
  if (storedHash === password) return true;

  if (storedHash.includes(':')) {
    const [saltHex, keyHex] = storedHash.split(':');
    const salt = fromHex(saltHex);
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const derivedHex = toHex(derivedBits);
    return derivedHex === keyHex;
  }

  return false;
}

/**
 * Sign an HMAC-SHA256 session token for customer or admin.
 */
export async function signToken(payload, secret = DEFAULT_SECRET, ttlSeconds = 60 * 60 * 24 * 7) {
  const data = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = textToBase64Url(JSON.stringify(data));
  const enc = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || DEFAULT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(encodedPayload));
  const encodedSig = bufferToBase64Url(signature);

  return `${encodedPayload}.${encodedSig}`;
}

/**
 * Verify and decode an HMAC-SHA256 signed token.
 */
export async function verifyToken(token, secret = DEFAULT_SECRET) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encodedPayload, encodedSig] = token.split('.');
  if (!encodedPayload || !encodedSig) return null;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret || DEFAULT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = base64UrlToBuffer(encodedSig);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(encodedPayload)
    );

    if (!valid) return null;

    const parsed = JSON.parse(base64UrlToText(encodedPayload));
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Parse Cookie header string into key-value map.
 */
export function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

/**
 * Format Set-Cookie header.
 */
export function serializeCookie(name, val, maxAgeSeconds = 60 * 60 * 24 * 7) {
  return `${name}=${encodeURIComponent(val)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax; Secure`;
}
