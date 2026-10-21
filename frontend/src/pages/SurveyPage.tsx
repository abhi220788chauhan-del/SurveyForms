import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FormError, submitForm } from '../lib/api';
import { FORMS, type FieldSpec } from '../lib/specs';
import EmailVerify from './EmailVerify';

type Values = Record<string, string | string[] | boolean>;

const initial = (fields: FieldSpec[]): Values =>
  Object.fromEntries(fields.map((f) => [f.key, f.type === 'multi' ? [] : f.type === 'checkbox' ? true : '']));

function validateClient(f: FieldSpec, v: Values[string]): string | undefined {
  const text = typeof v === 'string' ? v.trim() : '';
  if (f.required && (f.type === 'multi' ? (v as string[]).length === 0 : text === '')) return 'Required';
  if (!text) return undefined;
  if (f.type === 'phone' && !/^[6-9]\d{9}$/.test(text.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, ''))) return 'Enter a valid 10-digit mobile number';
  if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return 'Enter a valid email';
  if (f.type === 'pincode' && !/^\d{6}$/.test(text)) return 'Enter a 6-digit PIN code';
  return undefined;
}

export default function SurveyPage({ kind }: { kind: keyof typeof FORMS }) {
  const spec = FORMS[kind];
  const fields = spec.sections.flatMap((s) => s.fields);
  const [values, setValues] = useState<Values>(() => initial(fields));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [verified, setVerified] = useState({ email: '', token: '' });

  const set = (key: string, v: Values[string]) => {
    setValues((p) => ({ ...p, [key]: v }));
    setErrors((p) => (p[key] ? { ...p, [key]: '' } : p));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found: Record<string, string> = {};
    for (const f of fields) {
      const msg = validateClient(f, values[f.key]);
      if (msg) found[f.key] = msg;
    }
    const email = (values.email as string).trim().toLowerCase();
    if (!found.email && (!verified.token || verified.email !== email)) found.email = 'Please verify your email with the code we send';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) {
      document.getElementById(`f-${Object.keys(found)[0]}`)?.focus();
      setFormError('Please fix the highlighted fields.');
      return;
    }
    // Honeypot value comes from a hidden input humans never fill.
    const website = (e.currentTarget.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '';
    setBusy(true);
    try {
      await submitForm(kind, { ...values, website, emailToken: verified.token });
      setDone(true);
    } catch (err) {
      if (err instanceof FormError) {
        setErrors(err.fields);
        setFormError(err.message);
      } else setFormError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="panel thanks">
        <div className="thanks-icon" aria-hidden="true">✓</div>
        <h1>Thank you!</h1>
        <p>
          {kind === 'customer'
            ? 'Your feedback will help us bring fresher, fairer vegetables to your doorstep. We will be in touch soon.'
            : 'We have noted your details. Our team will reach out to you about working together.'}
        </p>
        <div className="actions">
          <button type="button" className="btn" disabled>Coming soon</button>
          <Link className="btn btn-ghost" to="/">Back to surveys</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <Link to="/" className="back">← All surveys</Link>
      <h1>{spec.title}</h1>
      {spec.titleHi && <p className="hi lead" lang="hi">{spec.titleHi}</p>}
      <p className="lead">{spec.intro}</p>
      {spec.introHi && <p className="hi lead" lang="hi">{spec.introHi}</p>}

      <form onSubmit={onSubmit} noValidate>
        {spec.sections.map((s, i) => (
          <fieldset key={s.title} className="section">
            <legend><span className="step">{i + 1}</span><span>{s.title}{s.titleHi && <span className="legend-hi" lang="hi"> · {s.titleHi}</span>}</span></legend>
            <div className="grid">
              {s.fields.map((f) =>
                f.type === 'email' ? (
                  <EmailVerify
                    key={f.key}
                    id={`f-${f.key}`}
                    label={f.label}
                    labelHi={f.labelHi}
                    value={values[f.key] as string}
                    error={errors[f.key]}
                    verifiedEmail={verified.email}
                    onChange={(v) => set(f.key, v)}
                    onVerified={(email, token) => {
                      setVerified({ email, token });
                      setErrors((p) => ({ ...p, [f.key]: '' }));
                    }}
                  />
                ) : (
                  <Field key={f.key} f={f} value={values[f.key]} error={errors[f.key]} onChange={(v) => set(f.key, v)} />
                ),
              )}
            </div>
          </fieldset>
        ))}

        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" />

        {formError && <p className="alert" role="alert">{formError}</p>}
        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit survey'}
        </button>
      </form>
    </section>
  );
}

function Field({ f, value, error, onChange }: { f: FieldSpec; value: Values[string]; error?: string; onChange: (v: Values[string]) => void }) {
  const id = `f-${f.key}`;
  const wide = f.type === 'multi' || f.type === 'textarea' || f.type === 'checkbox';
  const label = (
    <label htmlFor={id} className="label">
      {f.label}
      {f.required && <span className="req" aria-hidden="true"> *</span>}
      {f.labelHi && <span className="hi" lang="hi">{f.labelHi}</span>}
    </label>
  );
  const err = error ? <span className="err" id={`${id}-err`}>{error}</span> : null;
  const aria = { 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : undefined };

  let control;
  switch (f.type) {
    case 'select':
      control = (
        <select id={id} value={value as string} onChange={(e) => onChange(e.target.value)} {...aria}>
          <option value="">Select…</option>
          {f.options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
      break;
    case 'multi': {
      const sel = value as string[];
      control = (
        <div className="chips" role="group" aria-labelledby={`${id}-l`}>
          {f.options?.map((o) => (
            <label key={o} className={`chip${sel.includes(o) ? ' on' : ''}`}>
              <input
                type="checkbox"
                checked={sel.includes(o)}
                onChange={() => onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o])}
              />
              {o}
            </label>
          ))}
        </div>
      );
      return (
        <div className={`field ${wide ? 'wide' : ''}`}>
          <span className="label" id={`${id}-l`}>{f.label}{f.required && <span className="req"> *</span>}{f.labelHi && <span className="hi" lang="hi">{f.labelHi}</span>}</span>
          {control}{err}
        </div>
      );
    }
    case 'textarea':
      control = <textarea id={id} rows={4} maxLength={f.max} placeholder={f.placeholder} value={value as string} onChange={(e) => onChange(e.target.value)} {...aria} />;
      break;
    case 'checkbox':
      return (
        <div className="field wide">
          <label className="check">
            <input type="checkbox" checked={value as boolean} onChange={(e) => onChange(e.target.checked)} />
            <span>
              {f.label}
              {f.labelHi && <span className="hi" lang="hi">{f.labelHi}</span>}
            </span>
          </label>
        </div>
      );
    default:
      control = (
        <input
          id={id}
          type={f.type === 'email' ? 'email' : 'text'}
          inputMode={f.type === 'phone' || f.type === 'pincode' ? 'numeric' : undefined}
          autoComplete={f.type === 'phone' ? 'tel' : f.type === 'email' ? 'email' : f.key === 'name' ? 'name' : undefined}
          maxLength={f.type === 'phone' ? 16 : f.type === 'pincode' ? 6 : f.max}
          placeholder={f.placeholder}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          {...aria}
        />
      );
  }
  return (
    <div className={`field ${wide ? 'wide' : ''}`}>
      {label}{control}{err}
    </div>
  );
}
