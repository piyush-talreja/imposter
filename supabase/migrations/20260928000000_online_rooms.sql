-- Phase 2, M1: online rooms. See docs/phase-2-online.md.
--
-- Ground rule: no client ever reads another player's secret word or role.
--   * Phones never write to these tables directly. Changes go through
--     security-definer RPCs (M2) or the game-action Edge Function (M3).
--   * Members can read their own room's public data.
--   * game_secrets has no client access at all; only the service role (the
--     Edge Function) can read it, and each card is sent privately on player:{uid}.

-- ---------------------------------------------------------------- tables

create table public.rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null check (code ~ '^[A-HJ-KM-NP-Z2-9]{4}$'),
  host_id     uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'lobby' check (status in ('lobby', 'playing', 'closed')),
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '24 hours'
);
-- A code is unique among rooms that are still open; closed rooms free it up.
create unique index rooms_open_code on public.rooms (code) where status <> 'closed';

create table public.room_players (
  room_id    uuid not null references public.rooms (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 16),
  seat       int  not null,
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,
  kicked     boolean not null default false,
  -- Joined mid-game; dealt into the next game.
  waiting    boolean not null default false,
  primary key (room_id, user_id)
);
create index room_players_user on public.room_players (user_id);

create table public.games (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.rooms (id) on delete cascade,
  round         int  not null default 1,
  phase         text not null default 'deal',
  -- Everything every member may see: turn order, eliminated, clues, counts, winner, scores.
  public_state  jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index games_room on public.games (room_id);

create table public.game_secrets (
  game_id  uuid primary key references public.games (id) on delete cascade,
  word     text  not null,
  cousin   text  not null,
  roles    jsonb not null,
  votes    jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------- helpers

-- True when the current user is an active member (not left, not kicked).
-- security definer so RLS policies can call it without recursing into room_players' own policy.
create function public.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_players rp
    where rp.room_id = p_room
      and rp.user_id = auth.uid()
      and rp.left_at is null
      and not rp.kicked
  );
$$;

-- Parse "room:<uuid>" safely; null for anything else.
create function public.room_from_topic(p_topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_topic ~ '^room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then substring(p_topic from 6)::uuid
  end;
$$;

-- May the current user listen on this Realtime topic?
--   room:{id}     members of that room
--   player:{uid}  only that user (their private card channel)
create function public.can_receive(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.is_room_member(public.room_from_topic(p_topic))
      or p_topic = 'player:' || auth.uid()::text,
    false
  );
$$;

-- May the current user send on this topic? Only presence (who's online) on
-- their own room. Clients never broadcast; the server does.
create function public.can_send(p_topic text, p_extension text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_extension = 'presence' and coalesce(public.is_room_member(public.room_from_topic(p_topic)), false);
$$;

-- ---------------------------------------------------------------- RLS

alter table public.rooms        enable row level security;
alter table public.room_players enable row level security;
alter table public.games        enable row level security;
alter table public.game_secrets enable row level security;

create policy "members read their room" on public.rooms
  for select to authenticated using (public.is_room_member(id));

create policy "members read their room's players" on public.room_players
  for select to authenticated using (public.is_room_member(room_id));

create policy "members read their room's games" on public.games
  for select to authenticated using (public.is_room_member(room_id));

-- game_secrets: deliberately no policy. With RLS on and no policy, clients get nothing.

-- Defence in depth: clients hold no write privileges at all, and none on secrets.
revoke insert, update, delete, truncate on public.rooms, public.room_players, public.games from anon, authenticated;
revoke all on public.game_secrets from anon, authenticated;
revoke all on public.rooms, public.room_players, public.games from anon;
revoke execute on function public.is_room_member(uuid), public.can_receive(text), public.can_send(text, text) from anon;

-- ---------------------------------------------------------------- Realtime authorization

-- Private channels only: Realtime checks these policies before a client may join a topic.
create policy "receive on allowed topics" on realtime.messages
  for select to authenticated using (public.can_receive(realtime.topic()));

create policy "presence on own room" on realtime.messages
  for insert to authenticated with check (public.can_send(realtime.topic(), extension));
