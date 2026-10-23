import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut, type Auth, type ConfirmationResult } from 'firebase/auth';

// Firebase web config is public by design (it ships in the bundle); access is restricted
// by "Authorized domains" in Firebase Auth and API-key restrictions in Google Cloud.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sahisahi-a19b8.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sahisahi-a19b8',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1027210943350:web:1025f67d708afaed213857',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1027210943350',
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let verifier: RecaptchaVerifier | undefined;
let inFlight: Promise<ConfirmationResult> | undefined;

function getFirebaseAuth(): Auth {
  if (!config.apiKey) throw new Error('Phone verification is not configured (VITE_FIREBASE_API_KEY missing).');
  app ??= initializeApp(config);
  auth ??= getAuth(app);
  auth.languageCode = 'en';
  return auth;
}

/** Sends an SMS code to an Indian 10-digit mobile number. `containerId` hosts the invisible reCAPTCHA. */
export function sendPhoneCode(phone10: string, containerId: string): Promise<ConfirmationResult> {
  // One send at a time: a second call would clear the verifier the first is still using.
  inFlight ??= doSend(phone10, containerId).finally(() => {
    inFlight = undefined;
  });
  return inFlight;
}

async function doSend(phone10: string, containerId: string): Promise<ConfirmationResult> {
  const a = getFirebaseAuth();
  const container = document.getElementById(containerId);
  if (!container) throw new Error('reCAPTCHA container missing');
  // A reCAPTCHA token is single-use and bound to its DOM element (which changes when the
  // user switches forms), so build a fresh verifier in a fresh child element every send.
  resetVerifier();
  const host = document.createElement('div');
  container.replaceChildren(host);
  verifier = new RecaptchaVerifier(a, host, { size: 'invisible' });
  try {
    return await signInWithPhoneNumber(a, `+91${phone10}`, verifier);
  } catch (err) {
    resetVerifier();
    throw err;
  }
}

/** Releases the reCAPTCHA widget (call when the phone field unmounts). */
export function releasePhoneVerifier() {
  if (!inFlight) resetVerifier();
}

function resetVerifier() {
  try {
    verifier?.clear();
  } catch {
    /* already detached */
  }
  verifier = undefined;
}

/** Confirms the SMS code and returns a Firebase ID token proving control of the number. */
export async function confirmPhoneCode(confirmation: ConfirmationResult, code: string): Promise<string> {
  const { user } = await confirmation.confirm(code);
  const token = await user.getIdToken();
  // The form only needs the token; don't keep a persistent session in the browser.
  await signOut(getFirebaseAuth()).catch(() => undefined);
  return token;
}

export function phoneErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';
  console.error('[phone-auth]', code || err);
  switch (code) {
    case 'auth/operation-not-allowed': return 'Phone sign-in is not enabled in Firebase (Authentication → Sign-in method → Phone).';
    case 'auth/billing-not-enabled': return 'Firebase phone OTP needs the Blaze (billing) plan enabled.';
    case 'auth/invalid-app-credential': return `Security check failed for this website${location.hostname ? ` (${location.hostname})` : ''}. Refresh and try again; if it persists the site owner must authorise this domain in Firebase.`;
    case 'auth/missing-phone-number': return 'Enter your mobile number.';
    case 'auth/invalid-phone-number': return 'Enter a valid 10-digit mobile number.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/quota-exceeded': return 'SMS limit reached for now. Please try again later.';
    case 'auth/invalid-verification-code': return 'Incorrect code.';
    case 'auth/code-expired': return 'Code expired. Please request a new one.';
    case 'auth/captcha-check-failed': return 'Security check failed. Please refresh the page and try again.';
    case 'auth/network-request-failed': return 'Network error. Please check your connection.';
    case 'auth/unauthorized-domain': return 'This website is not authorised for phone verification yet.';
    default: return err instanceof Error && err.message.includes('not configured') ? err.message : `Could not verify the number${code ? ` (${code})` : ''}. Please try again.`;
  }
}
