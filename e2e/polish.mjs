// M5 in the browser: first-time intro, server-down state, copy/paste of room codes,
// and the privacy page. Run: pnpm export:web && node e2e/serve.mjs dist 8765 & pnpm test:e2e:polish
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:8765';
const b = await chromium.launch();
let failed = 0;
const check = (ok, name) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  if (!ok) failed++;
};
const errors = [];
const shot = (p, name) =>
  process.env.SHOTS ? p.screenshot({ path: `${process.env.SHOTS}/m5-${name}.png` }) : null;
const btn = (p, l) => p.getByRole('button', { name: l, exact: false }).last();
const text = async (p) => (await p.locator('body').innerText()).replace(/\n+/g, ' | ');
const until = async (p, re, ms = 10000) => {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (re.test(await text(p).catch(() => ''))) return true;
    await p.waitForTimeout(250);
  }
  return false;
};
const open = async () => {
  const ctx = await b.newContext({
    ...devices['iPhone 13'],
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  return { ctx, page };
};

// ---------------------------------------------------------------- intro + server check
const { page: host } = await open();
await host.goto(BASE);
await host.waitForTimeout(1500);
await btn(host, 'Play online').click();
check(await until(host, /How it works/), 'first visit shows how online works');
await shot(host, 'intro');
await btn(host, 'Got it').click();
check(!(await until(host, /How it works/, 800)), '"Got it" dismisses the intro');
await host.reload();
await host.waitForTimeout(1500);
check(!/How it works/.test(await text(host)), 'the intro stays dismissed');

// Server unreachable: block the backend for this tab only.
const { ctx: offCtx, page: off } = await open();
await off.route('**/functions/v1/**', (r) => r.abort());
await off.route('**/auth/v1/**', (r) => r.abort());
await off.goto(`${BASE}/online`);
await off.waitForTimeout(1500);
check(await until(off, /Can’t connect/), 'an unreachable server shows a clear message');
check(
  await off.getByRole('button', { name: 'Host' }).isDisabled(),
  'host and join are disabled while offline',
);
await shot(off, 'offline');
await off.unroute('**/functions/v1/**');
await off.unroute('**/auth/v1/**');
await btn(off, 'Try again').click();
check(
  (await until(off, /Host a room/)) && !(await until(off, /Can’t connect/, 1500)),
  'Try again recovers once the server is back',
);
await offCtx.close();

// ---------------------------------------------------------------- copy / paste
await host.getByLabel('Your name').fill('Ana');
await btn(host, 'Host').click();
await host.waitForTimeout(700);
await btn(host, 'Create room').click();
await until(host, /YOUR ROOM/);
const code = (await host.getByLabel(/^Room code /).innerText()).trim();
await btn(host, 'Copy').click();
check(await until(host, /Copied/, 2000), 'Copy confirms');
check((await host.evaluate(() => navigator.clipboard.readText())) === code, 'the code is on the clipboard');

const { page: guest } = await open();
await guest.goto(`${BASE}/online`);
await guest.waitForTimeout(1500);
await guest.getByLabel('Your name').fill('Ben');
await btn(guest, 'Join').click();
await guest.waitForTimeout(500);
// Paste the whole share message, as people actually do.
await guest.evaluate(
  (c) =>
    navigator.clipboard.writeText(
      `Join my Imposter game! Room code ${c}\n\nOpen Imposter → Play online → Join, or tap: imposter://join/${c}`,
    ),
  code,
);
await btn(guest, 'Paste').click();
await guest.waitForTimeout(400);
const pastedValue = await guest.getByLabel('Room code').inputValue();
check(pastedValue === code, 'Paste fills the code (and cleans it up)');
await btn(guest, 'Join').click();
check(await until(host, /2 players/), 'the pasted code joins the room');

// ---------------------------------------------------------------- privacy
await host.goto(`${BASE}/privacy`);
await host.waitForTimeout(1200);
check(
  /What we store/.test(await text(host)) && /deleted automatically 24 hours/.test(await text(host)),
  'the privacy page explains what is stored',
);
await shot(host, 'privacy');

console.log(failed ? `\n${failed} FAILED` : '\nPolish checks passed');
console.log('ERRORS', errors.slice(0, 5));
await b.close();
process.exit(failed ? 1 : 0);
