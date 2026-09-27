# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org).

## [Unreleased]

### Fixed
- Stamps and long names shrank to an unreadable size or were clipped on phones. `adjustsFontSizeToFit` collapses text inside containers that size to their content, so text is now sized to the screen width on every platform.
- First launch with no saved data could hang on the loading spinner, because the app missed the "saved data loaded" signal.
- The on-screen keyboard covered the guess input and the button below it.
- The Android back button could drop the table out of a game mid-deal.
- Long-pressing the word card on mobile web opened the browser's context menu.
- On small phones, long names overflowed and button labels wrapped onto two lines.

### Changed

- **New rules:** three roles. Villagers get the word, the Undercover gets its cousin without knowing it, and the Imposter gets no word. Play is now round-based elimination instead of a single vote.
- The group eliminates one player per round on a single screen, so nobody passes the phone to vote.
- An eliminated Imposter gets a typed last guess. A correct answer wins; the table can accept a near miss.
- Win conditions: Villagers win when all infiltrators are out; Undercover and Imposter win when one Villager is left.
- Complete visual redesign with a noir "classified case file" theme, custom fonts, film grain and animated rubber-stamp reveals.
- Web build is now a single-page app (fixes a hydration warning).

### Added

- Press-and-hold to reveal your word under a redaction bar; letting go hides it.
- Role setup with a suggested split for the group size, or manual counts.
- "Imposter never goes first" rule (on by default).

### Added

- Pass-and-play game: player setup, private word dealing, clue turns, secret voting, reveal, scoreboard
- 173 hand-picked words in 12 categories, each with a "close cousin" word, at easy, medium and hard difficulty
- Game options: multiple imposters (7+ players), kids mode, imposter sees the category, Undercover mode, 1–5 clue passes, optional scoring
- Fair imposter rotation: players who've been imposter less often are more likely to be picked
- Players, settings and scores are saved between launches
- Unit tests for the game engine, scoring and word-list quality
