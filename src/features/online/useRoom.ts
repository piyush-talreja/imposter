import { type RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { ensureSignedIn, supabase } from './client';
import { fetchRoom } from './rooms';
import { type Room, type RoomPlayer } from './types';

export type Connection = 'connecting' | 'online' | 'reconnecting';

export type RoomState = {
  me: string | null;
  room: Room | null;
  players: RoomPlayer[];
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
 *   room:{id}     presence (who's online) + 'room_updated' events → refetch
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
    online: new Set(),
    connection: 'connecting',
    kicked: false,
    gone: false,
  });

  const refresh = useCallback(async () => {
    if (!roomId) return;
    try {
      const { room, players } = await fetchRoom(roomId);
      setState((s) => ({ ...s, room, players, gone: !room || room.status === 'closed' }));
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

  return { ...state, refresh };
}
