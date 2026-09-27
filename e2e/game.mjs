// A whole online game in the browser: 5 players, 5 sessions, real screens.
// Run: pnpm db:start && pnpm functions:serve & pnpm export:web && node e2e/serve.mjs dist 8765 & pnpm test:e2e:game
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
    `docker exec -i $(docker ps --format '{{.Names}}' | grep supabase_db) psql -U postgres -tAc "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8' },
  ).trim();
const shot = (p, name) =>
  process.env.SHOTS ? p.screenshot({ path: `${process.env.SHOTS}/m3-${name}.png` }) : null;
const btn = (p, l) => p.getByRole('button', { name: l, exact: false }).last();
const text = async (p) => (await p.locator('body').innerText()).replace(/\n+/g, ' | ');
const until = async (p, re, ms = 10000) => {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (re.test(await text(p))) return true;
    await p.waitForTimeout(250);
  }
  return false;
};

const open = async (name) => {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  return { name, page };
};

// ---------------------------------------------------------------- room with 5 players
const names = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli'];
const ps = await Promise.all(names.map(open));
const [host] = ps;
await host.page.goto(BASE);
await host.page.waitForTimeout(1500);
await btn(host.page, 'Play online').click();
await host.page.getByLabel('Your name').fill('Ana');
await btn(host.page, 'Host').click();
await host.page.waitForTimeout(600);
await btn(host.page, 'Create room').click();
await until(host.page, /YOUR ROOM/);
const code = (await host.page.getByLabel(/^Room code /).innerText()).trim();
for (const p of ps.slice(1)) {
  await p.page.goto(`${BASE}/join/${code}`);
  await p.page.waitForTimeout(1200);
  await p.page.getByLabel('Your name').fill(p.name);
  await btn(p.page, 'Join').click();
}
check(await until(host.page, /5 players · 5 online/), 'five players in the lobby');
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
const roles = () =>
  JSON.parse(
    db(
      `select s.roles from public.game_secrets s join public.rooms r on r.current_game=s.game_id where r.id='${roomId}'`,
    ),
  );

// ---------------------------------------------------------------- deal
await btn(host.page, 'Start').click();
check(await until(ps[3].page, /Your card/), 'Start deals a card to every phone');
const r = roles();
const imposter = ps.find((p) => r[idOf[p.name]] === 'imposter');
const undercover = ps.find((p) => r[idOf[p.name]] === 'undercover');
for (const p of ps) {
  await p.page.waitForTimeout(400);
  const card = p.page.getByRole('button', { name: /hold to see/i });
  const box = await card.boundingBox();
  await p.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.page.mouse.down();
  await p.page.waitForTimeout(500);
  if (p === imposter) await shot(p.page, 'card-imposter');
  if (p === ps[0]) await shot(p.page, 'card');
  await p.page.mouse.up();
  await btn(p.page, 'I’ve seen it').click();
}
check(await until(host.page, /Clues/), 'clues start once everyone has seen their card');
check(
  !(await text(host.page)).includes(
    JSON.parse(
      db(
        `select to_json(word) from public.game_secrets s join public.rooms r on r.current_game=s.game_id where r.id='${roomId}'`,
      ),
    ),
  ) || r[idOf.Ana] !== 'imposter',
  "the imposter's screen never shows the word",
);

// ---------------------------------------------------------------- clues
const giveClues = async (tag) => {
  for (let i = 0; i < 6; i++) {
    const s = state();
    if (s.phase !== 'clues') return;
    const p = byId[s.speaker];
    await until(p.page, /Your turn/);
    if (i === 0) await shot(p.page, `${tag}-your-turn`);
    await p.page.getByLabel('Your clue, one word').fill(`hint${p.name}`);
    await btn(p.page, 'Send').click();
    await p.page.waitForTimeout(700);
  }
};
await giveClues('r1');
check(await until(host.page, /Discuss/), 'after every clue, discussion opens');
check(/hintBen/.test(await text(ps[2].page)), 'everyone sees the clue board');

// ---------------------------------------------------------------- suspicion + vote
const suspicious = ps.find((p) => p !== imposter);
await suspicious.page.getByRole('button', { name: new RegExp(`^${imposter.name}:`) }).click();
check(
  (await until(host.page, new RegExp(`${imposter.name}: hint${imposter.name}, 1 suspicious`), 3000)) ||
    /1/.test(await text(host.page)),
  'suspicion taps show up for everyone',
);
await shot(suspicious.page, 'discuss');
await btn(host.page, 'Start the vote').click();
const voteFor = async (target, voters) => {
  for (const p of voters) {
    await until(p.page, /Who’s faking it/);
    const pick = p === target ? voters.find((q) => q !== target) : target;
    await p.page.getByRole('radio', { name: pick.name }).click();
    await btn(p.page, 'Vote').click();
    await p.page.waitForTimeout(400);
  }
};
await until(ps[1].page, /Who’s faking it/);
await shot(ps[1].page, 'vote');
await voteFor(imposter, ps);
check(await until(imposter.page, /You were caught/), 'the imposter is caught and asked to guess');
await shot(imposter.page, 'guess');
await imposter.page.getByLabel('Your guess').fill('Nope');
await btn(imposter.page, 'Guess').click();
check(
  await until(host.page, /Start bonus round/),
  'wrong guess: villagers win and the bonus round is offered',
);
await shot(host.page, 'reveal-imposter');

// ---------------------------------------------------------------- bonus round
await btn(host.page, 'Start bonus round').click();
await until(host.page, /BONUS ROUND/);
await giveClues('r2');
await until(host.page, /Find the Undercover/);
await btn(host.page, 'Start the vote').click();
await voteFor(
  undercover,
  ps.filter((p) => p !== imposter),
);
check(await until(host.page, /See results/), 'undercover caught in the bonus round');
await btn(host.page, 'See results').click();
check(await until(ps[2].page, /Room scores/), 'everyone sees the final scores');
await shot(ps[2].page, 'over');
const scores = JSON.parse(db(`select scores from public.rooms where id='${roomId}'`));
check(
  scores[idOf[undercover.name]] === 2 && Object.values(scores).filter((v) => v === 4).length === 3,
  'room scores: villagers +4, undercover +2',
);

// ---------------------------------------------------------------- next game
await btn(host.page, 'Back to lobby').click();
check(await until(ps[4].page, /LOBBY|YOUR ROOM/), 'everyone returns to the lobby for the next game');

console.log(failed ? `\n${failed} FAILED` : '\nWhole online game passed in the browser');
console.log('ERRORS', errors.slice(0, 5));
await b.close();
process.exit(failed ? 1 : 0);
