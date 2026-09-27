import { ensureSignedIn, supabase } from './client';
import { type Card } from '@/features/game/engine';
import { type PublicView } from '@/features/game/online';

import { type OnlineSettings, type Room, type RoomPlayer } from './types';

// Thin wrappers over the room functions (Postgres RPCs). All rules are enforced
// on the server; these just call them and surface errors.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  await ensureSignedIn();
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

type Joined = { room_id: string; code: string };
const first = (rows: Joined[]) => rows[0];

export const createRoom = (name: string, settings: OnlineSettings) =>
  rpc<Joined[]>('create_room', { p_name: name, p_settings: settings }).then(first);

export const joinRoom = (code: string, name: string) =>
  rpc<Joined[]>('join_room', { p_code: code, p_name: name }).then(first);

export const leaveRoom = (roomId: string) => rpc<void>('leave_room', { p_room: roomId });
export const kickPlayer = (roomId: string, userId: string) =>
  rpc<void>('kick_player', { p_room: roomId, p_user: userId });
export const updateSettings = (roomId: string, settings: OnlineSettings) =>
  rpc<void>('update_settings', { p_room: roomId, p_settings: settings });
export const startGame = (roomId: string) => rpc<void>('start_game', { p_room: roomId });

/** Current room and active players (readable only by members, via RLS). */
export async function fetchRoom(
  roomId: string,
): Promise<{ room: Room | null; players: RoomPlayer[]; game: PublicView | null }> {
  const sb = supabase();
  const [room, players] = await Promise.all([
    sb
      .from('rooms')
      .select('id, code, host_id, status, settings, current_game, scores')
      .eq('id', roomId)
      .maybeSingle(),
    sb
      .from('room_players')
      .select('user_id, name, seat, waiting')
      .eq('room_id', roomId)
      .is('left_at', null)
      .eq('kicked', false)
      .order('seat'),
  ]);
  if (room.error) throw room.error;
  if (players.error) throw players.error;
  const current = (room.data as Room | null)?.current_game;
  let game: PublicView | null = null;
  if (current) {
    const g = await sb.from('games').select('public_state').eq('id', current).maybeSingle();
    if (g.error) throw g.error;
    game = (g.data?.public_state as PublicView) ?? null;
  }
  return { room: (room.data as Room) ?? null, players: (players.data as RoomPlayer[]) ?? [], game };
}

// ---------------------------------------------------------------- game actions (Edge Function)

export type GameAction =
  | { action: 'start' | 'seen' | 'skip' | 'open-vote' | 'continue' | 'back-to-lobby' }
  | { action: 'clue'; text: string }
  | { action: 'suspect'; clueBy: string | null }
  | { action: 'vote'; target: string }
  | { action: 'guess'; text: string };

async function invoke<T>(roomId: string, body: Record<string, unknown>): Promise<T> {
  await ensureSignedIn();
  const { data, error } = await supabase().functions.invoke('game-action', { body: { roomId, ...body } });
  if (error) {
    // The function answers with { error: code }; surface the code for friendlyError.
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

export const gameAction = (roomId: string, a: GameAction) => invoke<{ ok: true }>(roomId, a);

/** This player's own card, straight from the server; never broadcast. */
export const fetchMyCard = (roomId: string) =>
  invoke<{ card: Card }>(roomId, { action: 'my-card' }).then((r) => r.card);
