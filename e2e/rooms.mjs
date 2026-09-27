// Four players in four browser sessions against the local stack (Phase 2, M2).
// Run: pnpm db:start && pnpm export:web && node e2e/serve.mjs dist 8765 & pnpm test:e2e:rooms
import { chromium, devices } from 'playwright';
import { execSync } from 'node:child_process';
const b = await chromium.launch();
const errors = [];
const player = async (label) => {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${label}: ${m.text()}`));
  return page;
};
const btn = (p, l) => p.getByRole('button', { name: l, exact: false }).last();
const text = async (p) => (await p.locator('body').innerText()).replace(/\n+/g, ' | ');
const until = async (p, re, ms = 8000) => {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (re.test(await text(p))) return true;
    await p.waitForTimeout(250);
  }
  return false;
};
const shot = (p, name) =>
  process.env.SHOTS ? p.screenshot({ path: `${process.env.SHOTS}/m2-${name}.png` }) : null;
const db = (sql) =>
  execSync(
    `docker exec -i $(docker ps --format '{{.Names}}' | grep supabase_db) psql -U postgres -tAc "${sql}"`,
    { encoding: 'utf8' },
  ).trim();
let failed = 0;
const check = (ok, name) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) failed++;
};

// Host: home → Play online → name → Host → Create room
const ana = await player('Ana');
await ana.goto('http://localhost:8765/');
await ana.waitForTimeout(1500);
await btn(ana, 'Play online').click();
await ana.getByLabel('Your name').fill('Ana');
await btn(ana, 'Host').click();
await ana.waitForTimeout(600);
await btn(ana, 'Create room').click();
check(await until(ana, /YOUR ROOM/), 'host creates a room and lands in the lobby');
const code = (await ana.getByLabel(/^Room code /).innerText()).trim();
check(/^[A-HJ-KM-NP-Z2-9]{4}$/.test(code), `room code looks right (${code})`);

// Ben joins by typing the code; Cy and Dee open the shared link
const ben = await player('Ben');
await ben.goto('http://localhost:8765/');
await ben.waitForTimeout(1200);
await btn(ben, 'Play online').click();
await ben.getByLabel('Your name').fill('Ben');
await btn(ben, 'Join').click();
await ben.getByLabel('Room code').fill(code.toLowerCase());
await btn(ben, 'Join').click();
check(await until(ben, /LOBBY/), 'player joins by typing the code (lowercase ok)');
const viaLink = async (name) => {
  const p = await player(name);
  await p.goto(`http://localhost:8765/join/${code}`);
  await p.waitForTimeout(1500);
  await p.getByLabel('Your name').fill(name);
  await btn(p, 'Join').click();
  return p;
};
const cy = await viaLink('Cy');
const dee = await viaLink('Dee');
check(await until(dee, /LOBBY/), 'players join from a shared link');
check(await until(ana, /4 players · 4 online/), 'host sees all 4 players online (live presence)');
await shot(ana, 'host-lobby');
await shot(dee, 'player-lobby');
check(/Host/.test(await text(ben)) && /You/.test(await text(ben)), 'lobby shows Host and You badges');

// Non-host can't start; host removes Dee
check(
  !/Start/.test(await text(ben)) && /Waiting for the host/.test(await text(ben)),
  'only the host has Start',
);
await ana.getByRole('button', { name: 'Remove Dee' }).click();
await ana.waitForTimeout(400);
await shot(ana, 'remove-confirm');
await btn(ana, 'Remove').click();
check(await until(dee, /You were removed/), 'removed player is told immediately');
check(await until(ana, /3 players · 3 online/), 'host sees the removal live');

// Cy leaves, then rejoins with the same code
await cy.getByRole('button', { name: 'Leave' }).first().click();
await cy.waitForTimeout(400);
await btn(cy, 'Leave').click();
check(await until(ana, /2 players/), 'leaving updates everyone');
check(await until(ana, /Waiting for 1 more/), 'Start needs 3 players online');
await btn(cy, 'Join').click();
await cy.getByLabel('Room code').fill(code);
await btn(cy, 'Join').click();
check(await until(ana, /3 players · 3 online/), 'player can rejoin with the same code');

// Start: everyone moves to the placeholder
await btn(ana, 'Start').click();
check((await until(ben, /Your card/)) && (await until(cy, /Your card/)), 'Start deals everyone a card');
await shot(ben, 'starting');

// Host leaves: hosting passes to the next seat (Ben)
const room = db(`select id from public.rooms where code='${code}' and status<>'closed'`);
await ana.getByRole('button', { name: 'Leave' }).first().click();
await ana.waitForTimeout(400);
await btn(ana, 'Leave').click();
await ana.waitForTimeout(1200);
const host = db(
  `select p.name from public.rooms r join public.room_players p on p.room_id=r.id and p.user_id=r.host_id where r.id='${room}'`,
);
check(host === 'Ben', `host leaves → hosting passes to the next seat (now ${host})`);

console.log(failed ? `\n${failed} FAILED` : '\nAll lobby checks passed');
console.log('ERRORS', errors.slice(0, 6));
await b.close();
process.exit(failed ? 1 : 0);
