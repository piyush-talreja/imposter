// game-action: the one server entry point for online game actions (M3 adds
// start, clue, suspect, vote, guess). It runs the same engine.ts as the app, so
// offline and online games follow identical rules.
//
// M1 ships only `ping`, which proves: the caller is signed in, and the shared
// engine loads on the server.
import { createClient } from '@supabase/supabase-js';

import { MIN_PLAYERS, POINTS } from '@/features/game/engine.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Identify the caller from their own token; never trust an id in the body.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: 'not_signed_in' }, 401);

  const body = await req.json().catch(() => ({}));
  switch (body?.action) {
    case 'ping':
      return json({ ok: true, user: data.user.id, engine: { minPlayers: MIN_PLAYERS, points: POINTS } });
    default:
      return json({ error: 'unknown_action' }, 400);
  }
});
