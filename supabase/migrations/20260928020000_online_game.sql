-- Phase 2, M3: the online game. See docs/phase-2-online.md.
--
-- The game-action Edge Function (service role) is the referee. It keeps the full
-- game state in game_secrets.state (no client access), publishes a safe view to
-- games.public_state (members can read), and bumps game_secrets.version on every
-- change so two simultaneous actions can't overwrite each other.

alter table public.game_secrets
  add column state   jsonb not null default '{}'::jsonb,
  add column version int   not null default 0;

alter table public.rooms
  -- The game in progress (or just finished) for this room.
  add column current_game uuid references public.games (id) on delete set null,
  -- Running totals for this room session: user id → points.
  add column scores jsonb not null default '{}'::jsonb;

-- Server → room: tell every member something changed ('room_updated' or 'game_updated').
create function public.server_notify(p_room uuid, p_event text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_event not in ('room_updated', 'game_updated') then raise exception 'invalid_event'; end if;
  perform realtime.send(jsonb_build_object('room_id', p_room), p_event, 'room:' || p_room::text, true);
end;
$$;

revoke execute on function public.server_notify(uuid, text) from public, anon, authenticated;
grant execute on function public.server_notify(uuid, text) to service_role;
