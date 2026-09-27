# Phase 2: Online private rooms

Status: **M1 done**, M2 next. Decision records: [ADR 0004](decisions/0004-online-rooms-on-supabase.md), [ADR 0005](decisions/0005-remote-clues-without-chat.md).

## Goal

Friends play on their own phones, together or apart. A host creates a private room and shares a code, link or QR code; others join; the game plays exactly like pass-and-play, except each player sees their word and votes on their own phone.

Pass-and-play stays as it is. Online is an extra mode.

## Ground rule

**No phone ever receives another player's secret word or role, not even the host's.** Anything a phone receives can be read by anyone inspecting its network traffic, so the server deals the cards and judges votes and guesses, and each phone receives only its own card.

## Decisions

| Topic             | Decision                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Backend           | **Supabase only**: Postgres for trusted state, Realtime for everything live, Edge Functions for game actions, anonymous auth   |
| Accounts          | None. Anonymous sign-in; a player is just a name                                                                               |
| Clues             | The host picks per room: **Typed** (clues on a shared clue board) or **Spoken** (on a call or in person; the app tracks turns) |
| Remote discussion | **Suspicion taps** on clues. No chat ([ADR 0005](decisions/0005-remote-clues-without-chat.md))                                 |
| Voting            | Private, on each phone. Most votes is out. **A tie means nobody is out**; play another round of clues                          |
| Timers            | Optional, set by the host: clue (e.g. 30 s) and vote (e.g. 60 s). Off by default                                               |
| Scores            | Per room session; deleted with the room                                                                                        |
| Room lifetime     | Deleted 24 h after creation                                                                                                    |
| Room size         | 3–20 players                                                                                                                   |
| Late joiners      | May join mid-game as **waiting**, and are dealt into the next game                                                             |

## Architecture

```
 phones (Expo app)                                 Supabase
┌──────────────────┐   anonymous sign-in      ┌──────────────────────────┐
│ online screens   │ ───────────────────────▶ │ Auth                     │
│ useRoom()        │                          ├──────────────────────────┤
│ useGame()        │ ── RPC: create/join/ ──▶ │ Postgres (small, trusted)│
│                  │    leave/kick/settings   │  rooms, room_players,    │
│                  │                          │  games, game_secrets     │
│                  │ ── invoke: start/clue/ ▶ │ Edge Function game-action│
│                  │    suspect/vote/guess    │  runs shared engine.ts   │
│                  │                          ├──────────────────────────┤
│                  │ ◀── Presence ─────────── │ Realtime                 │
│                  │ ◀── Broadcast (public) ─ │  room:{id}  (members)    │
│                  │ ◀── Broadcast (private)─ │  player:{uid} (self only)│
└──────────────────┘                          └──────────────────────────┘
```

What lives where:

| Supabase feature                       | Stored? | Used for                                                                              |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| **Postgres tables**                    | yes     | Only what must be trusted or survive a reconnect: rooms, players, game state, secrets |
| **Realtime Presence**                  | no      | Who's in the room and online                                                          |
| **Realtime Broadcast, `room:{id}`**    | no      | Public events: turn changes, clues, suspicion counts, "3 of 5 voted", reveals         |
| **Realtime Broadcast, `player:{uid}`** | no      | That player's own card. Private-channel authorization lets only them listen           |
| **Edge Function `game-action`**        | no      | Validates the caller, runs the shared `engine.ts`, writes state, broadcasts results   |
| **Postgres functions (RPC)**           | yes     | Room management: create, join, leave, kick, update settings                           |
| **pg_cron**                            | n/a     | Delete expired rooms every hour                                                       |

### Sharing the engine

`src/features/game/engine.ts` is pure TypeScript with no React, so the Edge Function (Deno) imports it directly. Offline and online games therefore follow exactly the same rules and scoring, and the existing tests cover both. The small online additions (typed clues, suspicion, secret votes, ties) go into the engine with tests, not into the function.

## Data model

All tables have row-level security (RLS) **on**. Phones never insert, update or delete directly; every change goes through an RPC or the Edge Function.

| Table          | Columns                                                                                                                                  | Who can read                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `rooms`        | `id`, `code` (unique among active rooms), `host_id`, `status` (`lobby`/`playing`/`closed`), `settings` jsonb, `created_at`, `expires_at` | Room members                                                                           |
| `room_players` | `room_id`, `user_id`, `name`, `seat`, `joined_at`, `left_at`, `kicked`, `waiting`                                                        | Room members                                                                           |
| `games`        | `id`, `room_id`, `round`, `phase`, `public_state` jsonb (turn order, eliminated, clues, suspicion counts, vote count, winner, scores)    | Room members                                                                           |
| `game_secrets` | `game_id`, `word`, `cousin`, `roles` jsonb, `votes` jsonb                                                                                | **Nobody**: no RLS policy exists, so only the service role (Edge Function) can read it |

Each player's card is never stored per player. The Edge Function derives it from `game_secrets` and sends it on `player:{uid}`. On reconnect, the phone asks the function to resend it (`action: 'my-card'`).

## Room codes, links and sharing

- **Code:** 4 characters from an unambiguous alphabet (no `0/O`, `1/I/L`): about 810,000 combinations. Not case-sensitive, and pasting works.
- **Link:** `imposter://join/K7QX` (a web URL once the web version is hosted). In Expo Go during development: `exp://…/--/join/K7QX`.
- **QR:** `react-native-qrcode-svg` (builds on `react-native-svg`, which the app already uses).
- **Share:** the phone's share sheet, with "Join my Imposter game: K7QX" plus the link.

## Security model

| Threat                              | Mitigation                                                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reading someone else's card or role | Secrets live in `game_secrets` with no client policy; cards go only to `player:{uid}`, and Realtime authorization allows only that user to join the channel |
| Host sees the roles                 | The host is just a player: same channels, same card                                                                                                         |
| Tampering with game state           | No client writes; the Edge Function validates every action against the engine (right phase, right turn, caller is alive, one vote each)                     |
| Reading another room                | RLS: members only. Realtime `room:{id}` is authorized for members only                                                                                      |
| Spam rooms and joins                | `create_room` max 5/min per user; `join_room` max 20/min per user                                                                                           |
| Abuse in names and clues            | Length limits; the host can remove players; clues are one word, max 24 characters                                                                           |
| Stale data                          | Rooms deleted 24 h after creation by pg_cron                                                                                                                |

The anon key in the app is public by design. RLS and the functions protect the data.

## Milestones

Each milestone ships as its own PR, and is playable or testable before the next starts.

| #      | Milestone          | Outcome                                                                                                                                            |
| ------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1** | Backend foundation | Supabase project, local dev, schema + RLS, anonymous auth, Realtime authorization, tests proving no one can read secrets                           |
| **M2** | Rooms & lobby      | Create/join by code, link or QR; live lobby with presence; host controls; start moves everyone to a placeholder                                    |
| **M3** | Online game loop   | Server-dealt cards, clue turns (typed or spoken), clue board, suspicion taps, private voting with ties, reveal and guess, bonus round, room scores |
| **M4** | Resilience         | Reconnect mid-game, host handover on disconnect, timers and AFK auto-skip, expired-room cleanup                                                    |
| **M5** | Polish & release   | Onboarding, share flows, error and offline states, 20-player load test, store builds                                                               |

### M1: Backend foundation

| #   | Task                                                                                                            | Size |
| --- | --------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `supabase init`; local stack with `supabase start` (Docker); `.env.example` updated                             | S    |
| 2   | Migration: tables above, RLS on everywhere, member-read policies, no client write policies                      | M    |
| 3   | Realtime authorization policies: `room:{id}` for members, `player:{uid}` for that user only                     | M    |
| 4   | Anonymous sign-in in the app (`@supabase/supabase-js`, session persisted in AsyncStorage)                       | S    |
| 5   | Edge Function skeleton `game-action` importing the shared engine; a `ping` action                               | S    |
| 6   | pgTAP tests (`supabase test db`): non-member can't read; nobody can read `game_secrets`; direct writes rejected | M    |
| 7   | CI: run the database tests with the Supabase CLI in GitHub Actions                                              | S    |

**Done when:** the local stack runs with one command, the app signs in anonymously, and the tests prove secrets are unreadable from a client.

**Shipped.** 24 pgTAP tests, verified by a mutation check (weakening the rules makes the secret and channel tests fail), plus 9 end-to-end checks in `supabase/tests/smoke.mjs`. Notes for later milestones:

- The Edge Function imports the app's `engine.ts` through an import map (`supabase/functions/game-action/deno.json`). Deno needs explicit `.ts` paths, so anything the engine imports at runtime must be mapped there; `engine.ts` imports only types from `words.ts`.
- Realtime rules live in SQL helpers (`can_receive`, `can_send`), so they can be unit-tested directly.

### M2: Rooms & lobby

**Flows**

- **Host:** Home → Play online → Host a room → name (first time, remembered) → room settings (today's setup minus the player list, plus clue mode and timers) → lobby.
- **Join:** Home → Play online → Join a room → code, or open a shared link or scan the QR → name → lobby.
- **Lobby:** big code with Share and QR; players with character avatars, online dot, Host badge and You marker. The host can edit settings, remove players, and **Start** (3+ online). Others see "Waiting for the host". Leave asks for confirmation.

**Room functions (Postgres RPC, `security definer`)**

| Function                             | Caller           | Does                                                                                                                                      |
| ------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `create_room(name, settings)`        | signed in        | Generates a unique code, creates the room, and seats the host                                                                             |
| `join_room(code, name)`              | signed in        | Checks it exists, isn't full, and they weren't kicked; resolves duplicate names; safe to repeat; marks `waiting` if a game is in progress |
| `leave_room(room_id)`                | member           | Marks them as left. If the host leaves, the next seat becomes host. If the room is empty, it closes                                       |
| `kick_player(room_id, user_id)`      | host             | Removes the player, and blocks rejoining                                                                                                  |
| `update_settings(room_id, settings)` | host, lobby only | Validates against the engine's caps (roles, clue mode, timers)                                                                            |
| `start_game(room_id)`                | host             | Checks 3+ online players; sets status to `playing`. M2 stops here; M3 deals                                                               |

**App**

| Piece                                              | Location                                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Supabase client, auth                              | `src/features/online/client.ts`                                                                                             |
| RPC wrappers, error mapping                        | `src/features/online/rooms.ts`                                                                                              |
| `useRoom(id)`: members, presence, settings, status | `src/features/online/useRoom.ts`                                                                                            |
| Screens                                            | `src/app/online/index.tsx` (host or join), `host.tsx`, `join.tsx`, `room/[code].tsx` (lobby), `join/[code].tsx` (deep link) |

**Edge cases**

| Situation              | Behaviour                                                       |
| ---------------------- | --------------------------------------------------------------- |
| Wrong code             | "No room with that code"                                        |
| Full (20)              | "This room is full"                                             |
| Game in progress       | Joins as waiting: "You'll join the next game"                   |
| Duplicate name         | "Ana" becomes "Ana 2" (editable)                                |
| Removed by the host    | "The host removed you", then back to Home                       |
| Room closed or expired | "This room has closed"                                          |
| Offline                | "Offline, reconnecting…" banner; the lobby resyncs on reconnect |
| Host closes the app    | Shown offline, stays host (handover on disconnect is M4)        |

**Tests:** pgTAP for every RPC rule; unit tests for code generation and name rules; a Playwright test with 4 browser contexts: host creates, 3 join by code, presence shows all 4, host kicks one, one leaves, host leaves and hosting passes to the next seat.

**Done when:** 4 phones join one room by code, link or QR and see each other within about a second; host-only actions are enforced by the server; pass-and-play is untouched and all existing tests pass.

### M3: Online game loop (outline)

- **Deal:** `start` → the function assigns roles with the engine, stores `game_secrets`, and sends each card on `player:{uid}`. Same hold-to-reveal UI.
- **Clues:** `public_state` holds the turn order. Typed mode: the current player submits one word (validated: one word, not the secret word, max 24 characters) and it's broadcast to the clue board. Spoken mode: the current player taps "Done".
- **Suspicion:** during discussion, each player can mark up to one suspicious clue per round; counts are broadcast.
- **Vote:** private votes to the function; "N of M voted" is broadcast; when complete, it tallies. Most votes is eliminated; **a tie means nobody is out** and another clue round starts.
- **Reveal / guess / bonus round / scores:** the existing engine rules and points (Imposter wins +6; Imposter caught +2 everyone else; bonus Undercover caught +2 each Villager; Undercover gets away +4). Scores accumulate per room.

### M4: Resilience (outline)

Rejoin with the same anonymous user and resync from `public_state` plus `my-card`; host handover when the host's presence drops for 30 s; timers enforced by the function (a missed clue is a skip, a missed vote is an abstain); pg_cron deletes rooms past `expires_at`.

## Testing strategy

- **Engine:** existing unit tests, plus new cases for typed-clue validation, suspicion and ties.
- **Database:** pgTAP for RLS and every RPC rule.
- **Edge Function:** Deno tests for each action (wrong phase, wrong turn, double vote, dead voter).
- **End to end:** Playwright with one browser context per player (4–6) against the local Supabase stack.

## Costs and limits (Supabase free tier)

Plenty for a hobby game: 500 MB database, generous Realtime quotas, 500k Edge Function invocations a month. Free projects **pause after a week of inactivity** (the first request wakes them). Check the current limits on supabase.com/pricing before launch.

## Where to build

Build on a personal laptop: the local Supabase stack needs Docker, and a personal project should stay off work machines. You'll need a free Supabase account; create the project yourself and put its URL and anon key in `.env`.
