import { DEFAULT_SETTINGS, type Settings } from '@/features/game/engine';
import { type ClueMode } from '@/features/game/online';

export type { ClueMode };

/** Room settings: the pass-and-play settings plus how an online round is run. */
export type OnlineSettings = Settings & {
  clueMode: ClueMode;
  /** Seconds per clue, or null for no timer. */
  clueSeconds: number | null;
  /** Seconds to vote, or null for no timer. */
  voteSeconds: number | null;
};

export const DEFAULT_ONLINE_SETTINGS: OnlineSettings = {
  ...DEFAULT_SETTINGS,
  clueMode: 'typed',
  clueSeconds: null,
  voteSeconds: null,
};

export type RoomStatus = 'lobby' | 'playing' | 'closed';

export type Room = {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  settings: OnlineSettings;
  current_game: string | null;
  /** Running totals for this room session: user id → points. */
  scores: Record<string, number>;
};

export type RoomPlayer = {
  user_id: string;
  name: string;
  seat: number;
  waiting: boolean;
};
