// game-action: the referee for online games (Phase 2, M3). It runs the same
// engine.ts / online.ts as the app, so offline and online games follow identical
// rules. The full state (roles, word, votes) lives in game_secrets, which only
// this function can read; members see games.public_state, and each player gets
// their own card in the response to their own signed-in request.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { POINTS, MIN_PLAYERS, totalPoints } from '@/features/game/engine.ts';
import {
  OnlineError,
  castVote,
  continueGame,
  guess,
  leave,
  markSeen,
  myCard,
  openVote,
  publicView,
  skipTurn,
  stamp,
  startOnline,
  submitClue,
  suspect,
  timeout,
  type OnlineState,
} from '@/features/game/online.ts';
import { WORDS, categoryName } from '@/features/words/words.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

class ActionError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

type Ctx = { admin: SupabaseClient; user: SupabaseClient; me: string; roomId: string };

type Room = {
  host_seen_at: string;
  id: string;
  host_id: string;
  status: string;
  settings: Record<string, unknown>;
  current_game: string | null;
  scores: Record<string, number>;
};

async function loadRoom(ctx: Ctx): Promise<Room> {
  const { data, error } = await ctx.admin
    .from('rooms')
    .select('id, host_id, status, settings, current_game, scores, host_seen_at')
    .eq('id', ctx.roomId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ActionError('room_not_found', 404);
  // The caller must be an active member.
  const { data: member } = await ctx.admin
    .from('room_players')
    .select('user_id')
    .eq('room_id', ctx.roomId)
    .eq('user_id', ctx.me)
    .is('left_at', null)
    .eq('kicked', false)
    .maybeSingle();
  if (!member) throw new ActionError('not_a_member', 403);
  return data as Room;
}

const requireHost = (room: Room, me: string) => {
  if (room.host_id !== me) throw new ActionError('not_host', 403);
};

async function notify(ctx: Ctx, event: 'room_updated' | 'game_updated') {
  await ctx.admin.rpc('server_notify', { p_room: ctx.roomId, p_event: event });
}

async function start(ctx: Ctx) {
  // start_game (M2) checks host, lobby and player count, and flips the room to playing.
  const { error } = await ctx.user.rpc('start_game', { p_room: ctx.roomId });
  if (error) throw new ActionError(error.message);

  const room = await loadRoom(ctx);
  const { data: players, error: pErr } = await ctx.admin
    .from('room_players')
    .select('user_id, name, seat')
    .eq('room_id', ctx.roomId)
    .is('left_at', null)
    .eq('kicked', false)
    .order('seat');
  if (pErr) throw pErr;
  if (!players || players.length < MIN_PLAYERS) throw new ActionError('not_enough_players');

  const settings = room.settings as never;
  const state = startOnline({
    players: players.map((p) => ({ id: p.user_id, name: p.name })),
    settings,
    mode: (room.settings.clueMode as 'typed' | 'spoken') ?? 'typed',
    timers: {
      clue: (room.settings.clueSeconds as number | null) ?? null,
      vote: (room.settings.voteSeconds as number | null) ?? null,
    },
    words: WORDS,
    usedWords: [],
    history: {},
  });

  const view = { ...publicView(state), serverTime: Date.now() };
  const { data: game, error: gErr } = await ctx.admin
    .from('games')
    .insert({ room_id: ctx.roomId, round: view.round, phase: view.phase, public_state: view })
    .select('id')
    .single();
  if (gErr) throw gErr;
  const { error: sErr } = await ctx.admin.from('game_secrets').insert({
    game_id: game.id,
    word: state.game.word,
    cousin: state.game.cousin,
    roles: state.game.roles,
    state,
  });
  if (sErr) throw sErr;
  await ctx.admin.from('rooms').update({ current_game: game.id }).eq('id', ctx.roomId);
  await notify(ctx, 'game_updated');
  return { ok: true, gameId: game.id };
}

/**
 * Apply one change to the current game. Optimistic concurrency: the write only
 * lands if nobody else changed the game since we read it; otherwise re-read and
 * re-apply (so two votes arriving together are both counted).
 */
async function apply(ctx: Ctx, room: Room, change: (s: OnlineState) => OnlineState) {
  if (!room.current_game) throw new ActionError('no_game');
  // Up to 20 players can act at the same instant (e.g. everyone voting), and each
  // round of conflicts has one winner, so retry plenty, with a short random
  // backoff that spreads the retries out.
  for (let attempt = 0; attempt < 40; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 5 + Math.random() * 20 * Math.min(attempt, 5)));
    const { data: secret, error } = await ctx.admin
      .from('game_secrets')
      .select('state, version')
      .eq('game_id', room.current_game)
      .single();
    if (error) throw error;
    const before = secret.state as OnlineState;
    // Every change (re)sets the clue / vote timers where needed.
    const after = stamp(before, change(before), Date.now());
    if (after === before) return { ok: true }; // nothing changed (e.g. leaving when already out)

    const { data: written, error: wErr } = await ctx.admin
      .from('game_secrets')
      .update({ state: after, version: secret.version + 1 })
      .eq('game_id', room.current_game)
      .eq('version', secret.version)
      .select('game_id');
    if (wErr) throw wErr;
    if (!written?.length) continue; // someone else got there first; try again

    const view = { ...publicView(after), serverTime: Date.now() };
    await ctx.admin
      .from('games')
      .update({ round: view.round, phase: view.phase, public_state: view })
      .eq('id', room.current_game);

    // Bank this game's points into the room's running totals, exactly once.
    if (after.phase === 'over' && before.phase !== 'over' && view.reveal) {
      const scores = { ...room.scores };
      for (const [id, lines] of Object.entries(view.reveal.points))
        scores[id] = (scores[id] ?? 0) + totalPoints(lines);
      await ctx.admin.from('rooms').update({ scores }).eq('id', ctx.roomId);
    }
    await notify(ctx, 'game_updated');
    return { ok: true };
  }
  throw new ActionError('busy_try_again', 409);
}

async function myCardAction(ctx: Ctx, room: Room) {
  if (!room.current_game) throw new ActionError('no_game');
  const { data, error } = await ctx.admin
    .from('game_secrets')
    .select('state')
    .eq('game_id', room.current_game)
    .single();
  if (error) throw error;
  return { card: myCard(data.state as OnlineState, ctx.me, room.settings as never, categoryName) };
}

/** How long the host can be silent before someone else may take over. */
const HOST_GRACE_MS = 45_000;

async function heartbeat(ctx: Ctx, room: Room) {
  requireHost(room, ctx.me);
  await ctx.admin.from('rooms').update({ host_seen_at: new Date().toISOString() }).eq('id', ctx.roomId);
  return { ok: true };
}

async function claimHost(ctx: Ctx, room: Room) {
  if (room.host_id === ctx.me) return { ok: true };
  if (Date.now() - new Date(room.host_seen_at).getTime() < HOST_GRACE_MS)
    throw new ActionError('host_still_here', 409);
  // Only succeeds if nobody else claimed it first.
  const { data } = await ctx.admin
    .from('rooms')
    .update({ host_id: ctx.me, host_seen_at: new Date().toISOString() })
    .eq('id', ctx.roomId)
    .eq('host_id', room.host_id)
    .select('id');
  if (!data?.length) throw new ActionError('host_still_here', 409);
  await notify(ctx, 'room_updated');
  return { ok: true };
}

/** Leave (or be removed): drop out of the game in progress first, then the room. */
async function leaveRoom(ctx: Ctx, room: Room, who: string) {
  if (room.status === 'playing' && room.current_game) await apply(ctx, room, (s) => leave(s, who));
  const { error } =
    who === ctx.me
      ? await ctx.user.rpc('leave_room', { p_room: ctx.roomId })
      : await ctx.user.rpc('kick_player', { p_room: ctx.roomId, p_user: who });
  if (error) throw new ActionError(error.message);
  return { ok: true };
}

async function backToLobby(ctx: Ctx, room: Room) {
  requireHost(room, ctx.me);
  if (room.status !== 'playing') throw new ActionError('not_playing');
  await ctx.admin.from('rooms').update({ status: 'lobby' }).eq('id', ctx.roomId);
  await ctx.admin.from('room_players').update({ waiting: false }).eq('room_id', ctx.roomId);
  await notify(ctx, 'room_updated');
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  // Identify the caller from their own token; never trust an id in the body.
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth, error: authErr } = await user.auth.getUser();
  if (authErr || !auth.user) return json({ error: 'not_signed_in' }, 401);

  const body = await req.json().catch(() => ({}));
  if (body?.action === 'ping') {
    return json({ ok: true, user: auth.user.id, engine: { minPlayers: MIN_PLAYERS, points: POINTS } });
  }
  if (typeof body?.roomId !== 'string') return json({ error: 'room_required' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const ctx: Ctx = { admin, user, me: auth.user.id, roomId: body.roomId };

  try {
    if (body.action === 'start') return json(await start(ctx));
    const room = await loadRoom(ctx);
    const me = ctx.me;
    switch (body.action) {
      case 'my-card':
        return json(await myCardAction(ctx, room));
      case 'seen':
        return json(await apply(ctx, room, (s) => markSeen(s, me)));
      case 'clue':
        return json(await apply(ctx, room, (s) => submitClue(s, me, String(body.text ?? ''))));
      case 'suspect':
        return json(await apply(ctx, room, (s) => suspect(s, me, body.clueBy ?? null)));
      case 'vote':
        return json(await apply(ctx, room, (s) => castVote(s, me, String(body.target ?? ''))));
      case 'guess':
        return json(await apply(ctx, room, (s) => guess(s, me, String(body.text ?? ''))));
      case 'skip':
        requireHost(room, me);
        return json(await apply(ctx, room, skipTurn));
      case 'open-vote':
        requireHost(room, me);
        return json(await apply(ctx, room, openVote));
      case 'continue':
        requireHost(room, me);
        return json(await apply(ctx, room, continueGame));
      case 'back-to-lobby':
        return json(await backToLobby(ctx, room));
      case 'tick':
        // Anyone may ask; the server's clock decides whether time is really up.
        return json(await apply(ctx, room, (s) => timeout(s, Date.now())));
      case 'leave':
        return json(await leaveRoom(ctx, room, me));
      case 'kick':
        requireHost(room, me);
        if (typeof body.target !== 'string' || body.target === me) throw new ActionError('cannot_kick_self');
        return json(await leaveRoom(ctx, room, body.target));
      case 'heartbeat':
        return json(await heartbeat(ctx, room));
      case 'claim-host':
        return json(await claimHost(ctx, room));
      default:
        return json({ error: 'unknown_action' }, 400);
    }
  } catch (e) {
    if (e instanceof OnlineError || e instanceof ActionError) {
      return json({ error: e.code }, e instanceof ActionError ? e.status : 400);
    }
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
});
