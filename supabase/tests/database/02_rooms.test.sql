-- Room functions (M2): who can do what, and the join rules.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (id, aud, role)
select ('0000000' || i || '-0000-0000-0000-000000000000')::uuid, 'authenticated', 'authenticated'
from generate_series(1, 9) i;

create function pg_temp.as_user(i int) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '0000000' || i || '-0000-0000-0000-000000000000', 'role', 'authenticated')::text, true);
$$;
create temp table ctx (room uuid, code text);
grant all on ctx to authenticated;

set local role authenticated;

-- ---------------------------------------------------------------- create
select pg_temp.as_user(1);
insert into ctx select * from public.create_room('  Ana  ', '{"clueMode":"typed","clueSeconds":30}');
select matches((select code from ctx), '^[A-HJ-KM-NP-Z2-9]{4}$', 'create_room returns a 4-character unambiguous code');
select is((select host_id from public.rooms where id = (select room from ctx)), '00000001-0000-0000-0000-000000000000'::uuid, 'creator is the host');
select is((select name from public.room_players where user_id = auth.uid()), 'Ana', 'host is seated with a trimmed name');
select throws_ok($$ select public.create_room('', '{}') $$, 'name_required', 'a name is required');
select throws_ok($$ select public.create_room('Ana', '{"clueMode":"shouting"}') $$, 'invalid_settings', 'invalid clue mode is rejected');
select throws_ok($$ select public.create_room('Ana', '{"voteSeconds":5}') $$, 'invalid_settings', 'timers outside 10 to 300 s are rejected');

-- ---------------------------------------------------------------- join
select pg_temp.as_user(2);
select is((select count(*)::int from public.rooms), 0, 'before joining, the room is invisible');
select lives_ok($$ select public.join_room(lower((select code from ctx)), 'Ben') $$, 'join by code is case-insensitive');
select is((select count(*)::int from public.room_players), 2, 'after joining, the member sees both players');
select lives_ok($$ select public.join_room((select code from ctx), 'Ben') $$, 'joining again is harmless');
select is((select count(*)::int from public.room_players), 2, 'no duplicate seat on rejoin');
select throws_ok($$ select public.join_room('ZZZZ', 'Ben') $$, 'room_not_found', 'unknown code');

select pg_temp.as_user(3);
select public.join_room((select code from ctx), 'ana');
select is((select name from public.room_players where user_id = auth.uid()), 'ana 2', 'duplicate names get a number');
select is((select seat from public.room_players where user_id = auth.uid()), 3, 'seats are assigned in join order');

-- ---------------------------------------------------------------- host-only actions
select pg_temp.as_user(2);
select throws_ok($$ select public.kick_player((select room from ctx), '00000003-0000-0000-0000-000000000000') $$, 'not_host', 'only the host can remove players');
select throws_ok($$ select public.update_settings((select room from ctx), '{}') $$, 'not_host', 'only the host can change settings');
select throws_ok($$ select public.start_game((select room from ctx)) $$, 'not_host', 'only the host can start');

select pg_temp.as_user(1);
select throws_ok($$ select public.kick_player((select room from ctx), auth.uid()) $$, 'cannot_kick_self', 'host cannot remove themselves');
select lives_ok($$ select public.kick_player((select room from ctx), '00000003-0000-0000-0000-000000000000') $$, 'host removes a player');
select lives_ok($$ select public.update_settings((select room from ctx), '{"clueMode":"spoken"}') $$, 'host updates settings');
select is((select settings ->> 'clueMode' from public.rooms where id = (select room from ctx)), 'spoken', 'settings saved');

select pg_temp.as_user(3);
select is((select count(*)::int from public.rooms), 0, 'removed player loses access');
select throws_ok($$ select public.join_room((select code from ctx), 'Cy') $$, 'kicked', 'removed player cannot rejoin');

-- ---------------------------------------------------------------- start
select pg_temp.as_user(1);
select throws_ok($$ select public.start_game((select room from ctx)) $$, 'not_enough_players', 'needs at least 3 players');
select pg_temp.as_user(4);
select public.join_room((select code from ctx), 'Dee');
select pg_temp.as_user(1);
select lives_ok($$ select public.start_game((select room from ctx)) $$, 'host starts with 3 players');
select throws_ok($$ select public.update_settings((select room from ctx), '{}') $$, 'not_in_lobby', 'settings are locked once playing');

select pg_temp.as_user(5);
select public.join_room((select code from ctx), 'Eli');
select is((select waiting from public.room_players where user_id = auth.uid()), true, 'joining mid-game waits for the next game');

-- ---------------------------------------------------------------- leave and host handover
select pg_temp.as_user(1);
select public.leave_room((select room from ctx));
select pg_temp.as_user(2);
select is((select host_id from public.rooms where id = (select room from ctx)), '00000002-0000-0000-0000-000000000000'::uuid,
  'when the host leaves, the next seat becomes host');

-- Everyone leaves: the room closes and its code is free again.
select public.leave_room((select room from ctx));
select pg_temp.as_user(4);
select public.leave_room((select room from ctx));
select pg_temp.as_user(5);
select public.leave_room((select room from ctx));
reset role;
select is((select status from public.rooms where id = (select room from ctx)), 'closed', 'the last one out closes the room');

-- ---------------------------------------------------------------- privileges and rate limit
set local role authenticated;
select pg_temp.as_user(6);
select public.create_room('Fay', '{}') from generate_series(1, 5);
select throws_ok($$ select public.create_room('Fay', '{}') $$, 'rate_limited', 'at most 5 new rooms a minute per player');
reset role;

select ok(not has_function_privilege('anon', 'public.create_room(text, jsonb)', 'execute'), 'signed-out users cannot create rooms');
select ok(not has_function_privilege('authenticated', 'public.notify_room(uuid)', 'execute'), 'internal helpers are not callable by clients');

select * from finish();
rollback;
