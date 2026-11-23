/**
 * Supabase connection. The URL and the anon (public) key are baked in at build time from
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. The anon key is public by design:
 * row-level security in supabase/schema.sql is what protects the data.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const cloudEnabled = Boolean(URL && KEY);
/** Project URL and public key, for the few calls made without the client (upload progress needs XHR). */
export const supabaseUrl = URL;
export const supabaseKey = KEY;

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!cloudEnabled) throw new Error('Cloud sync is not configured');
  if (!client) client = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'lb.auth' } });
  return client;
}

/** Turn Supabase/Postgres errors into sentences a lawyer can act on. */
export function friendlyError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/Invalid login credentials/i.test(m)) return 'Wrong email or password.';
  if (/User already registered/i.test(m)) return 'An account with this email already exists — log in instead.';
  if (/Password should be at least/i.test(m)) return 'Password must be at least 6 characters.';
  if (/Email not confirmed/i.test(m)) return 'Please confirm your email first (check your inbox).';
  if (/invite not found/i.test(m)) return 'This invite link is not valid.';
  if (/invite already used/i.test(m)) return 'This invite link has already been used. Ask for a new one.';
  if (/invite expired/i.test(m)) return 'This invite link has expired. Ask for a new one.';
  if (/different from the old/i.test(m)) return 'Choose a password different from your old one.';
  if (/rate limit/i.test(m)) return 'Too many attempts — please wait a few minutes and try again.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No internet connection. Your work is kept on this device and will sync when you are back online.';
  return m;
}
