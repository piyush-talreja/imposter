@AGENTS.md

## Project notes

- Also follow `../PROJECT_GUIDE.md`.
- Game rules and scoring live in `src/features/game/engine.ts`, which is pure and tested. Change the rules there and add a test, not in the screens.
- Word-list rules are in the header comment of `src/features/words/words.ts`, and `words.test.ts` enforces them.
- Run `pnpm typecheck && pnpm lint && pnpm test` before committing.
