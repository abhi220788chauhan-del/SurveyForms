import { useEffect, useState } from 'react';
import { FormError, sendEmailCode, verifyEmailCode } from '../lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  id: string;
  label: string;
  labelHi?: string;
  value: string;
  error?: string;
  /** Email the current token was issued for (empty when not verified). */
  verifiedEmail: string;
  onChange: (email: string) => void;
  onVerified: (email: string, token: string) => void;
}

/** Email input with a "send code → enter code" verification flow. */
export default function EmailVerify({ id, label, labelHi, value, error, verifiedEmail, onChange, onVerified }: Props) {
  const email = value.trim().toLowerCase();
  const verified = email !== '' && email === verifiedEmail;
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const waiting = sentTo !== '' && sentTo === email && !verified;

  async function send() {
    if (!EMAIL_RE.test(email)) return setMsg('Enter a valid email first.');
    setBusy(true);
    setMsg('');
    try {
      await sendEmailCode(email);
      setSentTo(email);
      setCode('');
      setCooldown(30);
      setMsg(`We sent a 6-digit code to ${email}.`);
    } catch (e) {
      setMsg(e instanceof FormError ? e.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setMsg('');
    try {
      const { token } = await verifyEmailCode(email, code);
      onVerified(email, token);
      setMsg('');
    } catch (e) {
      setMsg(e instanceof FormError ? e.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field wide">
      <label htmlFor={id} className="label">
        {label}<span className="req" aria-hidden="true"> *</span>
        {labelHi && <span className="hi" lang="hi">{labelHi}</span>}
        {verified && <span className="badge-ok">✓ Verified</span>}
      </label>
      <div className="inline">
        <input
          id={id}
          type="email"
          autoComplete="email"
          maxLength={200}
          placeholder="you@example.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        {!verified && (
          <button type="button" className="btn btn-small" onClick={send} disabled={busy || cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : waiting ? 'Resend code' : 'Send code'}
          </button>
        )}
      </div>
      {waiting && (
        <div className="inline">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            aria-label="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button type="button" className="btn btn-small" onClick={verify} disabled={busy || code.length !== 6}>
            Verify
          </button>
        </div>
      )}
      {msg && <span className="hint" role="status">{msg}</span>}
      {error && <span className="err" id={`${id}-err`}>{error}</span>}
    </div>
  );
}
