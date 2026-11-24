import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  LOCK_KEY,
  clearLock,
  getAutoLockMinutes,
  isLockEnabled,
  lockWaitMs,
  pinLength,
  setAutoLockMinutes,
  setCryptoProvider,
  setPin,
  shouldLock,
  verifyPin,
  waitSecondsAfter,
} from '../../src/lib/appLock';

beforeEach(() => {
  setCryptoProvider(webcrypto as unknown as Crypto);
  window.localStorage.clear();
});

describe('app lock PIN', () => {
  it('is off until a PIN is set', () => {
    expect(isLockEnabled()).toBe(false);
  });

  it('accepts the right PIN and rejects a wrong one', async () => {
    expect(await setPin('4829')).toBe(true);
    expect(isLockEnabled()).toBe(true);
    expect(pinLength()).toBe(4);
    expect(await verifyPin('4829')).toEqual({ ok: true });
    const bad = await verifyPin('1111');
    expect(bad.ok).toBe(false);
  });

  it('never stores the PIN, only a salted hash', async () => {
    await setPin('739105');
    const raw = window.localStorage.getItem(LOCK_KEY) ?? '';
    expect(raw).not.toContain('739105');
    const rec = JSON.parse(raw);
    expect(rec.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(rec.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rec.iter).toBeGreaterThanOrEqual(100_000);
  });

  it('uses a fresh salt each time', async () => {
    await setPin('1234');
    const a = JSON.parse(window.localStorage.getItem(LOCK_KEY)!);
    await setPin('1234');
    const b = JSON.parse(window.localStorage.getItem(LOCK_KEY)!);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('refuses PINs that are not 4 to 6 digits', async () => {
    await expect(setPin('123')).rejects.toThrow();
    await expect(setPin('1234567')).rejects.toThrow();
    await expect(setPin('12a4')).rejects.toThrow();
    expect(isLockEnabled()).toBe(false);
  });

  it('keeps the auto-lock time when the PIN is changed', async () => {
    await setPin('1234', { autoLockMinutes: 15 });
    expect(getAutoLockMinutes()).toBe(15);
    setAutoLockMinutes(1);
    await setPin('654321');
    expect(getAutoLockMinutes()).toBe(1);
    expect(pinLength()).toBe(6);
    expect(await verifyPin('654321')).toEqual({ ok: true });
    expect((await verifyPin('1234')).ok).toBe(false);
  });

  it('clearLock removes everything', async () => {
    await setPin('1234');
    clearLock();
    expect(isLockEnabled()).toBe(false);
    expect(window.localStorage.getItem(LOCK_KEY)).toBeNull();
  });
});

describe('throttling', () => {
  it('follows the schedule: 30 s after 5 wrong tries, doubling every further 5', () => {
    expect([1, 2, 3, 4].map(waitSecondsAfter)).toEqual([0, 0, 0, 0]);
    expect(waitSecondsAfter(5)).toBe(30);
    expect([6, 7, 8, 9].map(waitSecondsAfter)).toEqual([0, 0, 0, 0]);
    expect(waitSecondsAfter(10)).toBe(60);
    expect(waitSecondsAfter(15)).toBe(120);
    expect(waitSecondsAfter(20)).toBe(240);
    expect(waitSecondsAfter(500)).toBe(3600);
  });

  it('blocks tries for 30 s after the fifth wrong one, even for the right PIN', async () => {
    await setPin('1234');
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) expect(await verifyPin('0000', t0)).toMatchObject({ ok: false, throttled: false });
    expect(await verifyPin('0000', t0)).toEqual({ ok: false, throttled: true, waitMs: 30_000 });
    expect(await verifyPin('1234', t0 + 10_000)).toEqual({ ok: false, throttled: true, waitMs: 20_000 });
    expect(await verifyPin('1234', t0 + 30_001)).toEqual({ ok: true });
  });

  it('persists the wait (a reload does not reset it)', async () => {
    await setPin('1234');
    const t0 = Date.now();
    for (let i = 0; i < 5; i++) await verifyPin('0000', t0);
    // A "reload" is just reading storage again.
    expect(lockWaitMs(t0 + 1_000)).toBe(29_000);
    expect(lockWaitMs(t0 + 31_000)).toBe(0);
    const rec = JSON.parse(window.localStorage.getItem(LOCK_KEY)!);
    expect(rec.fails).toBe(5);
  });

  it('doubles the wait after the next five wrong tries and resets after a right PIN', async () => {
    await setPin('1234');
    let t = 5_000_000;
    for (let i = 0; i < 5; i++) await verifyPin('0000', t);
    t += 31_000;
    for (let i = 0; i < 4; i++) expect(await verifyPin('0000', t)).toMatchObject({ throttled: false });
    expect(await verifyPin('0000', t)).toEqual({ ok: false, throttled: true, waitMs: 60_000 });
    t += 61_000;
    expect(await verifyPin('1234', t)).toEqual({ ok: true });
    const rec = JSON.parse(window.localStorage.getItem(LOCK_KEY)!);
    expect(rec.fails).toBe(0);
    expect(lockWaitMs(t)).toBe(0);
  });
});

describe('shouldLock', () => {
  const MIN = 60_000;
  it('0 minutes: locks after any time away, never on inactivity', () => {
    expect(shouldLock({ now: 100, lastActiveAt: 0, hiddenAt: 99, autoLockMinutes: 0 })).toBe(true);
    expect(shouldLock({ now: 10 * MIN, lastActiveAt: 0, hiddenAt: null, autoLockMinutes: 0 })).toBe(false);
  });
  it('N minutes: only once away for at least N minutes', () => {
    expect(shouldLock({ now: 4 * MIN, lastActiveAt: 0, hiddenAt: 0, autoLockMinutes: 5 })).toBe(false);
    expect(shouldLock({ now: 5 * MIN, lastActiveAt: 0, hiddenAt: 0, autoLockMinutes: 5 })).toBe(true);
    expect(shouldLock({ now: 20 * MIN, lastActiveAt: 0, hiddenAt: 10 * MIN, autoLockMinutes: 15 })).toBe(false);
    expect(shouldLock({ now: 25 * MIN, lastActiveAt: 0, hiddenAt: 10 * MIN, autoLockMinutes: 15 })).toBe(true);
  });
  it('locks when idle for N minutes while the app is open', () => {
    expect(shouldLock({ now: 59_000, lastActiveAt: 0, hiddenAt: null, autoLockMinutes: 1 })).toBe(false);
    expect(shouldLock({ now: MIN, lastActiveAt: 0, hiddenAt: null, autoLockMinutes: 1 })).toBe(true);
    expect(shouldLock({ now: 10 * MIN, lastActiveAt: null, hiddenAt: null, autoLockMinutes: 1 })).toBe(false);
  });
});
