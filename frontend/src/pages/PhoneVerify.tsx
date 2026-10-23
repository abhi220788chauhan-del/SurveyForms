import { useEffect, useRef, useState } from 'react';
import type { ConfirmationResult } from 'firebase/auth';
import { confirmPhoneCode, phoneErrorMessage, releasePhoneVerifier, sendPhoneCode } from '../lib/firebase';

/** Indian mobile number from "9876543210", "+91 98765 43210", "09876543210". */
export const normalizePhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(d) ? d : '';
};

interface Props {
  id: string;
  label: string;
  labelHi?: string;
  placeholder?: string;
  value: string;
  error?: string;
  /** 10-digit number the current token was issued for (empty when not verified). */
  verifiedPhone: string;
  onChange: (phone: string) => void;
  onVerified: (phone: string, token: string) => void;
}

/** Mobile input with a Firebase "send OTP → enter OTP" verification flow. */
export default function PhoneVerify({ id, label, labelHi, placeholder, value, error, verifiedPhone, onChange, onVerified }: Props) {
  const phone = normalizePhone(value);
  const verified = phone !== '' && phone === verifiedPhone;
  const [sentTo, setSentTo] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const sending = useRef(false);
  useEffect(() => () => releasePhoneVerifier(), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const waiting = confirmation !== null && sentTo === phone && !verified;
  const recaptchaId = `${id}-recaptcha`;

  async function send() {
    if (!phone) return setMsg('Enter a valid 10-digit mobile number first.');
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setMsg('');
    try {
      setConfirmation(await sendPhoneCode(phone, recaptchaId));
      setSentTo(phone);
      setCode('');
      setCooldown(30);
      setMsg(`We sent a 6-digit OTP to +91 ${phone}.`);
    } catch (e) {
      setMsg(phoneErrorMessage(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  async function verify() {
    if (!confirmation) return;
    setBusy(true);
    setMsg('');
    try {
      onVerified(phone, await confirmPhoneCode(confirmation, code));
      setConfirmation(null);
    } catch (e) {
      setMsg(phoneErrorMessage(e));
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
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={16}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        {!verified && (
          <button type="button" className="btn btn-small" onClick={send} disabled={busy || cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : waiting ? 'Resend OTP' : 'Send OTP'}
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
            placeholder="6-digit OTP"
            aria-label="OTP"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button type="button" className="btn btn-small" onClick={verify} disabled={busy || code.length !== 6}>
            Verify
          </button>
        </div>
      )}
      <div id={recaptchaId} />
      {msg && <span className="hint" role="status">{msg}</span>}
      {error && <span className="err" id={`${id}-err`}>{error}</span>}
    </div>
  );
}
