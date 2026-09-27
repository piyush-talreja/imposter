# 3. Plain StyleSheet + design tokens instead of NativeWind

- **Status:** Accepted
- **Context:** The guide defaults to NativeWind. This app has about 8 screens and a fixed dark theme.
- **Decision:** Use `StyleSheet` with the tokens in `src/theme/tokens.ts` and shared primitives in `src/components/ui.tsx`.
- **Consequences:** No Babel/Metro/Tailwind config to maintain across Expo SDK upgrades. Revisit if the UI grows a lot.
