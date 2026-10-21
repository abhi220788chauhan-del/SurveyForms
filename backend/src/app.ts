import express, { type NextFunction, type Request, type Response } from 'express';
import { getDb } from './db';
import { FORM_KINDS, SCHEMAS, type FormKind } from './schemas';
import { sendOtp, tokenValidFor, verifyOtp } from './otp';
import { parseForm } from './validate';

const COLLECTIONS: Record<FormKind, string> = {
  customer: 'formCustomerResponses',
  partner: 'formPartnerResponses',
};

function origins(): string[] {
  return `${process.env.FRONTEND_URL ?? ''},${process.env.ALLOWED_ORIGINS ?? ''}`
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function originAllowed(origin: string): boolean {
  if (origins().includes(origin.replace(/\/+$/, ''))) return true;
  if (process.env.NODE_ENV === 'production') return false;
  try {
    return ['localhost', '127.0.0.1'].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function cors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin && originAllowed(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.append('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    }
  } else if (origin && req.method === 'OPTIONS') {
    return res.status(403).end();
  }
  next();
}

/** Browser POSTs must come from an allowed origin (non-browser clients send no Origin). */
function originGuard(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') return next();
  const origin = req.headers.origin;
  if (origin && !originAllowed(origin)) return res.status(403).json({ error: 'Cross-origin request blocked' });
  next();
}

/** Fixed-window limiter per IP (in memory, single instance). */
function limiter(max: number, windowMs = 60_000) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, e] of hits) if (e.resetAt <= now) hits.delete(k);
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const e = hits.get(key);
    if (!e || e.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (++e.count > max) return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
    next();
  };
}
const submitLimit = limiter(10);
const otpLimit = limiter(10);

const app = express();
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(cors);
app.use(express.json({ limit: '50kb' }));
app.use('/api', originGuard);

app.get('/api/health', async (_req, res) => {
  try {
    await getDb().command({ ping: 1 });
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanEmail = (v: unknown) => (typeof v === 'string' && v.length <= 200 && EMAIL_RE.test(v.trim()) ? v.trim().toLowerCase() : null);

app.post('/api/email/send-code', otpLimit, async (req, res) => {
  const email = cleanEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Enter a valid email' });
  try {
    const r = await sendOtp(email);
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    res.json({ ok: true });
  } catch (err) {
    console.error('otp.send', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Could not send the code. Please try again.' });
  }
});

app.post('/api/email/verify-code', otpLimit, async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit code' });
  try {
    const r = await verifyOtp(email, code);
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    res.json({ ok: true, token: r.token });
  } catch (err) {
    console.error('otp.verify', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Could not verify the code. Please try again.' });
  }
});

app.post('/api/forms/:kind', submitLimit, async (req, res) => {
  const kind = req.params.kind as FormKind;
  if (!FORM_KINDS.includes(kind)) return res.status(404).json({ error: 'Unknown form' });

  // Honeypot: bots fill the hidden field. Pretend success, store nothing.
  if (req.body && typeof req.body === 'object' && req.body.website) return res.status(201).json({ ok: true });

  const parsed = parseForm(SCHEMAS[kind], req.body);
  if (!parsed.ok) return res.status(400).json({ error: 'Please check the highlighted fields', fields: parsed.errors });

  try {
    if (!tokenValidFor(req.body.emailToken, parsed.data.email as string)) {
      return res.status(400).json({ error: 'Please verify your email address first', fields: { email: 'Verify your email' } });
    }
    const { insertedId } = await getDb().collection(COLLECTIONS[kind]).insertOne({
      ...parsed.data,
      emailVerified: true,
      source: 'forms',
      createdAt: new Date(),
    });
    res.status(201).json({ ok: true, id: insertedId.toString() });
  } catch (err) {
    console.error('forms.submit', kind, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Could not save your response. Please try again.' });
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const bad = typeof err === 'object' && err !== null && 'status' in err && err.status === 400;
  res.status(bad ? 400 : 500).json({ error: bad ? 'Invalid request' : 'Server error' });
});

export default app;
