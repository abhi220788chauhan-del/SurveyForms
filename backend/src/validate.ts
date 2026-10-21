import type { Field } from './schemas';

export type Parsed = { ok: true; data: Record<string, unknown> } | { ok: false; errors: Record<string, string> };

const isStr = (v: unknown): v is string => typeof v === 'string';

/** Indian mobile number from "9876543210", "+91 98765 43210", "09876543210". */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Validates untrusted input against a form schema. Only declared keys are copied. */
export function parseForm(fields: readonly Field[], body: unknown): Parsed {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const f of fields) {
    const v = input[f.key];
    const text = isStr(v) ? v.trim() : '';

    if (f.type === 'checkbox') {
      data[f.key] = v === true;
      continue;
    }
    const missing = f.type === 'multi' ? !Array.isArray(v) || v.length === 0 : text === '';
    if (missing) {
      if (f.required) errors[f.key] = 'Required';
      else data[f.key] = f.type === 'multi' ? [] : null;
      continue;
    }

    switch (f.type) {
      case 'phone': {
        const p = normalizePhone(text);
        if (p) data[f.key] = p;
        else errors[f.key] = 'Enter a valid 10-digit mobile number';
        break;
      }
      case 'email':
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) && text.length <= (f.max ?? 200)) data[f.key] = text.toLowerCase();
        else errors[f.key] = 'Enter a valid email';
        break;
      case 'pincode':
        if (/^\d{6}$/.test(text)) data[f.key] = text;
        else errors[f.key] = 'Enter a 6-digit PIN code';
        break;
      case 'select':
        if (f.options?.includes(text)) data[f.key] = text;
        else errors[f.key] = 'Invalid choice';
        break;
      case 'multi': {
        const arr = v as unknown[];
        const items = arr.filter(isStr);
        if (items.length === arr.length && items.every((i) => f.options?.includes(i))) data[f.key] = [...new Set(items)];
        else errors[f.key] = 'Invalid choice';
        break;
      }
      default:
        data[f.key] = text.slice(0, f.max ?? 1000);
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
