// The room functions raise stable codes (see supabase/migrations/*_room_functions.sql);
// map them to plain-language messages that suggest what to do next.
const MESSAGES: Record<string, string> = {
  room_not_found: 'No room with that code. Check the letters and try again.',
  room_closed: 'This room has closed. Ask the host for a new code.',
  room_full: 'This room is full (20 players).',
  kicked: 'The host removed you from this room.',
  not_host: 'Only the host can do that.',
  not_in_lobby: 'The game has already started.',
  not_enough_players: 'You need at least 3 players to start.',
  not_a_member: 'You’re not in this room any more.',
  name_required: 'Enter your name first.',
  rate_limited: 'Too many new rooms. Wait a minute and try again.',
  invalid_settings: 'Those settings aren’t valid.',
  cannot_kick_self: 'You can’t remove yourself. Leave the room instead.',
  not_signed_in: 'Couldn’t connect. Check your internet and try again.',
};

export function friendlyError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');
  const code = Object.keys(MESSAGES).find((k) => raw.includes(k));
  if (code) return MESSAGES[code];
  if (/network|fetch|timed? ?out/i.test(raw)) return 'Couldn’t connect. Check your internet and try again.';
  return 'Something went wrong. Please try again.';
}
