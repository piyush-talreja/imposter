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

| Platform         | Command        | Notes                                         |
| ---------------- | -------------- | --------------------------------------------- |
| Phone (fastest)  | `pnpm start`   | Scan the QR code with Expo Go                 |
| Web              | `pnpm web`     | Opens http://localhost:8081                   |
| iOS simulator    | `pnpm ios`     | macOS with Xcode only                         |
| Android emulator | `pnpm android` | Needs Android Studio with an emulator running |

## How the game works

There are three roles, and nobody knows who is who:

| Role                        | Gets                                      | Knows their role?                      |
| --------------------------- | ----------------------------------------- | -------------------------------------- |
| **Villager** (most players) | The secret word                           | No, but they know they have _the_ word |
| **Undercover**              | The word's close cousin (Pizza → Calzone) | **No**. They think they're a villager  |
| **Imposter**                | No word                                   | Yes                                    |

1. **Deal:** pass the phone round. Each player **presses and holds** the sticker to peel it back and see their word. Letting go hides it again.
2. **Clues:** everyone still in says one word, clockwise from a random starting player.
3. **Accuse:** discuss, then agree out loud on **one** player to eliminate. The phone stays on the table, with no passing it round to vote. Their role is revealed.
4. **Last words:** if the Imposter is eliminated, they type one guess at the villagers' word. If it's right, **the Imposter wins**. If the table decides a wrong answer is close enough, it can accept it.
5. Repeat until someone wins:
   - **Villagers win** when every Undercover and Imposter is out.
   - **Infiltrators win** (Undercover and Imposter) when only one Villager is left.

### Options

| Option                    | What it does                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roles                     | Always at least **1 Imposter**. **Undercover is optional**, available from 4 players. Use the suggested split for your group size, or set the counts yourself |
| Case files                | 12 categories, or All                                                                                                                                         |
| Difficulty / Kids         | Easy, medium, hard. Kids uses easy words only                                                                                                                 |
| Imposter sees category    | Gives the player with no word something to go on                                                                                                              |
| Imposter never goes first | The first clue always comes from someone who has a word                                                                                                       |
| Keep score                | Everyone on the winning side scores: Villager 2, Undercover 5, Imposter 6. A lone Imposter win (a correct guess) scores 6 for that Imposter                   |

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

The theme is "After Dark": a dim party room in deep violet with two soft spotlights, and chunky stickers with black outlines and hard shadows. Color is used sparingly and always means something:

| Color    | Means                                         |
| -------- | --------------------------------------------- |
| Hot pink | Imposter, and the main action on every screen |
| Cyan     | Villager                                      |
| Amber    | Undercover                                    |

Everything else is neutral, and players are never color-coded, so a color can't hint at anyone's role. The title shows one letter in pink: the odd one out. The fonts are Big Shoulders Display (condensed poster headlines) and Outfit (body text). Tokens live in `src/theme/tokens.ts`.

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
