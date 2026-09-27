import { ensureSignedIn, supabase } from './client';
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
export async function fetchRoom(roomId: string): Promise<{ room: Room | null; players: RoomPlayer[] }> {
  const sb = supabase();
  const [room, players] = await Promise.all([
    sb.from('rooms').select('id, code, host_id, status, settings').eq('id', roomId).maybeSingle(),
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
  return { room: (room.data as Room) ?? null, players: (players.data as RoomPlayer[]) ?? [] };
}
