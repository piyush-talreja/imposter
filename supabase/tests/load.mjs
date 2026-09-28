// Load test: a full online game with 20 players (the room maximum) through the
// Edge Function, including 20 simultaneous votes. Reports latency per action.
// Run: pnpm test:online:load   (needs db:start + functions:serve)
import { execSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

const N = Number(process.env.PLAYERS ?? 20);
const env = Object.fromEntries(
  execSync('npx supabase status -o env', { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const timings = {};
let failed = 0;
const check = (ok, name, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

let roomId;
const act = async (p, action, extra = {}) => {
  const t = performance.now();
  const { data, error } = await p.sb.functions.invoke('game-action', { body: { action, roomId, ...extra } });
  (timings[action] ??= []).push(performance.now() - t);
  if (error) return { error: (await error.context?.json?.().catch(() => null))?.error ?? error.message };
  return data;
};
const view = async (p) => {
  const { data: room } = await p.sb.from('rooms').select('current_game, scores').eq('id', roomId).single();
  const { data: game } = await p.sb.from('games').select('public_state').eq('id', room.current_game).single();
  return { room, v: game.public_state };
};

const started = performance.now();
const players = await Promise.all(
  Array.from({ length: N }, async (_, i) => {
    const sb = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false } });
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw error;
    return { name: `P${i + 1}`, sb, id: data.user.id };
  }),
);
const [host] = players;
const settings = {
  clueMode: 'typed',
  categoryIds: [],
  difficulties: ['easy', 'medium'],
  autoRoles: true,
  roles: { undercover: 0, imposter: 1 },
  imposterSeesCategory: false,
  imposterNeverFirst: true,
  scoring: true,
};
const { data: created } = await host.sb.rpc('create_room', { p_name: 'P1', p_settings: settings });
roomId = created[0].room_id;
await Promise.all(
  players.slice(1).map((p) => p.sb.rpc('join_room', { p_code: created[0].code, p_name: p.name })),
);
const { count } = await host.sb
  .from('room_players')
  .select('*', { count: 'exact', head: true })
  .eq('room_id', roomId)
  .is('left_at', null);
check(count === N, `${N} players joined at once`);

check((await act(host, 'start')).ok, 'game starts');
const cards = await Promise.all(players.map((p) => act(p, 'my-card')));
check(
  cards.every((c) => c.card),
  `${N} private cards fetched at once`,
);
const imposters = players.filter((p, i) => cards[i].card.kind === 'imposter');
check(imposters.length === 2, 'a 20-player game has 2 imposters (recommended split)', `${imposters.length}`);

const seenResults = await Promise.all(players.map((p) => act(p, 'seen')));
check(
  seenResults.every((r) => r.ok),
  `${N} "seen" taps at the same instant all succeed`,
  seenResults.find((r) => !r.ok)?.error,
);
let { v } = await view(host);
check(v.phase === 'clues', `${N} "seen" at once move the game to clues`);

const byId = Object.fromEntries(players.map((p) => [p.id, p]));
const round = async () => {
  for (;;) {
    ({ v } = await view(host));
    if (v.phase !== 'clues') return;
    const r = await act(byId[v.speaker], 'clue', { text: `c${v.clues.length}` });
    if (!r.ok) throw new Error(`clue: ${r.error}`);
  }
};
await round();
check(v.phase === 'discuss', `${N} clues in turn`);
await act(host, 'open-vote');

// Everyone votes for the first imposter at the same instant.
const target = imposters[0];
const results = await Promise.all(
  players.map((p) =>
    act(p, 'vote', { target: p === target ? players.find((q) => q !== target).id : target.id }),
  ),
);
check(
  results.every((r) => r.ok),
  `${N} simultaneous votes accepted`,
  results.find((r) => !r.ok)?.error,
);
({ v } = await view(host));
const counted = Object.values(v.result?.tally ?? {}).reduce((a, b) => a + b, 0);
check(counted === N, `all ${N} votes counted`, `${counted}`);
check(v.result?.out === target.id, 'the most-voted player is out');

const p = (arr, q) => arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(arr.length * q))];
console.log('\nlatency (ms)    count   p50    p95    max');
for (const [action, arr] of Object.entries(timings)) {
  console.log(
    `${action.padEnd(14)} ${String(arr.length).padStart(6)} ${p(arr, 0.5).toFixed(0).padStart(6)} ${p(arr, 0.95).toFixed(0).padStart(6)} ${Math.max(
      ...arr,
    )
      .toFixed(0)
      .padStart(6)}`,
  );
}
console.log(`total ${((performance.now() - started) / 1000).toFixed(1)} s`);
console.log(failed ? `\n${failed} FAILED` : `\n${N}-player load test passed`);
process.exit(failed ? 1 : 0);
