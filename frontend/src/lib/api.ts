const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export const MAIN_SITE = import.meta.env.VITE_MAIN_SITE_URL || 'https://sahisahi.com';

export class FormError extends Error {
  constructor(message: string, readonly fields: Record<string, string> = {}) {
    super(message);
  }
}

async function post<T>(path: string, payload: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new FormError('Network error. Please check your connection and try again.');
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string; fields?: Record<string, string> };
  if (!res.ok) throw new FormError(body.error ?? 'Something went wrong. Please try again.', body.fields);
  return body;
}

export const submitForm = (kind: string, values: Record<string, unknown>) => post<unknown>(`/api/forms/${kind}`, values);
