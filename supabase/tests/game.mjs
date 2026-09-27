// Full online game through the game-action Edge Function, with 5 real players
// (anonymous users) against the local stack. Checks the rules, privacy, and that
// simultaneous votes are all counted.
// Run: pnpm test:online:game   (needs `pnpm db:start` and `pnpm functions:serve`)
import { execSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  execSync('npx supabase status -o env', { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
let failed = 0;
const check = (ok, name, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

const newPlayer = async (name) => {
  const sb = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false } });
  const { data } = await sb.auth.signInAnonymously();
  return { name, sb, id: data.user.id };
};
const act = async (p, action, extra = {}) => {
  const { data, error } = await p.sb.functions.invoke('game-action', { body: { action, roomId, ...extra } });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    return { error: body?.error ?? error.message };
  }
  return data;
};
const view = async (p) => {
  const { data: room } = await p.sb
    .from('rooms')
    .select('current_game, status, scores')
    .eq('id', roomId)
    .single();
  const { data: game } = await p.sb.from('games').select('public_state').eq('id', room.current_game).single();
  return { room, v: game.public_state };
};

// ---------------------------------------------------------------- room with 5 players
const players = await Promise.all(['Ana', 'Ben', 'Cy', 'Dee', 'Eli'].map(newPlayer));
const [host] = players;
const { data: created } = await host.sb.rpc('create_room', {
  p_name: 'Ana',
  p_settings: {
    clueMode: 'typed',
    categoryIds: [],
    difficulties: ['easy', 'medium'],
    autoRoles: true,
    roles: { undercover: 0, imposter: 1 },
    imposterSeesCategory: false,
    imposterNeverFirst: true,
    scoring: true,
  },
});
const roomId = created[0].room_id;
for (const p of players.slice(1)) await p.sb.rpc('join_room', { p_code: created[0].code, p_name: p.name });

check((await act(players[1], 'start')).error === 'not_host', 'only the host can start');
check((await act(host, 'start')).ok === true, 'host starts the game');

// ---------------------------------------------------------------- private cards
const cards = {};
for (const p of players) cards[p.id] = (await act(p, 'my-card')).card;
const words = Object.values(cards)
  .filter((c) => c.kind === 'word')
  .map((c) => c.word);
const imposters = players.filter((p) => cards[p.id].kind === 'imposter');
const counts = {};
for (const w of words) counts[w] = (counts[w] ?? 0) + 1;
const villagerWord = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
const undercover = players.find((p) => cards[p.id].kind === 'word' && cards[p.id].word !== villagerWord);
check(imposters.length === 1, 'exactly one imposter card');
check(
  !!undercover && counts[villagerWord] === 3,
  'three villagers share a word; the undercover has a different one',
);

const outsider = await newPlayer('Zed');
const snoop = await outsider.sb.functions.invoke('game-action', { body: { action: 'my-card', roomId } });
check(snoop.error?.context?.status === 403, "an outsider can't fetch anyone's card");
const secrets = await players[1].sb.from('game_secrets').select('*');
check(secrets.error?.code === '42501', "players can't read game_secrets");
let { v } = await view(players[1]);
check(
  !JSON.stringify(v).includes(villagerWord) && !JSON.stringify(v).includes(cards[undercover.id].word),
  'public state contains no secret words',
);

// ---------------------------------------------------------------- deal → clues
for (const p of players) await act(p, 'seen');
({ v } = await view(host));
check(v.phase === 'clues', 'clues start once everyone has seen their card');
const byId = Object.fromEntries(players.map((p) => [p.id, p]));
const notSpeaker = players.find((p) => p.id !== v.speaker);
check(
  (await act(notSpeaker, 'clue', { text: 'sneaky' })).error === 'not_your_turn',
  'out-of-turn clues are refused',
);

const giveAllClues = async () => {
  for (;;) {
    ({ v } = await view(host));
    if (v.phase !== 'clues') return;
    const p = byId[v.speaker];
    const r = await act(p, 'clue', { text: `hint${p.name}` });
    if (!r.ok) throw new Error(`clue failed: ${r.error}`);
  }
};
const own = cards[players.find((p) => cards[p.id].kind === 'word').id];
await giveAllClues();
({ v } = await view(host));
check(v.phase === 'discuss' && v.clues.length === 5, 'after five clues, discussion opens');

// ---------------------------------------------------------------- suspicion, vote
const imp = imposters[0];
const suspicious = players.find((p) => p.id !== imp.id);
await act(suspicious, 'suspect', { clueBy: imp.id });
({ v } = await view(host));
check(v.suspicion[imp.id] === 1, 'suspicion taps are counted publicly');
check((await act(players[1], 'open-vote')).error === 'not_host', 'only the host opens the vote'); // players[1] is never the host
await act(host, 'open-vote');

// Everyone votes at the same moment: all five must count.
await Promise.all(
  players.map((p) =>
    act(p, 'vote', { target: p.id === imp.id ? players.find((q) => q.id !== imp.id).id : imp.id }),
  ),
);
({ v } = await view(host));
check(
  v.result?.out === imp.id && Object.values(v.result.tally).reduce((a, b) => a + b, 0) === 5,
  'five simultaneous votes are all counted',
);
check(v.phase === 'guess' && v.pendingGuess === imp.id, 'the caught imposter is asked to guess');
check(
  (
    await act(
      players.find((p) => p.id !== imp.id),
      'guess',
      { text: villagerWord },
    )
  ).error === 'not_your_guess',
  'only the imposter can guess',
);
await act(imp, 'guess', { text: 'definitely-not-it' });
({ v } = await view(host));
check(
  v.phase === 'reveal' && v.lastGuess?.correct === false && v.winner === 'villagers',
  'a wrong guess: villagers win the main round',
);

// ---------------------------------------------------------------- bonus round
await act(host, 'continue');
({ v } = await view(host));
check(v.phase === 'clues' && v.round === 2, 'bonus round starts (an undercover is still in)');
await giveAllClues();
await act(host, 'open-vote');
const stillIn = players.filter((p) => p.id !== imp.id);
await Promise.all(
  stillIn.map((p) =>
    act(p, 'vote', {
      target: p.id === undercover.id ? stillIn.find((q) => q.id !== undercover.id).id : undercover.id,
    }),
  ),
);
({ v } = await view(host));
check(
  v.result?.out === undercover.id && v.eliminated.find((e) => e.id === undercover.id)?.role === 'undercover',
  'undercover voted out and revealed',
);
await act(host, 'continue');
let room;
({ v, room } = await view(host));
check(v.phase === 'over' && v.reveal?.word === villagerWord, 'game over: the words are revealed');
const villagerIds = players.filter((p) => p.id !== imp.id && p.id !== undercover.id).map((p) => p.id);
check(
  villagerIds.every((id) => room.scores[id] === 4) &&
    room.scores[undercover.id] === 2 &&
    !room.scores[imp.id],
  'room scores: villagers +4, undercover +2, imposter 0',
  JSON.stringify(room.scores),
);

// ---------------------------------------------------------------- back to lobby
check((await act(host, 'back-to-lobby')).ok === true, 'host returns everyone to the lobby');
({ room } = await view(host));
check(room.status === 'lobby', 'room is back in the lobby for the next game');

console.log(failed ? `\n${failed} FAILED` : '\nFull online game passed');
process.exit(failed ? 1 : 0);
