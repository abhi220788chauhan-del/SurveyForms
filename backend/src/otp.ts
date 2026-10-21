import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { getDb } from './db';
import { sendOtpMail } from './mailer';

const OTP_TTL_MS = 10 * 60_000;
const TOKEN_TTL_MS = 30 * 60_000;
const RESEND_COOLDOWN_MS = 30_000;
const MAX_ATTEMPTS = 5;

interface OtpDoc {
  _id: string; // email
  hash: string;
  attempts: number;
  sentAt: Date;
  expiresAt: Date;
}

const devSecret = randomBytes(32).toString('hex');
function secret(): string {
  const s = process.env.FORMS_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('FORMS_SECRET is not configured');
  return devSecret;
}

const hmac = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url');
const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

let indexReady = false;
async function otps() {
  const col = getDb().collection<OtpDoc>('formEmailOtps');
  if (!indexReady) {
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    indexReady = true;
  }
  return col;
}

export type OtpResult = { ok: true } | { ok: false; status: number; error: string };

export async function sendOtp(email: string): Promise<OtpResult> {
  const col = await otps();
  const existing = await col.findOne({ _id: email });
  if (existing && Date.now() - existing.sentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, status: 429, error: 'Please wait a few seconds before requesting another code.' };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();
  await col.replaceOne(
    { _id: email },
    { hash: hmac(`${email}:${code}`), attempts: 0, sentAt: now, expiresAt: new Date(now.getTime() + OTP_TTL_MS) },
    { upsert: true },
  );
  try {
    await sendOtpMail(email, code);
  } catch (err) {
    await col.deleteOne({ _id: email });
    console.error('otp.mail', err instanceof Error ? err.message : err);
    return { ok: false, status: 502, error: 'Could not send the verification email. Please try again.' };
  }
  return { ok: true };
}

/** Checks the code and, on success, returns a signed token proving control of the email. */
export async function verifyOtp(email: string, code: string): Promise<{ ok: true; token: string } | Exclude<OtpResult, { ok: true }>> {
  const col = await otps();
  const doc = await col.findOne({ _id: email });
  if (!doc || doc.expiresAt.getTime() < Date.now()) return { ok: false, status: 400, error: 'Code expired. Please request a new one.' };
  if (doc.attempts >= MAX_ATTEMPTS) return { ok: false, status: 429, error: 'Too many wrong attempts. Please request a new code.' };
  if (!safeEqual(doc.hash, hmac(`${email}:${code}`))) {
    await col.updateOne({ _id: email }, { $inc: { attempts: 1 } });
    return { ok: false, status: 400, error: 'Incorrect code.' };
  }
  await col.deleteOne({ _id: email });
  const payload = Buffer.from(JSON.stringify({ e: email, x: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return { ok: true, token: `${payload}.${hmac(payload)}` };
}

export function tokenValidFor(token: unknown, email: string): boolean {
  if (typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig || !safeEqual(sig, hmac(payload))) return false;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { e: string; x: number };
    return e === email && x > Date.now();
  } catch {
    return false;
  }
}
