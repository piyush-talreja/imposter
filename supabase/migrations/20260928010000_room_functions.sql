-- Phase 2, M2: room management. See docs/phase-2-online.md.
--
-- Clients can't write tables directly (M1), so every room change goes through
-- these security-definer functions. Each one checks who is calling, applies the
-- change, and then tells the room over Realtime:
--   room:{id}      'room_updated'  everyone refetches the room and players
--   player:{uid}   'kicked'        the removed player is told (they can no longer read the room)
-- Errors are raised with stable codes (e.g. 'room_not_found') that the app maps to messages.

-- ---------------------------------------------------------------- constants

create function public.max_room_players() returns int language sql immutable as $$ select 20 $$;

-- Unambiguous alphabet: no 0/O or 1/I/L. Matches the rooms.code check constraint.
create function public.new_room_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  for attempt in 1..20 loop
    candidate := '';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if not exists (select 1 from public.rooms where code = candidate and status <> 'closed') then
      return candidate;
    end if;
  end loop;
  raise exception 'no_code_available';
end;
$$;

-- ---------------------------------------------------------------- helpers

create function public.require_user() returns uuid language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  return auth.uid();
end;
$$;

create function public.clean_name(p_name text) returns text language plpgsql immutable set search_path = '' as $$
declare cleaned text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(cleaned) < 1 then raise exception 'name_required'; end if;
  return left(cleaned, 16);
end;
$$;

-- "Ana" is taken, so return "Ana 2", then "Ana 3", and so on (within 16 characters).
create function public.unique_name(p_room uuid, p_name text, p_user uuid) returns text language plpgsql stable set search_path = '' as $$
declare
  candidate text := p_name;
  n int := 1;
begin
  while exists (
    select 1 from public.room_players
    where room_id = p_room and user_id <> p_user and left_at is null and not kicked
      and lower(name) = lower(candidate)
  ) loop
    n := n + 1;
    candidate := left(p_name, 16 - char_length(' ' || n)) || ' ' || n;
  end loop;
  return candidate;
end;
$$;

-- Validate the room settings shape. Role caps depend on the player count, so the
-- engine enforces those when the game starts (M3); this checks types and ranges.
create function public.validate_settings(p jsonb) returns jsonb language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'invalid_settings'; end if;
  if pg_column_size(p) > 4000 then raise exception 'invalid_settings'; end if;
  if coalesce(p ->> 'clueMode', 'spoken') not in ('typed', 'spoken') then raise exception 'invalid_settings'; end if;
  if p ? 'clueSeconds' and p -> 'clueSeconds' <> 'null'::jsonb
     and not ((p ->> 'clueSeconds') ~ '^\d+$' and (p ->> 'clueSeconds')::int between 10 and 300) then
    raise exception 'invalid_settings';
  end if;
  if p ? 'voteSeconds' and p -> 'voteSeconds' <> 'null'::jsonb
     and not ((p ->> 'voteSeconds') ~ '^\d+$' and (p ->> 'voteSeconds')::int between 10 and 300) then
    raise exception 'invalid_settings';
  end if;
  return p;
end;
$$;

create function public.notify_room(p_room uuid) returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform realtime.send(jsonb_build_object('room_id', p_room), 'room_updated', 'room:' || p_room::text, true);
end;
$$;

-- The caller's active membership, or an error.
create function public.require_member(p_room uuid) returns public.rooms language plpgsql stable security definer set search_path = '' as $$
declare r public.rooms;
begin
  select * into r from public.rooms where id = p_room;
  if not found or not public.is_room_member(p_room) then raise exception 'not_a_member'; end if;
  return r;
end;
$$;

create function public.require_host(p_room uuid) returns public.rooms language plpgsql stable security definer set search_path = '' as $$
declare r public.rooms := public.require_member(p_room);
begin
  if r.host_id <> auth.uid() then raise exception 'not_host'; end if;
  return r;
end;
$$;

-- ---------------------------------------------------------------- room functions

create function public.create_room(p_name text, p_settings jsonb default '{}'::jsonb)
returns table (room_id uuid, code text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_user();
  r public.rooms;
begin
  if (select count(*) from public.rooms where host_id = me and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'rate_limited';
  end if;
  insert into public.rooms (code, host_id, settings)
    values (public.new_room_code(), me, public.validate_settings(coalesce(p_settings, '{}'::jsonb)))
    returning * into r;
  insert into public.room_players (room_id, user_id, name, seat) values (r.id, me, public.clean_name(p_name), 1);
  return query select r.id, r.code;
end;
$$;

create function public.join_room(p_code text, p_name text)
returns table (room_id uuid, code text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_user();
  r public.rooms;
  existing public.room_players;
  wanted text := public.clean_name(p_name);
begin
  select * into r from public.rooms
    where rooms.code = upper(btrim(coalesce(p_code, ''))) and status <> 'closed'
    order by created_at desc limit 1;
  if not found then raise exception 'room_not_found'; end if;
  if r.expires_at < now() then raise exception 'room_closed'; end if;

  select * into existing from public.room_players rp where rp.room_id = r.id and rp.user_id = me;
  if found and existing.kicked then raise exception 'kicked'; end if;

  -- Already in: joining again is harmless.
  if found and existing.left_at is null then
    return query select r.id, r.code;
    return;
  end if;

  if (select count(*) from public.room_players rp where rp.room_id = r.id and rp.left_at is null and not rp.kicked)
     >= public.max_room_players() then
    raise exception 'room_full';
  end if;

  if found then
    -- Rejoining after leaving: same seat, current name.
    update public.room_players rp
      set left_at = null, name = public.unique_name(r.id, wanted, me), waiting = (r.status = 'playing')
      where rp.room_id = r.id and rp.user_id = me;
  else
    insert into public.room_players (room_id, user_id, name, seat, waiting)
      values (
        r.id, me, public.unique_name(r.id, wanted, me),
        coalesce((select max(seat) from public.room_players rp where rp.room_id = r.id), 0) + 1,
        r.status = 'playing'
      );
  end if;

  perform public.notify_room(r.id);
  return query select r.id, r.code;
end;
$$;

create function public.leave_room(p_room uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.require_user();
  r public.rooms := public.require_member(p_room);
  next_host uuid;
begin
  update public.room_players set left_at = now() where room_id = p_room and user_id = me;

  if r.host_id = me then
    select user_id into next_host from public.room_players
      where room_id = p_room and left_at is null and not kicked
      order by seat limit 1;
    if next_host is null then
      update public.rooms set status = 'closed' where id = p_room;
    else
      update public.rooms set host_id = next_host where id = p_room;
    end if;
  end if;

  perform public.notify_room(p_room);
end;
$$;

create function public.kick_player(p_room uuid, p_user uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.require_host(p_room);
  if p_user = auth.uid() then raise exception 'cannot_kick_self'; end if;
  update public.room_players set kicked = true, left_at = now()
    where room_id = p_room and user_id = p_user and left_at is null;
  if not found then raise exception 'not_a_member'; end if;

  perform public.notify_room(p_room);
  -- They can no longer read the room, so tell them directly on their private channel.
  perform realtime.send(jsonb_build_object('room_id', p_room), 'kicked', 'player:' || p_user::text, true);
end;
$$;

create function public.update_settings(p_room uuid, p_settings jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare r public.rooms := public.require_host(p_room);
begin
  if r.status <> 'lobby' then raise exception 'not_in_lobby'; end if;
  update public.rooms set settings = public.validate_settings(p_settings) where id = p_room;
  perform public.notify_room(p_room);
end;
$$;

-- M2 only flips the room to 'playing'; M3 deals the cards.
create function public.start_game(p_room uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare r public.rooms := public.require_host(p_room);
begin
  if r.status <> 'lobby' then raise exception 'not_in_lobby'; end if;
  if (select count(*) from public.room_players where room_id = p_room and left_at is null and not kicked) < 3 then
    raise exception 'not_enough_players';
  end if;
  update public.room_players set waiting = false where room_id = p_room;
  update public.rooms set status = 'playing' where id = p_room;
  perform public.notify_room(p_room);
end;
$$;

-- ---------------------------------------------------------------- privileges

-- Only the room functions are callable by signed-in users; the helpers are internal.
revoke execute on function
  public.max_room_players(), public.new_room_code(), public.require_user(), public.clean_name(text),
  public.unique_name(uuid, text, uuid), public.validate_settings(jsonb), public.notify_room(uuid),
  public.require_member(uuid), public.require_host(uuid)
from public, anon, authenticated;

revoke execute on function
  public.create_room(text, jsonb), public.join_room(text, text), public.leave_room(uuid),
  public.kick_player(uuid, uuid), public.update_settings(uuid, jsonb), public.start_game(uuid)
from public, anon;

grant execute on function
  public.create_room(text, jsonb), public.join_room(text, text), public.leave_room(uuid),
  public.kick_player(uuid, uuid), public.update_settings(uuid, jsonb), public.start_game(uuid)
to authenticated;
