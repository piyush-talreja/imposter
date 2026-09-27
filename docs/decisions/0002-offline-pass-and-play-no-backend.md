# 2. Offline pass-and-play, no backend (v1)

- **Status:** Accepted
- **Context:** The game is played in one room, with one phone going round. A backend would add accounts, cost and failure modes without making that experience better.
- **Decision:** v1 is fully offline. State lives in a Zustand store persisted to AsyncStorage. There is no Supabase yet, which departs from the guide's default backend.
- **Consequences:** Works in airplane mode and needs zero setup. Online multiplayer (one phone each) is a separate future ADR, likely Supabase Realtime.
