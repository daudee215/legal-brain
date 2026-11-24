/**
 * App lock: a PIN that guards this one device. Nothing here is synced; the record lives in this
 * browser's localStorage under `lb.lock`. The PIN itself is never stored, only a PBKDF2-SHA256 hash
 * with a random salt. Wrong tries are counted and persisted so a reload does not reset the delay.
 */

export const LOCK_KEY = 'lb.lock';
export const LOCK_CHANGE_EVENT = 'lb:lock-change';
export const LOCK_NOW_EVENT = 'lb:lock-now';

export const PIN_MIN = 4;
export const PIN_MAX = 6;
export const PBKDF2_ITERATIONS = 150_000;
export const AUTO_LOCK_CHOICES = [0, 1, 5, 15] as const;
export type AutoLockMinutes = (typeof AUTO_LOCK_CHOICES)[number];
const DEFAULT_AUTO: AutoLockMinutes = 5;

interface LockRecord {
  v: 1;
  salt: string;
  hash: string;
  iter: number;
  /** How many digits the PIN has, so the unlock screen can show the right number of dots. */
  len: number;
  auto: number;
  /** Wrong tries since the last right one. */
  fails: number;
  /** Epoch ms before which no try is accepted (0 = not waiting). */
  until: number;
}

export type VerifyResult = { ok: true } | { ok: false; throttled: boolean; waitMs: number };

// ---- crypto (injectable so tests can run anywhere) -------------------------------------------

let cryptoOverride: Crypto | null = null;
/** Tests: supply a WebCrypto implementation (e.g. node:crypto webcrypto). Pass null to go back to the default. */
export function setCryptoProvider(c: Crypto | null) {
  cryptoOverride = c;
}
function getCrypto(): Crypto {
  const c = cryptoOverride ?? (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new Error('WebCrypto is not available');
  return c;
}

function toHex(b: ArrayBuffer | Uint8Array): string {
  return Array.from(b instanceof Uint8Array ? b : new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
}
function fromHex(s: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const { subtle } = getCrypto();
  const key = await subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toHex(bits);
}

function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---- storage ---------------------------------------------------------------------------------

function read(): LockRecord | null {
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as Partial<LockRecord>;
    if (r.v !== 1 || typeof r.salt !== 'string' || typeof r.hash !== 'string' || typeof r.iter !== 'number') return null;
    return {
      v: 1,
      salt: r.salt,
      hash: r.hash,
      iter: r.iter,
      len: typeof r.len === 'number' && r.len >= PIN_MIN && r.len <= PIN_MAX ? r.len : PIN_MAX,
      auto: typeof r.auto === 'number' && r.auto >= 0 ? r.auto : DEFAULT_AUTO,
      fails: typeof r.fails === 'number' && r.fails > 0 ? Math.floor(r.fails) : 0,
      until: typeof r.until === 'number' ? r.until : 0,
    };
  } catch {
    return null;
  }
}

function write(r: LockRecord): boolean {
  try {
    window.localStorage.setItem(LOCK_KEY, JSON.stringify(r));
    return true;
  } catch {
    return false;
  }
}

function announce() {
  try {
    window.dispatchEvent(new Event(LOCK_CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

// ---- public API ------------------------------------------------------------------------------

export function isValidPin(pin: string): boolean {
  return /^\d+$/.test(pin) && pin.length >= PIN_MIN && pin.length <= PIN_MAX;
}

export function isLockEnabled(): boolean {
  return read() !== null;
}

/** How many digits the saved PIN has (for the dots on the unlock screen). */
export function pinLength(): number {
  return read()?.len ?? PIN_MAX;
}

export function getAutoLockMinutes(): number {
  return read()?.auto ?? DEFAULT_AUTO;
}

export function setAutoLockMinutes(minutes: number): boolean {
  const r = read();
  if (!r) return false;
  const ok = write({ ...r, auto: Math.max(0, Math.floor(minutes)) });
  if (ok) announce();
  return ok;
}

/** Turn the lock on, or replace the PIN. Throws if the PIN is not 4 to 6 digits; returns false if the browser would not save it. */
export async function setPin(pin: string, opts?: { autoLockMinutes?: number }): Promise<boolean> {
  if (!isValidPin(pin)) throw new Error('PIN must be 4 to 6 digits');
  const prev = read();
  const salt = getCrypto().getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
  const ok = write({
    v: 1,
    salt: toHex(salt),
    hash,
    iter: PBKDF2_ITERATIONS,
    len: pin.length,
    auto: opts?.autoLockMinutes ?? prev?.auto ?? DEFAULT_AUTO,
    fails: 0,
    until: 0,
  });
  if (ok) announce();
  return ok;
}

/** Seconds to wait after this many wrong tries in a row: none before 5, then 30 s, doubling every further 5 (capped at an hour). */
export function waitSecondsAfter(fails: number): number {
  if (fails < 5 || fails % 5 !== 0) return 0;
  return Math.min(30 * 2 ** (fails / 5 - 1), 3600);
}

/** Milliseconds left before another try is accepted (0 when free to try). Survives reloads. */
export function lockWaitMs(now: number = Date.now()): number {
  const r = read();
  return r ? Math.max(0, r.until - now) : 0;
}

export async function verifyPin(pin: string, now: number = Date.now()): Promise<VerifyResult> {
  const r = read();
  if (!r) return { ok: false, throttled: false, waitMs: 0 };
  const waiting = r.until - now;
  if (waiting > 0) return { ok: false, throttled: true, waitMs: waiting };
  let good = false;
  if (isValidPin(pin)) {
    try {
      good = sameHex(await derive(pin, fromHex(r.salt), r.iter), r.hash);
    } catch {
      good = false;
    }
  }
  if (good) {
    if (r.fails || r.until) write({ ...r, fails: 0, until: 0 });
    return { ok: true };
  }
  const fails = r.fails + 1;
  const wait = waitSecondsAfter(fails) * 1000;
  write({ ...r, fails, until: wait ? now + wait : 0 });
  return { ok: false, throttled: wait > 0, waitMs: wait };
}

/** Remove the lock from this device entirely. */
export function clearLock() {
  try {
    window.localStorage.removeItem(LOCK_KEY);
  } catch {
    /* ignore */
  }
  announce();
}

/** Ask the mounted <AppLock> to lock right now. */
export function lockNow() {
  try {
    window.dispatchEvent(new Event(LOCK_NOW_EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * Should the app show the unlock screen now?
 * - `hiddenAt` set: the tab/app was in the background since then. With 0 minutes any time away locks;
 *   otherwise it locks once the time away reaches the chosen minutes.
 * - `hiddenAt` null (the app is open): lock after that many minutes with no touch or key press.
 *   With 0 minutes there is no inactivity timer.
 */
export function shouldLock(a: { now: number; lastActiveAt: number | null; hiddenAt: number | null; autoLockMinutes: number }): boolean {
  const limit = Math.max(0, a.autoLockMinutes) * 60_000;
  if (a.hiddenAt !== null) return limit === 0 ? true : a.now - a.hiddenAt >= limit;
  if (limit === 0 || a.lastActiveAt === null) return false;
  return a.now - a.lastActiveAt >= limit;
}
