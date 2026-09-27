-- Phase 2, M4: resilience. See docs/phase-2-online.md.

-- ---------------------------------------------------------------- host check-ins
-- The host's app checks in every 15 s (game-action 'heartbeat'). If it stops for
-- 45 s, any member still in the room may take over hosting ('claim-host').
alter table public.rooms add column host_seen_at timestamptz not null default now();

-- A new host has only just arrived; give them the full grace period.
create or replace function public.leave_room(p_room uuid)
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
      update public.rooms set host_id = next_host, host_seen_at = now() where id = p_room;
    end if;
  end if;

  perform public.notify_room(p_room);
end;
$$;

-- ---------------------------------------------------------------- cleanup
-- Rooms last 24 h (rooms.expires_at). Deleting a room cascades to its players,
-- games and secrets. Anonymous accounts that haven't been in a room for 30 days
-- are removed too, so the auth table doesn't grow forever.
create function public.cleanup_expired()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.rooms where expires_at < now();
  delete from auth.users u
    where u.is_anonymous
      and u.created_at < now() - interval '30 days'
      and not exists (select 1 from public.room_players rp where rp.user_id = u.id);
end;
$$;

revoke execute on function public.cleanup_expired() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('cleanup-expired-rooms', '17 * * * *', 'select public.cleanup_expired()');
