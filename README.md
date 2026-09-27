# Imposter 🕵️

A pass-and-play party word game for iOS, Android and the web. Everyone gets the secret word except the imposter. Take turns giving one-word clues, bluff your way through, then vote to unmask the imposter.

**3+ players · one phone · 10–20 minutes · works offline**

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

| Platform | Command | Notes |
|---|---|---|
| Phone (fastest) | `pnpm start` | Scan the QR code with Expo Go |
| Web | `pnpm web` | Opens http://localhost:8081 |
| iOS simulator | `pnpm ios` | macOS with Xcode only |
| Android emulator | `pnpm android` | Needs Android Studio with an emulator running |

## How the game works

1. **Setup:** add players in seating order, then pick categories, difficulty and rules.
2. **Deal:** pass the phone round. Each player taps *Show my word*, reads it, then taps *Hide word & pass*. The imposter sees "Imposter" instead of the word.
3. **Clues:** the app picks a random starting player and goes clockwise, for 1–5 passes round the table.
4. **Vote:** a secret ballot. The phone goes round once more.
5. **Reveal:** see the vote tally, then the imposter, then the word, then the scoreboard.

### Options

| Option | What it does |
|---|---|
| Categories | 12 categories, including Food, Animals, Places, Jobs and Fun & Fantasy, or 🎲 All |
| Difficulty / Kids mode | Easy, medium, hard. Kids mode uses easy words only |
| Imposters | 1, or up to 2 at 7+ players and 3 at 10+ |
| Clue passes | 1–5 times round the table |
| Imposter sees category | Gives the imposter a fighting chance |
| Undercover mode | The imposter secretly gets a *similar* word (Pizza → Calzone) and doesn't know they're the imposter |
| Keep score | Per-player points (below) |

### Scoring

Each round:

- **Crew:** +1 for voting for an imposter, and +1 bonus each if the *whole* crew caught them.
- **Imposter:** +1 if anyone was fooled, +1 more if nobody voted for them, and a further +1 if they were uncaught *and* could name the word.

## Scripts

| Script | What it does |
|---|---|
| `pnpm start` | Expo dev server |
| `pnpm web` / `ios` / `android` | Start on a specific platform |
| `pnpm test` | Unit tests (Jest) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (`expo lint`) |
| `pnpm format` | Prettier |
| `pnpm export:web` | Static web build into `dist/` |

## Project structure

```
src/app/              screens (Expo Router): index, setup, deal, clues, vote, reveal, how-to-play
src/features/game/    engine.ts (pure rules + scoring, fully tested), store.ts (Zustand, persisted)
src/features/words/   word list (each word has a "close cousin"), quality tests
src/components/ui.tsx shared UI primitives (Screen, Button, Chip, Stepper, ToggleRow, Card)
src/theme/tokens.ts   colors, spacing, type scale
docs/decisions/       architecture decision records
```

The game rules live in `src/features/game/engine.ts` and have no React dependency, so you can change them and check the result with `pnpm test`, without opening the app.

### Adding words

Add rows to `src/features/words/words.ts` as `[word, cousin, 'e' | 'm' | 'h']`. A good word can be hinted at in about eight different ways, and has a close "cousin" the imposter could plausibly guess. `pnpm test` catches duplicates and missing cousins.

## Configuration

No env vars or backend are needed. Everything runs on the device, and players, settings and scores are saved locally. See [ADR 0002](docs/decisions/0002-offline-pass-and-play-no-backend.md).

## Deploying

- **Web:** run `pnpm export:web`, then host `dist/` on any static host (Vercel, Netlify, EAS Hosting).
- **App stores:** run `npx eas-cli@latest build -p all --profile production`, then `npx eas-cli@latest submit`. This needs an [Expo account](https://expo.dev/signup), plus Apple and Google developer accounts. The profiles are in `eas.json`.

## Troubleshooting

| Problem | Fix |
|---|---|
| Stale bundle or odd Metro errors | `pnpm start --clear` |
| Package version warnings | `pnpm expo install --check` |
| Phone can't reach the dev server | `pnpm start --tunnel` |
| `401 Unauthorized` from a private registry | Your global `~/.npmrc` points at a private registry. This repo's `.npmrc` pins the public one; also run `export pnpm_config_registry=https://registry.npmjs.org/` |

## License

MIT
