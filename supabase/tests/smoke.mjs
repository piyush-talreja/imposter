// End-to-end check of M1 against the local stack, acting exactly like a phone.
// Run: pnpm test:online   (needs `pnpm supabase start` and `pnpm supabase functions serve`)
import { execSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  execSync('npx supabase status -o env', { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const url = env.API_URL;
const anon = env.ANON_KEY;

let failed = 0;
const check = (ok, name, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
};

const client = () => createClient(url, anon, { auth: { persistSession: false } });

// 1. Anonymous sign-in: a player is just a name, no account.
const phone = client();
const { data: auth, error: authErr } = await phone.auth.signInAnonymously();
check(!authErr && auth.user?.is_anonymous, 'anonymous sign-in', authErr?.message);
const me = auth.user.id;

// 2. The Edge Function knows who's calling and runs the shared engine.
const { data: pong, error: pingErr } = await phone.functions.invoke('game-action', {
  body: { action: 'ping' },
});
check(
  !pingErr && pong?.user === me && pong?.engine?.points?.imposterWins === 6,
  'game-action ping runs engine.ts',
  pingErr?.message,
);

// 3. Without a session the function refuses.
const res = await fetch(`${url}/functions/v1/game-action`, {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'ping' }),
});
check(res.status === 401, 'game-action rejects callers who are not signed in', `status ${res.status}`);

// 4. Secrets are unreadable, and direct writes are rejected.
const secrets = await phone.from('game_secrets').select('*');
check(
  secrets.error?.code === '42501',
  'client cannot read game_secrets',
  secrets.error?.message ?? 'no error!',
);
const insert = await phone.from('rooms').insert({ code: 'ZZZZ', host_id: me });
check(
  insert.error?.code === '42501',
  'client cannot write rooms directly',
  insert.error?.message ?? 'no error!',
);
const rooms = await phone.from('rooms').select('*');
check(!rooms.error && rooms.data.length === 0, 'client sees no rooms it is not in');

// 5. Realtime private channels: your own card channel yes, someone else's no.
const subscribe = (topic) =>
  new Promise((resolve) => {
    const ch = phone.channel(topic, { config: { private: true } });
    const timer = setTimeout(() => resolve('TIMEOUT'), 8000);
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') {
        clearTimeout(timer);
        phone.removeChannel(ch);
        resolve(status);
      }
    });
  });
await phone.realtime.setAuth();
check((await subscribe(`player:${me}`)) === 'SUBSCRIBED', 'can join own private card channel');
check(
  (await subscribe('player:00000000-0000-0000-0000-000000000000')) === 'CHANNEL_ERROR',
  "cannot join someone else's card channel",
);
check(
  (await subscribe('room:00000000-0000-0000-0000-000000000000')) === 'CHANNEL_ERROR',
  'cannot join a room channel as a non-member',
);

phone.realtime.disconnect();
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll online checks passed');
process.exit(failed ? 1 : 0);
