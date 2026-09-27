import { type RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { ensureSignedIn, supabase } from './client';
import { fetchRoom, gameAction } from './rooms';
import { type PublicView } from '@/features/game/online';

import { type Room, type RoomPlayer } from './types';

export type Connection = 'connecting' | 'online' | 'reconnecting';

export type RoomState = {
  me: string | null;
  room: Room | null;
  players: RoomPlayer[];
  /** Names of everyone who has been in the room (including players who left). */
  names: Record<string, string>;
  /** The current game's public view (no secrets), when one exists. */
  game: PublicView | null;
  /** Players whose app is open and connected right now (Realtime Presence). */
  online: Set<string>;
  connection: Connection;
  /** The host removed us; the room is no longer readable. */
  kicked: boolean;
  /** The room is gone (closed, or we can't read it any more). */
  gone: boolean;
};

/**
 * Live view of a room. Joins two private channels:
 *   room:{id}     presence (who's online) + 'room_updated' / 'game_updated' events → refetch
 *   player:{uid}  'kicked' (a removed player can't read the room, so it's told directly)
 */
export function useRoom(
  roomId: string | undefined,
  name: string,
): RoomState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<RoomState>({
    me: null,
    room: null,
    players: [],
    game: null,
    names: {},
    online: new Set(),
    connection: 'connecting',
    kicked: false,
    gone: false,
  });

  const refresh = useCallback(async () => {
    if (!roomId) return;
    try {
      const { room, players, names, game } = await fetchRoom(roomId);
      setState((s) => ({ ...s, room, players, names, game, gone: !room || room.status === 'closed' }));
    } catch {
      setState((s) => ({ ...s, connection: 'reconnecting' }));
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    const channels: RealtimeChannel[] = [];

    (async () => {
      const me = await ensureSignedIn();
      if (cancelled) return;
      setState((s) => ({ ...s, me }));
      const sb = supabase();
      await sb.realtime.setAuth();
      await refresh();

      const room = sb.channel(`room:${roomId}`, { config: { private: true, presence: { key: me } } });
      room
        .on('presence', { event: 'sync' }, () => {
          setState((s) => ({ ...s, online: new Set(Object.keys(room.presenceState())) }));
        })
        .on('broadcast', { event: 'room_updated' }, () => {
          refresh();
        })
        .on('broadcast', { event: 'game_updated' }, () => {
          refresh();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setState((s) => ({ ...s, connection: 'online' }));
            room.track({ name });
            // Catch up on anything missed while disconnected.
            refresh();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (!cancelled) setState((s) => ({ ...s, connection: 'reconnecting' }));
          }
        });

      const mine = sb.channel(`player:${me}`, { config: { private: true } });
      mine.on('broadcast', { event: 'kicked' }, ({ payload }) => {
        if (payload?.room_id === roomId) setState((s) => ({ ...s, kicked: true }));
      });
      mine.subscribe();

      channels.push(room, mine);
    })();

    return () => {
      cancelled = true;
      for (const ch of channels) supabase().removeChannel(ch);
    };
  }, [roomId, name, refresh]);

  useHostWatch(roomId, state);

  return { ...state, refresh };
}

const HEARTBEAT_MS = 15_000;
const HOST_GRACE_MS = 45_000;

/**
 * Keep a room hosted. The host's app checks in every 15 s. If the host has been
 * offline for 45 s, the first online player by seat asks to take over; others wait
 * a little longer in case that one is gone too. The server has the final say.
 */
function useHostWatch(roomId: string | undefined, s: RoomState) {
  const isHost = !!s.room && s.room.host_id === s.me;
  const hostOnline = !!s.room && s.online.has(s.room.host_id);
  const open = !!s.room && s.room.status !== 'closed';

  useEffect(() => {
    if (!roomId || !isHost || !open) return;
    const beat = () => gameAction(roomId, { action: 'heartbeat' }).catch(() => {});
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [roomId, isHost, open]);

  const onlineSeats = s.players.filter((p) => s.online.has(p.user_id) && p.user_id !== s.room?.host_id);
  const myRank = onlineSeats.findIndex((p) => p.user_id === s.me);
  useEffect(() => {
    if (!roomId || isHost || hostOnline || !open || myRank < 0 || s.connection !== 'online') return;
    const id = setTimeout(
      () => gameAction(roomId, { action: 'claim-host' }).catch(() => {}),
      HOST_GRACE_MS + myRank * HEARTBEAT_MS,
    );
    return () => clearTimeout(id);
  }, [roomId, isHost, hostOnline, open, myRank, s.connection]);
}
