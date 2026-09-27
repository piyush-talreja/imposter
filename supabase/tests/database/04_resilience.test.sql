-- M4: host handover timestamps and the hourly cleanup.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, aud, role, is_anonymous, created_at) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', true, now()),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', true, now()),
  ('a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', true, now() - interval '40 days');

insert into public.rooms (id, code, host_id, expires_at, host_seen_at) values
  ('b0000000-0000-0000-0000-000000000001', 'AAAA', 'a0000000-0000-0000-0000-000000000001', now() + interval '1 hour', now() - interval '1 hour'),
  ('b0000000-0000-0000-0000-000000000002', 'BBBB', 'a0000000-0000-0000-0000-000000000002', now() - interval '1 minute', now());
insert into public.room_players (room_id, user_id, name, seat) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ana', 1),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Ben', 2),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Ben', 1);

-- Host leaves: the new host gets a fresh check-in time.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.leave_room('b0000000-0000-0000-0000-000000000001');
reset role;
select is((select host_id from public.rooms where code = 'AAAA'), 'a0000000-0000-0000-0000-000000000002'::uuid, 'hosting passes on');
select ok((select host_seen_at > now() - interval '5 seconds' from public.rooms where code = 'AAAA'), 'new host starts with a fresh check-in');

-- Cleanup: expired rooms go (with their players); old unused anonymous users go.
select public.cleanup_expired();
select is((select count(*)::int from public.rooms where code = 'BBBB'), 0, 'expired rooms are deleted');
select is((select count(*)::int from public.room_players where room_id = 'b0000000-0000-0000-0000-000000000002'), 0, 'their players go with them');
select is((select count(*)::int from auth.users where id = 'a0000000-0000-0000-0000-000000000003'), 0, 'old anonymous users with no rooms are removed');
select is((select count(*)::int from cron.job where jobname = 'cleanup-expired-rooms'), 1, 'cleanup runs on a schedule');

select * from finish();
rollback;
