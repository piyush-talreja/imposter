# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org).

## [Unreleased]

### Changed

- **New rules:** three roles. Villagers get the word, the Undercover gets its cousin without knowing it, and the Imposter gets no word. Play is now round-based elimination instead of a single vote.
- The group eliminates one player per round on a single screen, so nobody passes the phone to vote.
- An eliminated Imposter gets a typed last guess. A correct answer wins; the table can accept a near miss.
- Win conditions: Villagers win when all infiltrators are out; Undercover and Imposter win when one Villager is left.
- Complete visual redesign, "Sticker Party": a bright, colorful sticker look with bouncy animations, confetti bursts and a role emoji for each role. Crime wording ("suspects", "case", "accuse") is replaced with party language ("players", "Clue time", "Vote out").
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
