import { createPublicKey, createVerify, type KeyObject } from 'node:crypto';

/**
 * Verifies Firebase Auth ID tokens (RS256 JWTs) against Google's public keys, per
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 * No service account needed - only the project id.
 */
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_S = 60;

let keys: Map<string, KeyObject> = new Map();
let keysExpireAt = 0;

async function publicKey(kid: string): Promise<KeyObject | undefined> {
  if (Date.now() >= keysExpireAt || !keys.has(kid)) {
    const res = await fetch(JWKS_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Firebase JWKS fetch failed: ${res.status}`);
    const { keys: jwks } = (await res.json()) as { keys: (Record<string, string> & { kid: string })[] };
    keys = new Map(jwks.map((k) => [k.kid, createPublicKey({ key: k, format: 'jwk' })]));
    const maxAge = Number(res.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] ?? 3600);
    keysExpireAt = Date.now() + maxAge * 1000;
  }
  return keys.get(kid);
}

export function firebaseProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID?.trim() || 'sahisahi-a19b8';
}

const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString()) as Record<string, unknown>;

/** Returns the verified E.164 phone number (e.g. "+919876543210") or null if the token is invalid. */
export async function verifiedPhoneFromToken(token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const [h, p, sig] = token.split('.');
  if (!h || !p || !sig) return null;

  let header: Record<string, unknown>, claims: Record<string, unknown>;
  try {
    header = decode(h);
    claims = decode(p);
  } catch {
    return null;
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;

  const key = await publicKey(header.kid);
  if (!key) return null;
  const ok = createVerify('RSA-SHA256').update(`${h}.${p}`).verify(key, Buffer.from(sig, 'base64url'));
  if (!ok) return null;

  const project = firebaseProjectId();
  const now = Math.floor(Date.now() / 1000);
  const num = (v: unknown) => (typeof v === 'number' ? v : NaN);
  if (claims.aud !== project || claims.iss !== `https://securetoken.google.com/${project}`) return null;
  if (!(num(claims.exp) > now - CLOCK_SKEW_S) || !(num(claims.iat) <= now + CLOCK_SKEW_S)) return null;
  if (!(num(claims.auth_time) <= now + CLOCK_SKEW_S)) return null;
  if (typeof claims.sub !== 'string' || !claims.sub) return null;

  return typeof claims.phone_number === 'string' ? claims.phone_number : null;
}
