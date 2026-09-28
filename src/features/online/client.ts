import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Online play (Phase 2). Everything security-sensitive is enforced by the server
// (RLS, RPCs, the game-action Edge Function); this key is public by design.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** True when this build has a backend configured (offline play works either way). */
export const onlineConfigured = () => Boolean(url && key);

export function supabase(): SupabaseClient {
  if (!url || !key)
    throw new Error('Online play is not configured: set EXPO_PUBLIC_SUPABASE_URL and _ANON_KEY');
  client ??= createClient(url, key, {
    auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

let verified: Promise<string> | null = null;

/**
 * Sign in anonymously the first time someone goes online, then reuse the same
 * identity (kept on the device), so rejoining a room is the same player.
 *
 * A saved session can outlive its user (the account was removed, or the backend
 * was reset). Its token still looks valid, so check it with the server once per
 * app run, and start a fresh anonymous session if the user no longer exists.
 */
export function ensureSignedIn(): Promise<string> {
  verified ??= (async () => {
    const sb = supabase();
    const { data } = await sb.auth.getSession();
    if (data.session) {
      const { data: user, error } = await sb.auth.getUser();
      if (!error && user.user) return user.user.id;
      // Only a definite "this user is gone" resets the session; being offline doesn't.
      if (error && !isAuthGone(error)) throw error;
      await sb.auth.signOut({ scope: 'local' });
    }
    const { data: signedIn, error } = await sb.auth.signInAnonymously();
    if (error || !signedIn.user) throw error ?? new Error('Anonymous sign-in failed');
    return signedIn.user.id;
  })().catch((e) => {
    verified = null; // let the next call try again
    throw e;
  });
  return verified;
}

/** Can we reach the game server right now? (Signs in if needed, then pings the referee.) */
export async function checkServer(): Promise<boolean> {
  try {
    await ensureSignedIn();
    const { data, error } = await supabase().functions.invoke('game-action', { body: { action: 'ping' } });
    return !error && data?.ok === true;
  } catch {
    return false;
  }
}

const isAuthGone = (e: { status?: number; message?: string }) =>
  e.status === 401 ||
  e.status === 403 ||
  /does not exist|not found|invalid (jwt|token)|session/i.test(e.message ?? '');
