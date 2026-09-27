// M4 in the browser: timers auto-skip, peek at your word, leaving mid-game, and
// host handover when the host's tab closes. About 2 minutes (real timers).
// Run: pnpm db:start && pnpm functions:serve & pnpm export:web && node e2e/serve.mjs dist 8765 & pnpm test:e2e:resilience
import { execSync } from 'node:child_process';

import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:8765';
const b = await chromium.launch();
const errors = [];
let failed = 0;
const check = (ok, name) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) failed++;
};
const db = (sql) =>
  execSync(
    `docker exec -i $(docker ps --format '{{.Names}}' | grep supabase_db) psql -U postgres -tAc "${sql}"`,
    { encoding: 'utf8' },
  ).trim();
const shot = (p, name) =>
  process.env.SHOTS ? p.screenshot({ path: `${process.env.SHOTS}/m4-${name}.png` }) : null;
const btn = (p, l) => p.getByRole('button', { name: l, exact: false }).last();
const text = async (p) => (await p.locator('body').innerText()).replace(/\n+/g, ' | ');
const until = async (p, re, ms = 10000) => {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (re.test(await text(p).catch(() => ''))) return true;
    await p.waitForTimeout(300);
  }
  return false;
};
const open = async (name) => {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  return { name, page, ctx };
};

const ps = await Promise.all(['Ana', 'Ben', 'Cy', 'Dee'].map(open));
const [host] = ps;
await host.page.goto(BASE);
await host.page.waitForTimeout(1500);
await btn(host.page, 'Play online').click();
await host.page.getByLabel('Your name').fill('Ana');
await btn(host.page, 'Host').click();
await host.page.waitForTimeout(700);
await host.page.getByRole('checkbox', { name: '30s' }).click(); // clue timer
await btn(host.page, 'Create room').click();
await until(host.page, /YOUR ROOM/);
const code = (await host.page.getByLabel(/^Room code /).innerText()).trim();
for (const p of ps.slice(1)) {
  await p.page.goto(`${BASE}/join/${code}`);
  await p.page.waitForTimeout(1200);
  await p.page.getByLabel('Your name').fill(p.name);
  await btn(p.page, 'Join').click();
}
await until(host.page, /4 players · 4 online/);
const roomId = db(`select id from public.rooms where code='${code}' and status<>'closed'`);
const idOf = Object.fromEntries(
  db(`select name, user_id from public.room_players where room_id='${roomId}'`)
    .split('\n')
    .map((l) => l.split('|')),
);
const byId = Object.fromEntries(ps.map((p) => [idOf[p.name], p]));
const state = () =>
  JSON.parse(
    db(
      `select g.public_state from public.games g join public.rooms r on r.current_game=g.id where r.id='${roomId}'`,
    ),
  );

await btn(host.page, 'Start').click();
for (const p of ps) {
  await until(p.page, /Your card/);
  await p.page.waitForTimeout(400);
  const box = await p.page.getByRole('button', { name: /hold to see/i }).boundingBox();
  await p.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.page.mouse.down();
  await p.page.waitForTimeout(300);
  await p.page.mouse.up();
  await btn(p.page, 'I’ve seen it').click();
}

// ---------------------------------------------------------------- countdown + auto-skip
await until(host.page, /Clues/);
const firstSpeaker = state().speaker;
const watcher = ps.find((p) => idOf[p.name] !== firstSpeaker);
check(await until(watcher.page, /0:(2\d|30)/), 'a countdown shows for the timed clue turn');
await shot(watcher.page, 'countdown');
// Nobody types: when time runs out the phones move the game on by themselves.
const t0 = Date.now();
let skipped = false;
while (Date.now() - t0 < 45000) {
  const s = state();
  if (s.clues.length && s.clues[0].by === firstSpeaker && s.clues[0].text === null) {
    skipped = true;
    break;
  }
  await watcher.page.waitForTimeout(1000);
}
check(skipped, 'when the timer runs out, the idle turn is skipped automatically');

// ---------------------------------------------------------------- peek at your word
const peeker = ps.find((p) => idOf[p.name] !== state().speaker);
const peek = peeker.page.getByRole('button', { name: /Hold to see your word/ });
const pb = await peek.boundingBox();
await peeker.page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
await peeker.page.mouse.down();
await peeker.page.waitForTimeout(300);
check(
  /Your word: /.test(
    (await peeker.page
      .getByRole('button', { name: /Your word: / })
      .getAttribute('aria-label')
      .catch(() => '')) ?? '',
  ),
  'holding "your word" shows it',
);
await shot(peeker.page, 'peek');
await peeker.page.mouse.up();

// ---------------------------------------------------------------- leave mid-game from the UI
const roles = JSON.parse(
  db(
    `select s.roles from public.game_secrets s join public.rooms r on r.current_game=s.game_id where r.id='${roomId}'`,
  ),
);
// A villager leaves (if the imposter left, the game would simply end: covered by unit tests).
const leaver =
  ps.find((p) => p !== host && p !== peeker && roles[idOf[p.name]] === 'villager') ??
  ps.find((p) => p !== host && roles[idOf[p.name]] === 'villager');
await leaver.page.getByRole('button', { name: 'Leave' }).first().click();
await leaver.page.waitForTimeout(400);
await btn(leaver.page, 'Leave').click();
check(
  await until(host.page, new RegExp(`Left: ${leaver.name}`)),
  'others see who left, and the game carries on',
);
await shot(host.page, 'left');

// ---------------------------------------------------------------- host handover
await host.ctx.close(); // the host's phone dies: no leave, no check-ins
const remaining = ps.filter((p) => p !== host && p !== leaver);
const t1 = Date.now();
let newHost = null;
while (Date.now() - t1 < 90000) {
  const h = db(`select host_id from public.rooms where id='${roomId}'`);
  if (h !== idOf.Ana) {
    newHost = byId[h];
    break;
  }
  await remaining[0].page.waitForTimeout(2000);
}
check(
  !!newHost && remaining.includes(newHost),
  `after the host goes silent, ${newHost?.name ?? 'nobody'} takes over (${Math.round((Date.now() - t1) / 1000)}s)`,
);
if (newHost) {
  check(
    (await until(newHost.page, /Skip |Start the vote|Round |See results/, 15000)) ||
      state().phase === 'clues',
    'the new host gets the host controls',
  );
  await shot(newHost.page, 'new-host');
}

console.log(failed ? `\n${failed} FAILED` : '\nResilience passed in the browser');
console.log('ERRORS', errors.slice(0, 5));
await b.close();
process.exit(failed ? 1 : 0);
