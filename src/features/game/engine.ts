// Pure game rules: no React, no storage. Everything random takes an injectable
// `rng` so tests are deterministic.
//
// Roles:
//   villager   - gets the secret word
//   undercover - gets the word's close cousin, and doesn't know they're different,
//                so they hunt the imposter alongside the villagers
//   imposter   - gets no word, and knows it
//
// A game is a two-stage hunt. Each round everyone still in gives a clue, then the
// table votes one player out and their role is revealed.
//   1. Find the imposter(s). A caught imposter gets one guess at the word; a
//      correct guess wins the game for the imposters outright. Imposters also win
//      if they survive until they're no longer outnumbered.
//   2. Once every imposter is caught, the villagers' side has won. If an
//      undercover is still in, a bonus round begins: villagers earn extra points
//      for catching them, and an undercover who is never caught earns a bonus.

import { type Difficulty, type WordEntry } from '@/features/words/words';

export type Rng = () => number;

export type Player = { id: string; name: string };

export type Role = 'villager' | 'undercover' | 'imposter';

/** Who won the main hunt. `villagers` is the whole non-imposter side, undercover included. */
export type Winner = 'villagers' | 'imposters';

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

export const POINTS = {
  /** Every villager and undercover, when all imposters are caught. */
  imposterCaught: 2,
  /** Every imposter, when the imposters win. */
  imposterWins: 6,
  /** Every villager, for each undercover caught. */
  undercoverCaught: 2,
  /** An undercover who is never caught, when the villagers' side wins. */
  undercoverUndetected: 4,
} as const;

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
  /** Result of the main hunt; stays set through the undercover bonus round. */
  winner: Winner | null;
  /** The game has finished, bonus round included. */
  over: boolean;
};

export type Card = { kind: 'word'; word: string } | { kind: 'imposter'; category?: string };

/** Undercover needs enough villagers to be "close but different" from; below this it's imposter-only. */
export const MIN_PLAYERS_FOR_UNDERCOVER = 4;

/** Upper bounds per role, so a group can't pick a split that breaks the game. */
export function maxImposters(playerCount: number): number {
  if (playerCount < 6) return 1;
  if (playerCount < 10) return 2;
  return 3;
}

/** Imposters plus undercovers never outnumber the villagers at the start. */
export function maxInfiltrators(playerCount: number): number {
  if (playerCount <= 4) return Math.max(1, playerCount - 2);
  return Math.floor((playerCount - 1) / 2);
}

/** Most undercovers allowed alongside `imposter` imposters. */
export function maxUndercover(playerCount: number, imposter: number): number {
  if (playerCount < MIN_PLAYERS_FOR_UNDERCOVER) return 0;
  const cap = playerCount < 7 ? 1 : playerCount < 10 ? 2 : 3;
  return Math.max(0, Math.min(cap, maxInfiltrators(playerCount) - imposter));
}

export function suggestRoles(playerCount: number): RoleCounts {
  if (playerCount <= 4) return { undercover: 0, imposter: 1 };
  if (playerCount <= 7) return { undercover: 1, imposter: 1 };
  if (playerCount <= 9) return { undercover: 2, imposter: 1 };
  if (playerCount <= 12) return { undercover: 2, imposter: 2 };
  return { undercover: 3, imposter: 2 };
}

/**
 * Resolve the counts actually used: always at least one imposter, undercover is
 * optional, and both stay within their caps.
 */
export function effectiveRoles(settings: Settings, playerCount: number): RoleCounts {
  const wanted = settings.autoRoles ? suggestRoles(playerCount) : settings.roles;
  const imposter = Math.max(
    1,
    Math.min(wanted.imposter, maxImposters(playerCount), maxInfiltrators(playerCount)),
  );
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
    over: false,
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

const countAlive = (game: Game, role: Role) => alive(game).filter((id) => game.roles[id] === role).length;

/** The villagers won the hunt and an undercover is still at large. */
export const inBonusRound = (game: Game) => game.winner === 'villagers' && !game.over;

/** Settle `winner` and `over` after an elimination or a guess. */
function settle(game: Game): Game {
  const imposters = countAlive(game, 'imposter');
  const undercovers = countAlive(game, 'undercover');
  const villagers = countAlive(game, 'villager');
  let { winner, over } = game;
  if (!winner) {
    if (imposters === 0) winner = 'villagers';
    else if (villagers + undercovers <= imposters) {
      winner = 'imposters';
      over = true;
    }
  }
  // The bonus hunt ends once every undercover is caught, or there aren't enough
  // villagers left to keep hunting.
  if (winner === 'villagers' && (undercovers === 0 || villagers <= 1)) over = true;
  return { ...game, winner, over };
}

export function eliminate(game: Game, playerId: string): Game {
  if (game.over || game.pendingGuess || game.eliminated.includes(playerId)) return game;
  const next: Game = { ...game, eliminated: [...game.eliminated, playerId], lastGuess: null };
  if (game.roles[playerId] === 'imposter') return { ...next, pendingGuess: playerId };
  return settle(next);
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
  return correct ? { ...next, winner: 'imposters', over: true } : settle(next);
}

export function nextRound(game: Game): Game {
  return game.over || game.pendingGuess ? game : { ...game, round: game.round + 1 };
}

export type ScoreLine = { points: number; reason: string };

/** Points earned in a finished game, per player, with the reason for each. */
export function scoreGame(game: Game): Record<string, ScoreLine[]> {
  const lines: Record<string, ScoreLine[]> = {};
  if (!game.over) return lines;
  const add = (id: string, points: number, reason: string) => (lines[id] ??= []).push({ points, reason });
  const ids = Object.keys(game.roles);
  const caughtUndercovers = game.eliminated.filter((id) => game.roles[id] === 'undercover').length;

  for (const id of ids) {
    const role = game.roles[id];
    if (game.winner === 'villagers' && role !== 'imposter') add(id, POINTS.imposterCaught, 'Imposter caught');
    if (game.winner === 'imposters' && role === 'imposter') add(id, POINTS.imposterWins, 'Imposter won');
    if (role === 'villager' && caughtUndercovers > 0) {
      add(id, POINTS.undercoverCaught * caughtUndercovers, 'Undercover caught');
    }
    // The undercover plays on the villagers' side, so their bonus only counts
    // when that side wins; if the imposter wins, nobody else scores.
    if (role === 'undercover' && game.winner === 'villagers' && !game.eliminated.includes(id)) {
      add(id, POINTS.undercoverUndetected, 'Never caught');
    }
  }
  return lines;
}

export const totalPoints = (lines: ScoreLine[] = []) => lines.reduce((sum, l) => sum + l.points, 0);
