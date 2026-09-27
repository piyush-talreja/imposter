// Pure game rules: no React, no storage. Everything random takes an injectable
// `rng` so tests are deterministic.
//
// Roles:
//   villager   - gets the secret word
//   undercover - gets the word's close cousin, and doesn't know they're different
//   imposter   - gets no word, and knows it
// Each round everyone still in gives a clue, then the group eliminates one player.
// An eliminated imposter gets one guess at the villagers' word to win outright.

import { type Difficulty, type WordEntry } from '@/features/words/words';

export type Rng = () => number;

export type Player = { id: string; name: string };

export type Role = 'villager' | 'undercover' | 'imposter';

export type Winner = 'villagers' | 'infiltrators' | 'imposter-guess';

export type RoleCounts = { undercover: number; imposter: number };

export type Settings = {
  categoryIds: string[];
  difficulties: Difficulty[];
  /** Use suggestRoles() for the current player count instead of the manual counts. */
  autoRoles: boolean;
  roles: RoleCounts;
  /** Imposter is told the category. */
  imposterSeesCategory: boolean;
  /** The first player to give a clue is never the imposter (they'd have nothing to go on). */
  imposterNeverFirst: boolean;
  scoring: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  categoryIds: [],
  difficulties: ['easy', 'medium'],
  autoRoles: true,
  roles: { undercover: 0, imposter: 1 },
  imposterSeesCategory: false,
  imposterNeverFirst: true,
  scoring: true,
};

export const MIN_PLAYERS = 3;

/** Points for each member of the winning side. */
export const POINTS: Record<Role, number> = { villager: 2, undercover: 5, imposter: 6 };

export type Game = {
  word: string;
  cousin: string;
  categoryId: string;
  roles: Record<string, Role>;
  /** Seating order rotated to a random start; eliminated players are skipped. */
  order: string[];
  eliminated: string[];
  round: number;
  /** Set when an eliminated imposter is due to guess. */
  pendingGuess: string | null;
  lastGuess: { by: string; text: string; correct: boolean } | null;
  winner: Winner | null;
};

export type Card = { kind: 'word'; word: string } | { kind: 'imposter'; category?: string };

/** Infiltrators (undercover + imposter) must be outnumbered by villagers at the start. */
/** Undercover needs enough villagers to be "close but different" from; below this it's imposter-only. */
export const MIN_PLAYERS_FOR_UNDERCOVER = 4;

/**
 * Most infiltrators (undercover + imposter) a group can have. Villagers stay in
 * the majority, except that 4 players may run 1 imposter + 1 undercover.
 */
export function maxInfiltrators(playerCount: number): number {
  if (playerCount <= 4) return Math.max(1, playerCount - 2);
  return Math.floor((playerCount - 1) / 2);
}

/** Most undercovers allowed alongside `imposter` imposters (0 below 4 players). */
export function maxUndercover(playerCount: number, imposter: number): number {
  if (playerCount < MIN_PLAYERS_FOR_UNDERCOVER) return 0;
  return Math.max(0, maxInfiltrators(playerCount) - imposter);
}

export function suggestRoles(playerCount: number): RoleCounts {
  if (playerCount <= 4) return { undercover: 0, imposter: 1 };
  if (playerCount <= 6) return { undercover: 1, imposter: 1 };
  if (playerCount <= 9) return { undercover: 2, imposter: 1 };
  if (playerCount <= 12) return { undercover: 2, imposter: 2 };
  return { undercover: Math.floor(playerCount / 4), imposter: 2 };
}

/**
 * Resolve the counts actually used: there is always at least one imposter,
 * undercover is optional, and the game stays winnable.
 */
export function effectiveRoles(settings: Settings, playerCount: number): RoleCounts {
  const wanted = settings.autoRoles ? suggestRoles(playerCount) : settings.roles;
  const imposter = Math.max(1, Math.min(wanted.imposter, maxInfiltrators(playerCount)));
  const undercover = Math.max(0, Math.min(wanted.undercover, maxUndercover(playerCount, imposter)));
  return { undercover, imposter };
}

export function wordPool(words: WordEntry[], settings: Settings): WordEntry[] {
  return words.filter(
    (w) =>
      (settings.categoryIds.length === 0 || settings.categoryIds.includes(w.categoryId)) &&
      settings.difficulties.includes(w.difficulty),
  );
}

export function pickWord(pool: WordEntry[], usedWords: string[], rng: Rng): WordEntry {
  if (pool.length === 0) throw new Error('No words match the selected categories and difficulty');
  const fresh = pool.filter((w) => !usedWords.includes(w.word));
  const from = fresh.length > 0 ? fresh : pool;
  return from[Math.floor(rng() * from.length)];
}

/**
 * Weighted pick so everyone gets a turn as an infiltrator over a session, without
 * it being predictable: weight = 1 / (1 + times already an infiltrator).
 */
export function pickWeighted(
  ids: string[],
  count: number,
  history: Record<string, number>,
  rng: Rng,
): string[] {
  const chosen: string[] = [];
  let candidates = [...ids];
  for (let i = 0; i < Math.min(count, ids.length); i++) {
    const weights = candidates.map((id) => 1 / (1 + (history[id] ?? 0)));
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    let idx = 0;
    while (idx < weights.length - 1 && r >= weights[idx]) r -= weights[idx++];
    chosen.push(candidates[idx]);
    candidates = candidates.filter((_, j) => j !== idx);
  }
  return chosen;
}

export function assignRoles(
  players: Player[],
  counts: RoleCounts,
  history: Record<string, number>,
  rng: Rng,
): Record<string, Role> {
  const ids = players.map((p) => p.id);
  const infiltrators = pickWeighted(ids, counts.undercover + counts.imposter, history, rng);
  const roles: Record<string, Role> = Object.fromEntries(ids.map((id) => [id, 'villager' as Role]));
  infiltrators.forEach((id, i) => (roles[id] = i < counts.imposter ? 'imposter' : 'undercover'));
  return roles;
}

/** Seating order rotated to a random start (optionally never an imposter). */
export function clueOrder(
  players: Player[],
  roles: Record<string, Role>,
  imposterNeverFirst: boolean,
  rng: Rng,
) {
  const starts = players
    .map((_, i) => i)
    .filter((i) => !imposterNeverFirst || roles[players[i].id] !== 'imposter');
  const start = starts[Math.floor(rng() * starts.length)];
  return [...players.slice(start), ...players.slice(0, start)].map((p) => p.id);
}

export function newGame(args: {
  players: Player[];
  settings: Settings;
  words: WordEntry[];
  usedWords: string[];
  history: Record<string, number>;
  rng?: Rng;
}): Game {
  const { players, settings, words, usedWords, history, rng = Math.random } = args;
  if (players.length < MIN_PLAYERS) throw new Error(`Need at least ${MIN_PLAYERS} players`);
  const entry = pickWord(wordPool(words, settings), usedWords, rng);
  const roles = assignRoles(players, effectiveRoles(settings, players.length), history, rng);
  return {
    word: entry.word,
    cousin: entry.cousin,
    categoryId: entry.categoryId,
    roles,
    order: clueOrder(players, roles, settings.imposterNeverFirst, rng),
    eliminated: [],
    round: 1,
    pendingGuess: null,
    lastGuess: null,
    winner: null,
  };
}

export function cardFor(
  game: Game,
  playerId: string,
  settings: Settings,
  categoryName: (id: string) => string,
): Card {
  switch (game.roles[playerId]) {
    case 'imposter':
      return {
        kind: 'imposter',
        category: settings.imposterSeesCategory ? categoryName(game.categoryId) : undefined,
      };
    case 'undercover':
      return { kind: 'word', word: game.cousin };
    default:
      return { kind: 'word', word: game.word };
  }
}

export const alive = (game: Game) => game.order.filter((id) => !game.eliminated.includes(id));

export function checkWinner(game: Game): Winner | null {
  const left = alive(game);
  const villagers = left.filter((id) => game.roles[id] === 'villager').length;
  const infiltrators = left.length - villagers;
  if (infiltrators === 0) return 'villagers';
  if (villagers <= 1) return 'infiltrators';
  return null;
}

export function eliminate(game: Game, playerId: string): Game {
  if (game.winner || game.pendingGuess || game.eliminated.includes(playerId)) return game;
  const next: Game = { ...game, eliminated: [...game.eliminated, playerId], lastGuess: null };
  if (game.roles[playerId] === 'imposter') return { ...next, pendingGuess: playerId };
  return { ...next, winner: checkWinner(next) };
}

/** Case-, space- and punctuation-insensitive; a trailing plural "s" is forgiven. */
export function isCorrectGuess(guess: string, word: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]/g, '')
      .replace(/s$/, '');
  return norm(guess) !== '' && norm(guess) === norm(word);
}

export function resolveGuess(game: Game, text: string, overrideCorrect?: boolean): Game {
  if (!game.pendingGuess) return game;
  const correct = overrideCorrect ?? isCorrectGuess(text, game.word);
  const next: Game = { ...game, pendingGuess: null, lastGuess: { by: game.pendingGuess, text, correct } };
  return { ...next, winner: correct ? 'imposter-guess' : checkWinner(next) };
}

export function nextRound(game: Game): Game {
  return game.winner || game.pendingGuess ? game : { ...game, round: game.round + 1 };
}

/** Who scores for a finished game: the whole winning side, eliminated or not. */
export function scoreGame(game: Game): Record<string, number> {
  const points: Record<string, number> = {};
  if (!game.winner) return points;
  for (const [id, role] of Object.entries(game.roles)) {
    const wins =
      game.winner === 'villagers'
        ? role === 'villager'
        : game.winner === 'infiltrators'
          ? role !== 'villager'
          : id === game.lastGuess?.by;
    if (wins) points[id] = POINTS[role];
  }
  return points;
}
