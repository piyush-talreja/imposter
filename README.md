# Imposter 🕵️

A pass-and-play party word game for iOS, Android and the web. Everyone gets the secret word except the imposter. Take turns giving one-word clues, bluff your way through, then vote to unmask the imposter.

**3+ players · one phone · 10–20 minutes · works offline**

**Play it now:** https://piyush-talreja.github.io/imposter/ (pass-and-play in any phone browser, nothing to install).

## Quick start

**You need:** [Node 24](https://nodejs.org) (the version is pinned in `.nvmrc`) and [pnpm](https://pnpm.io/installation). The fastest way to try it on a phone is the [Expo Go](https://expo.dev/go) app.

```bash
git clone git@github.com:piyush-talreja/imposter.git
cd imposter
corepack enable        # provides the pinned pnpm version
pnpm install
pnpm start
```

Then scan the QR code in the terminal: use Expo Go on Android, or the Camera app on iOS. Your phone and computer must be on the same Wi-Fi. If they aren't, run `pnpm start --tunnel`.

## Run on each platform

| Platform         | Command        | Notes                                         |
| ---------------- | -------------- | --------------------------------------------- |
| Phone (fastest)  | `pnpm start`   | Scan the QR code with Expo Go                 |
| Web              | `pnpm web`     | Opens http://localhost:8081                   |
| iOS simulator    | `pnpm ios`     | macOS with Xcode only                         |
| Android emulator | `pnpm android` | Needs Android Studio with an emulator running |

## How the game works

| Role                                  | Gets                             | Knows their role?                                             |
| ------------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| **Villager** (most players)           | The secret word                  | Yes, they know they have _the_ word                           |
| **Undercover** (optional, 4+ players) | A similar word (Pizza → Calzone) | **No**. They think they're a Villager, so they hunt with them |
| **Imposter** (always at least 1)      | No word                          | Yes                                                           |

Each round, everyone still in gives a one-word clue, the table discusses, and then it votes **one** player out on a single screen. The eliminated player's role is revealed.

1. **Deal:** one screen per player. Hand them the phone; they **press and hold** the card to see their word, then pass it on.
2. **Find the Imposter:** a caught Imposter types one guess at the word. If it's right, **the Imposter wins**. If the table decides a wrong answer is close enough, it can accept it. The Imposter also wins by surviving until they're no longer outnumbered.
3. **Bonus round:** once every Imposter is caught, the Villagers' side has won. If an Undercover is still in, play continues until they're caught or only one Villager is left.

### Scoring

Four simple wins. The whole winning side scores, including players voted out earlier:

| What happens                      | Who scores                              |
| --------------------------------- | --------------------------------------- |
| Imposter wins                     | the Imposter **+6**. Nobody else scores |
| Imposter caught                   | everyone else **+2**                    |
| Bonus round: Undercover caught    | every Villager **+2**                   |
| Bonus round: Undercover gets away | the Undercover **+4**                   |

### Options

| Option                    | What it does                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roles                     | Recommended split for the group size, or set counts yourself within the caps: Imposters 1 (up to 2 from 6 players, 3 from 10); Undercovers 0 (optional from 4 players, up to 1/2/3 at 4/7/10+). Villagers are never outnumbered |
| Topics / Difficulty       | 12 topics or All; easy, medium, hard                                                                                                                                                                                            |
| Imposter sees the topic   | Gives the player with no word something to go on                                                                                                                                                                                |
| Imposter never goes first | The first clue always comes from someone who has a word                                                                                                                                                                         |
| Keep score                | Running totals across games (see Scoring)                                                                                                                                                                                       |

## Scripts

| Script                         | What it does                  |
| ------------------------------ | ----------------------------- |
| `pnpm start`                   | Expo dev server               |
| `pnpm web` / `ios` / `android` | Start on a specific platform  |
| `pnpm test`                    | Unit tests (Jest)             |
| `pnpm typecheck`               | `tsc --noEmit`                |
| `pnpm lint`                    | ESLint (`expo lint`)          |
| `pnpm format`                  | Prettier                      |
| `pnpm export:web`              | Static web build into `dist/` |

## Project structure

```
src/app/              screens (Expo Router): index, setup, deal, clues, vote-out, reveal, results, how-to-play
src/features/game/    engine.ts (pure rules, roles, win conditions, scoring; fully tested)
                      store.ts (Zustand, persisted), SecretCard.tsx (hold-to-peel)
src/features/words/   word list (each word has a "close cousin"), quality tests
src/components/ui.tsx design system: Table, Card, Sticker, Confetti, Button, Chip, Stepper, ToggleRow, Pop
src/theme/tokens.ts   "After Dark" palette: three role accents, fonts, role emoji
docs/decisions/       architecture decision records
```

The game rules live in `src/features/game/engine.ts` and have no React dependency, so you can change them and check the result with `pnpm test`, without opening the app.

### Adding words

Add rows to `src/features/words/words.ts` as `[word, cousin, 'e' | 'm' | 'h']`. A good word can be hinted at in about eight different ways. Its cousin is what the Undercover gets, so it must be close enough to survive a round or two of clues. `pnpm test` catches duplicates and missing cousins.

### Design

"After Dark": a dim party room in deep violet with two soft spotlights, and chunky stickers with black outlines and hard shadows.

- **Characters.** A single vector figure (`src/components/Character.tsx`) with three looks: plain (Villager, or a neutral player avatar), sunglasses (Undercover), mask (Imposter). The app icon, adaptive icon, splash and favicon in `assets/images` are rendered from the same drawing.
- **Colour means role:** pink is the Imposter and the main action, cyan the Villager, amber the Undercover. Everything else is neutral, and players are never colour-coded.
- **Privacy:** every secret card looks the same from across the table; the Imposter card doesn't change colour.
- **Motion and sound:** holding the card lifts it, peels the cover back and brings the word up with a soft shimmer; role reveals land with a thump; results play a short chime. Sounds are synthesized (`assets/sounds`), mix with your music, respect the silent switch, and can be muted in setup (Apple HIG). They always accompany a visual, never replace one.
- **UX:** Quit asks for confirmation, dealing shows progress dots, and a "Still in" row shows which roles remain (following the Nielsen heuristics: system status, error prevention, recognition over recall, minimalist design).
- **Fonts:** Big Shoulders Display (condensed poster headlines) and Outfit (body text). Tokens live in `src/theme/tokens.ts`.

## Online rooms (Phase 2, in progress)

Online rooms run on [Supabase](https://supabase.com). Pass-and-play needs none of this. Locally it runs in Docker:

```bash
pnpm db:start            # start local Supabase (first run downloads the images)
pnpm db:reset            # apply migrations from supabase/migrations
pnpm test:db             # security tests: RLS, private channels, no direct writes
pnpm functions:serve     # run the game-action Edge Function (keep this running)
pnpm test:online         # end-to-end checks against the local stack, like a phone
```

Online games (M2 rooms and lobby, M3 the game) are playable in the browser. With `.env` pointing at the local stack:

```bash
pnpm web                         # or: pnpm export:web && node e2e/serve.mjs dist 8765
pnpm test:e2e:rooms              # 4 players in 4 browser sessions (needs the build served on :8765)
pnpm test:online:game            # a whole 5-player game through the API
pnpm test:e2e:game               # the same game in 5 browser sessions
pnpm test:online:resilience      # timers, leaving mid-game, host handover (API, ~30 s)
pnpm test:e2e:resilience         # the same in the browser, incl. a host tab closing (~2 min)
```

Home → **Play online** → Host or Join. Share the 4-letter code, the link, or the QR code. Open more browser windows (or private windows) to add players.

Copy `.env.example` to `.env` and fill in the URL and anon key from `pnpm supabase status`.

**Viewing it from your laptop's browser** when the code runs on another machine: forward both the app and the Supabase API:

```bash
ssh -L 8081:localhost:8081 -L 54321:localhost:54321 <dev-machine>
```

| Path                              | What it is                                                       |
| --------------------------------- | ---------------------------------------------------------------- |
| `supabase/migrations/`            | Tables, row-level security, and Realtime authorization           |
| `supabase/tests/database/`        | pgTAP security tests (also run in CI)                            |
| `supabase/functions/game-action/` | Edge Function; imports the app's `engine.ts` through `deno.json` |
| `supabase/tests/smoke.mjs`        | End-to-end checks: sign-in, function, secrets, private channels  |
| `src/features/online/client.ts`   | App-side Supabase client with anonymous sign-in                  |

## Roadmap

- **Phase 2: online private rooms.** Host a room, share a code, and play on your own phones, together or apart. See the plan in [docs/phase-2-online.md](docs/phase-2-online.md).

## Configuration

No env vars or backend are needed. Everything runs on the device, and players, settings and scores are saved locally. See [ADR 0002](docs/decisions/0002-offline-pass-and-play-no-backend.md).

## Deploying

- **Web:** run `pnpm export:web`, then host `dist/` on any static host (Vercel, Netlify, EAS Hosting).
- **App stores:** run `npx eas-cli@latest build -p all --profile production`, then `npx eas-cli@latest submit`. This needs an [Expo account](https://expo.dev/signup), plus Apple and Google developer accounts. The profiles are in `eas.json`.

## Troubleshooting

| Problem                                    | Fix                                                                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stale bundle or odd Metro errors           | `pnpm start --clear`                                                                                                                                              |
| Package version warnings                   | `pnpm expo install --check`                                                                                                                                       |
| Phone can't reach the dev server           | `pnpm start --tunnel`                                                                                                                                             |
| `401 Unauthorized` from a private registry | Your global `~/.npmrc` points at a private registry. This repo's `.npmrc` pins the public one; also run `export pnpm_config_registry=https://registry.npmjs.org/` |

## License

MIT
