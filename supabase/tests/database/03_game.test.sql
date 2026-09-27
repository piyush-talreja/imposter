-- M3: game state stays server-only; only the server can notify rooms.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(not has_column_privilege('authenticated', 'public.game_secrets', 'state', 'select'),
  'clients cannot read the full game state');
select ok(not has_function_privilege('authenticated', 'public.server_notify(uuid, text)', 'execute'),
  'clients cannot send server notifications');
select ok(has_function_privilege('service_role', 'public.server_notify(uuid, text)', 'execute'),
  'the Edge Function (service role) can notify rooms');
select throws_ok($$ select public.server_notify(gen_random_uuid(), 'anything') $$, 'invalid_event',
  'only known events can be sent');

select * from finish();
rollback;
