# imposter

Pass-and-play Imposter word party game for iOS, Android and web

<!-- Screenshot or GIF: docs/screenshot.png -->

## Quick start

**Prerequisites:** [Node LTS](https://nodejs.org) (version in `.nvmrc`), [pnpm](https://pnpm.io/installation), and the [Expo Go](https://expo.dev/go) app on your phone.

```bash
git clone git@github.com:piyush-talreja/imposter.git
cd imposter
nvm use            # or: mise use node@$(cat .nvmrc)
pnpm install
cp .env.example .env   # then fill in values
pnpm start
```

## Run on each platform

| Platform | Command | Notes |
|---|---|---|
| Phone (fastest) | `pnpm start` | Scan the QR code with Expo Go (Android) or the Camera app (iOS) |
| iOS simulator | `pnpm ios` | macOS + Xcode only |
| Android emulator | `pnpm android` | Needs Android Studio + a running emulator |
| Web | `pnpm web` | Opens http://localhost:8081 |

## Configuration

All env vars are listed in [`.env.example`](.env.example).

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (`supabase status` shows it locally) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. It is public by design; RLS protects the data |

## Scripts

| Script | What it does |
|---|---|
| `pnpm start` | Start the Expo dev server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Unit tests (Jest) |
| `pnpm format` | Prettier write |

## Project structure

```
app/            routes (Expo Router)
src/components/ reusable UI
src/features/   feature modules
src/lib/        clients and utils
supabase/       migrations, seed, edge functions
docs/decisions/ architecture decision records
```

## Backend (Supabase, local)

```bash
pnpm dlx supabase start      # needs Docker
pnpm dlx supabase db reset   # apply migrations + seed
```

## Testing

```bash
pnpm test                  # unit
maestro test e2e/          # mobile E2E (optional)
```

## Deploying

- **Web:** `pnpm dlx expo export -p web`, then deploy `dist/` (Vercel/Netlify/EAS Hosting)
- **Stores:** `eas build -p all --profile production`, then `eas submit`

## Troubleshooting

| Problem | Fix |
|---|---|
| Metro cache weirdness | `pnpm start --clear` |
| Package version mismatch warnings | `pnpm dlx expo install --check` |

## License

MIT
