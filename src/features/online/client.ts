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

/**
 * Sign in anonymously the first time someone goes online, then reuse the same
 * identity (kept on the device), so rejoining a room is the same player.
 */
export async function ensureSignedIn(): Promise<string> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signedIn, error } = await sb.auth.signInAnonymously();
  if (error || !signedIn.user) throw error ?? new Error('Anonymous sign-in failed');
  return signedIn.user.id;
}
