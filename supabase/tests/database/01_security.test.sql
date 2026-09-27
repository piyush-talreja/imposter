-- Proves the Phase 2 ground rule: no client can read another player's secrets,
-- outsiders see nothing, and clients cannot write game data directly.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- ---------------------------------------------------------------- fixtures (as postgres)
-- u1 host, u2 member, u3 outsider, u4 kicked, u5 left the room
insert into auth.users (id, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated');

insert into public.rooms (id, code, host_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'K7QX', '11111111-1111-1111-1111-111111111111');

insert into public.room_players (room_id, user_id, name, seat, kicked, left_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ana', 1, false, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Ben', 2, false, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Dee', 3, true, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'Eli', 4, false, now());

insert into public.games (id, room_id, public_state) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"round":1}');
insert into public.game_secrets (game_id, word, cousin, roles) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Pizza', 'Calzone', '{"11111111-1111-1111-1111-111111111111":"villager"}');

-- ---------------------------------------------------------------- schema basics
select ok((select relrowsecurity from pg_class where oid = 'public.rooms'::regclass), 'RLS on rooms');
select ok((select relrowsecurity from pg_class where oid = 'public.room_players'::regclass), 'RLS on room_players');
select ok((select relrowsecurity from pg_class where oid = 'public.games'::regclass), 'RLS on games');
select ok((select relrowsecurity from pg_class where oid = 'public.game_secrets'::regclass), 'RLS on game_secrets');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'game_secrets'), 0,
  'game_secrets has no client policy at all');
select throws_ok($$ insert into public.rooms (code, host_id) values ('ABCO', '11111111-1111-1111-1111-111111111111') $$,
  '23514', null, 'room codes reject ambiguous characters (O)');

-- ---------------------------------------------------------------- member (u2)
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*)::int from public.rooms), 1, 'member sees their room');
select is((select count(*)::int from public.room_players), 4, 'member sees the player list');
select is((select count(*)::int from public.games), 1, 'member sees the game''s public state');
select throws_ok($$ select * from public.game_secrets $$, '42501', null, 'member cannot read game_secrets');
select throws_ok($$ insert into public.rooms (code, host_id) values ('ZZZZ', auth.uid()) $$, '42501', null,
  'member cannot create rooms directly');
select throws_ok($$ update public.room_players set name = 'Hacker' where user_id = auth.uid() $$, '42501', null,
  'member cannot edit players directly');
select throws_ok($$ update public.games set public_state = '{}' $$, '42501', null, 'member cannot edit game state');
select throws_ok($$ delete from public.rooms $$, '42501', null, 'member cannot delete rooms');

-- Realtime: who may listen and send where
select ok(public.can_receive('room:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'member may listen on their room channel');
select ok(public.can_receive('player:22222222-2222-2222-2222-222222222222'), 'player may listen on their own card channel');
select ok(not public.can_receive('player:11111111-1111-1111-1111-111111111111'), 'player may NOT listen on someone else''s card channel');
select ok(public.can_send('room:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'presence'), 'member may share presence');
select ok(not public.can_send('room:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'broadcast'), 'member may NOT broadcast game events');
select ok(not public.can_receive('room:not-a-uuid'), 'malformed topics are rejected safely');

-- ---------------------------------------------------------------- outsider (u3)
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is((select count(*)::int from public.rooms) + (select count(*)::int from public.room_players)
  + (select count(*)::int from public.games), 0, 'outsider sees nothing');
select ok(not public.can_receive('room:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'outsider may NOT listen on the room');

-- ---------------------------------------------------------------- kicked (u4) and left (u5)
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
select is((select count(*)::int from public.rooms), 0, 'kicked player loses access');
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
select is((select count(*)::int from public.games), 0, 'player who left loses access');

select * from finish();
rollback;
