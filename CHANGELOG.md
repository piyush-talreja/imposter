# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org).

## [Unreleased]

### Added
- Vector character illustrations: a home-screen line-up with the masked Imposter, role characters on reveals, the rules page and the scoreboard, and neutral avatars on the vote screen
- New app icon, adaptive icon, splash and favicon drawn from the same character
- Sound effects (reveal shimmer, role thump, results chime) with an in-app mute; they mix with other audio and respect silent mode
- Quit confirmation, dealing progress dots, and a "Still in" row showing which roles remain

### Changed
- Richer hold-to-reveal: the card lifts, the cover peels back, and the word rises in; haptics on press and release
- The Imposter card now looks the same as a word card from across the table
- Visual rules page (Who's who · Each round · How to win · Points)
- Scoreboard: a short summary of what scored, then clean rows with rank, character and points; the scoreboard now sits above the words


### Changed

- **Two-stage hunt.** The Undercover plays on the Villagers' side. Once the Imposter is caught, a bonus round hunts any Undercover still in: Villagers score for catching them, and an Undercover who is never caught scores a bonus. Scores are itemised on the results screen.
- Role counts are capped by group size (Imposters 1–3, Undercovers 0–3), so a table can't pick a broken split.
- **One screen per player when dealing:** the name and a covered card on the same screen, replacing the separate "that's me" step.
- No emojis. Roles use symbols instead: full dot (Villager), half dot (Undercover), empty ring (Imposter).
- Much shorter copy throughout.

### Changed

- Every game has at least one Imposter. Undercover is optional, available from 4 players; 3-player games are 2 Villagers and 1 Imposter.

### Fixed

- Role stickers ("Imposter", "Undercover") and long names shrank to an unreadable size on phones. `adjustsFontSizeToFit` collapses text inside containers that size to their content, so text is now sized to the screen width on every platform.
- First launch with no saved data could hang on the loading spinner, because the app missed the "saved data loaded" signal.
- The on-screen keyboard covered the name and guess inputs, and the button below them.
- The Android back button could drop the table out of a game mid-deal.
- Long-pressing the word card on mobile web opened the browser's context menu.
- On small phones (iPhone SE), long names overflowed or were cut mid-word, button labels wrapped onto two lines, and the home screen stickers ran off the edge.

### Changed

- **New rules:** three roles. Villagers get the word, the Undercover gets its cousin without knowing it, and the Imposter gets no word. Play is now round-based elimination instead of a single vote.
- The group eliminates one player per round on a single screen, so nobody passes the phone to vote.
- An eliminated Imposter gets a typed last guess. A correct answer wins; the table can accept a near miss.
- Win conditions: Villagers win when all infiltrators are out; Undercover and Imposter win when one Villager is left.
- Complete visual redesign, "After Dark": a moody night palette with only three accents, each tied to a role (pink Imposter and main actions, cyan Villager, amber Undercover), plus chunky stickers, bouncy reveals and confetti. Party wording ("players", "Clue time", "Vote out") replaces the crime wording.
- Web build is now a single-page app (fixes a hydration warning).

### Added

- Press and hold to peel back a sticker and see your word; letting go hides it.
- Role setup with a suggested split for the group size, or manual counts.
- "Imposter never goes first" rule (on by default).

### Added

- Pass-and-play game: player setup, private word dealing, clue turns, secret voting, reveal, scoreboard
- 173 hand-picked words in 12 categories, each with a "close cousin" word, at easy, medium and hard difficulty
- Game options: multiple imposters (7+ players), kids mode, imposter sees the category, Undercover mode, 1–5 clue passes, optional scoring
- Fair imposter rotation: players who've been imposter less often are more likely to be picked
- Players, settings and scores are saved between launches
- Unit tests for the game engine, scoring and word-list quality
