# Releasing Imposter

The steps to take the app from this repo to a live backend, the web, and the app stores. Everything that needs **your accounts** is marked 🔑. Nothing here runs automatically.

## 1. Production backend (Supabase) 🔑

1. Create a free project at [supabase.com](https://supabase.com). Pick a region close to your players, and save the database password.
2. In the dashboard, turn on anonymous sign-ins: **Authentication → Sign In / Providers → Allow anonymous sign-ins**. For public launches, also turn on **CAPTCHA (Turnstile)** for anonymous sign-ins to stop bots creating accounts.
3. Link this repo and push the schema and the referee function:
   ```bash
   pnpm supabase login                         # opens the browser
   pnpm supabase link --project-ref <ref>      # the ref is in the project URL
   pnpm deploy:db                              # applies supabase/migrations (tables, RLS, room functions, pg_cron cleanup)
   pnpm deploy:functions                       # deploys the game-action Edge Function
   ```
4. Check the security tests against production _before_ inviting players:
   ```bash
   pnpm supabase test db --linked
   ```
5. Copy the **Project URL** and the **anon / publishable key** (Settings → API). They're public by design; RLS and the function protect the data. **Never** ship the service-role key in the app.

## 2. Web 🔑

```bash
EXPO_PUBLIC_SUPABASE_URL=<project url> EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key> pnpm export:web
```

Deploy `dist/` to any static host (EAS Hosting, Vercel, Netlify, Cloudflare Pages). Configure the host to serve `index.html` for unknown paths, so links like `/join/K7QX` work. The privacy page is at `/privacy`: use that URL for the store listings.

## 3. App stores (EAS) 🔑

Needs an [Expo account](https://expo.dev/signup), an Apple Developer account (for iOS), and a Google Play Console account (for Android).

```bash
npx eas-cli@latest login
npx eas-cli@latest init                      # links the app to your Expo account (writes the project id to app.json)

# Backend settings for store builds (per environment; development and preview can point elsewhere)
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value <project url> --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --visibility plaintext

npx eas-cli@latest build -p all --profile preview      # installable test builds for your own phones first
npx eas-cli@latest build -p all --profile production   # store builds (build numbers auto-increment)
npx eas-cli@latest submit -p ios                       # to App Store Connect / TestFlight
npx eas-cli@latest submit -p android                   # to Google Play (internal testing track first)
```

**Store listing checklist**

- [ ] Name (see the naming notes: "Imposter" alone is taken on the App Store, so use e.g. "Imposter – Party Word Game")
- [ ] Screenshots: home, a card being revealed, the clue board, the vote, results (the browser tests can capture these with `SHOTS=<dir>`)
- [ ] Privacy policy URL: the web `/privacy` page
- [ ] **Apple privacy labels / Google data safety:** data collected is _name (user-entered)_ and _game content (clues, votes)_, not linked to identity and not used for tracking; deleted after 24 h
- [ ] Age rating: no objectionable content (the word list is family-friendly; typed clues are one word and limited to 24 characters)
- [ ] Permissions: none requested (the microphone permission from `expo-audio` is turned off in `app.json`)
- [ ] iOS export compliance: `ITSAppUsesNonExemptEncryption` is `false` (standard HTTPS only)

## 4. Before each release

- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] Local stack: `pnpm test:db`, `pnpm test:online`, `pnpm test:online:game`, `pnpm test:online:resilience`, `pnpm test:online:load`
- [ ] Browser: `pnpm test:e2e:rooms`, `pnpm test:e2e:game`, `pnpm test:e2e:resilience`, `pnpm test:e2e:polish`
- [ ] Play one pass-and-play game and one online game on real phones (preview build)
- [ ] `CHANGELOG.md`: move `Unreleased` to a version, and tag it (`git tag v1.0.0`)
- [ ] New migrations? Run `pnpm deploy:db` **before** shipping app builds that depend on them
- [ ] Changed the Edge Function? Run `pnpm deploy:functions`

## Costs and limits

The Supabase free tier is plenty for a hobby game. Free projects **pause after a week of inactivity** (the first request wakes them, slowly). Upgrade, or ping the project daily, if people will rely on it. Check current limits at supabase.com/pricing.
