// M4 through the game-action Edge Function: timers, leaving and removal mid-game,
// and host handover. Run: pnpm test:online:resilience (needs db:start + functions:serve)
import { execSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  execSync('npx supabase status -o env', { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const db = (sql) =>
  execSync(
    `docker exec -i $(docker ps --format '{{.Names}}' | grep supabase_db) psql -U postgres -tAc "${sql}"`,
    { encoding: 'utf8' },
  ).trim();
let failed = 0;
const check = (ok, name, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const newPlayer = async (name) => {
  const sb = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false } });
  const { data } = await sb.auth.signInAnonymously();
  return { name, sb, id: data.user.id };
};
let roomId;
const act = async (p, action, extra = {}) => {
  const { data, error } = await p.sb.functions.invoke('game-action', { body: { action, roomId, ...extra } });
  if (error) return { error: (await error.context?.json?.().catch(() => null))?.error ?? error.message };
  return data;
};
const view = async (p) => {
  const { data: room } = await p.sb
    .from('rooms')
    .select('current_game, status, host_id')
    .eq('id', roomId)
    .single();
  const { data: game } = room.current_game
    ? await p.sb.from('games').select('public_state').eq('id', room.current_game).single()
    : { data: null };
  return { room, v: game?.public_state };
};

const ps = await Promise.all(['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay'].map(newPlayer));
const [host] = ps;
const settings = {
  clueMode: 'typed',
  clueSeconds: 10,
  voteSeconds: 10,
  categoryIds: [],
  difficulties: ['easy'],
  autoRoles: false,
  roles: { undercover: 0, imposter: 1 },
  imposterSeesCategory: false,
  imposterNeverFirst: true,
  scoring: true,
};
const { data: created } = await host.sb.rpc('create_room', { p_name: 'Ana', p_settings: settings });
roomId = created[0].room_id;
for (const p of ps.slice(1)) await p.sb.rpc('join_room', { p_code: created[0].code, p_name: p.name });
await act(host, 'start');
for (const p of ps) await act(p, 'seen');

// ---------------------------------------------------------------- clue timer
let { v } = await view(host);
check(
  v.phase === 'clues' && v.deadline > Date.now() + 8000 && v.deadline < Date.now() + 12000,
  'a timed clue turn has a ~10 s deadline',
);
check(typeof v.serverTime === 'number', 'views carry the server time (for clock drift)');
const bystander = ps.find((p) => p.id !== v.speaker);
check(
  (await act(bystander, 'tick')).error === 'not_yet',
  'an early tick is refused (the server checks the clock)',
);
const idle = v.speaker;
await sleep(10500);
check((await act(bystander, 'tick')).ok, 'after the deadline anyone can move things on');
({ v } = await view(host));
check(
  v.clues[0]?.by === idle && v.clues[0]?.text === null && v.speaker !== idle,
  'the idle player’s turn is skipped',
);

// ---------------------------------------------------------------- leaving and removal mid-game
const roles = JSON.parse(
  db(
    `select s.roles from public.game_secrets s join public.rooms r on r.current_game = s.game_id where r.id = '${roomId}'`,
  ),
);
const villagers = ps.filter((p) => roles[p.id] === 'villager' && p !== host);
const leaver = villagers.find((p) => p.id !== v.speaker) ?? villagers[0];
await act(leaver, 'leave');
({ v } = await view(host));
check(
  v.left.includes(leaver.id) && v.eliminated.some((e) => e.id === leaver.id && e.role === 'villager'),
  'a player who leaves is out, and their role is shown',
);
check(
  db(
    `select left_at is not null from public.room_players where room_id='${roomId}' and user_id='${leaver.id}'`,
  ) === 't',
  '...and they have left the room',
);

const removed = villagers.find((p) => p !== leaver);
check(
  (
    await act(
      ps.find((p) => p !== host && p !== removed && p !== leaver),
      'kick',
      { target: removed.id },
    )
  ).error === 'not_host',
  'only the host can remove players mid-game',
);
await act(host, 'kick', { target: removed.id });
({ v } = await view(host));
check(v.left.includes(removed.id), 'the host can remove a player mid-game');

// ---------------------------------------------------------------- vote timer with partial votes
for (let i = 0; i < 8; i++) {
  ({ v } = await view(host));
  if (v.phase !== 'clues') break;
  await act(
    ps.find((p) => p.id === v.speaker),
    'clue',
    { text: `c${i}` },
  );
}
await act(host, 'open-vote');
const inGame = ps.filter((p) => ![leaver.id, removed.id].includes(p.id));
const imposter = inGame.find((p) => roles[p.id] === 'imposter');
const voter = inGame.find((p) => p !== imposter);
await act(voter, 'vote', { target: imposter.id });
({ v } = await view(host));
check(v.phase === 'vote' && v.deadline > Date.now(), 'the vote has its own deadline');
await sleep(10500);
await act(host, 'tick');
({ v } = await view(host));
check(
  v.result?.out === imposter.id && v.result.tally[imposter.id] === 1,
  'when the vote timer runs out, the votes cast so far decide',
);

// ---------------------------------------------------------------- host check-ins and handover
const member = inGame.find((p) => p !== host);
check((await act(member, 'heartbeat')).error === 'not_host', 'only the host checks in');
check((await act(host, 'heartbeat')).ok, 'the host checks in');
check(
  (await act(member, 'claim-host')).error === 'host_still_here',
  'nobody can take over while the host is active',
);
db(`update public.rooms set host_seen_at = now() - interval '60 seconds' where id = '${roomId}'`);
check((await act(member, 'claim-host')).ok, 'after 45 s of silence, a member can take over');
({ room: v } = await view(host));
check(v.host_id === member.id, 'hosting passed to that member');
const other = inGame.find((p) => p !== host && p !== member);
check((await act(other, 'claim-host')).error === 'host_still_here', 'the new host has a fresh grace period');

console.log(failed ? `\n${failed} FAILED` : '\nResilience checks passed');
process.exit(failed ? 1 : 0);
