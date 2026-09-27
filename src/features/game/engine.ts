// Pure game rules: no React, no storage. Everything random takes an injectable
// `rng` so tests are deterministic.

import { type Difficulty, type WordEntry } from '@/features/words/words';

export type Rng = () => number;

export type Player = { id: string; name: string };

export type Settings = {
  categoryIds: string[];
  difficulties: Difficulty[];
  imposterCount: number;
  /** Imposter is secretly dealt the cousin word instead of "Imposter". */
  undercover: boolean;
  /** Imposter is told the category (not in undercover mode). */
  imposterSeesCategory: boolean;
  passes: number;
  scoring: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  categoryIds: [],
  difficulties: ['easy', 'medium'],
  imposterCount: 1,
  undercover: false,
  imposterSeesCategory: false,
  passes: 3,
  scoring: true,
};

export const MIN_PLAYERS = 3;

export type Round = {
  word: string;
  cousin: string;
  categoryId: string;
  imposterIds: string[];
  /** Clue order: a random starting player, then clockwise around the table. */
  order: string[];
  /** voterId -> suspectId */
  votes: Record<string, string>;
  /** Uncaught imposter id -> did they name the secret word? */
  guesses: Record<string, boolean>;
};

export type Card = { kind: 'word'; word: string } | { kind: 'imposter'; category?: string };

export type RoundScore = Record<string, { points: number; reasons: string[] }>;

/** Enough crewmates that a round is still a real game: 1 per ~3.5 players. */
export function maxImposters(playerCount: number): number {
  if (playerCount < 7) return 1;
  if (playerCount < 10) return 2;
  return 3;
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
 * Weighted pick so everyone gets a turn as imposter over a session, without it
 * being predictable: weight = 1 / (1 + times already imposter).
 */
export function pickImposters(
  players: Player[],
  count: number,
  imposterHistory: Record<string, number>,
  rng: Rng,
): string[] {
  const chosen: string[] = [];
  let candidates = [...players];
  for (let i = 0; i < Math.min(count, players.length - 1); i++) {
    const weights = candidates.map((p) => 1 / (1 + (imposterHistory[p.id] ?? 0)));
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    let idx = 0;
    while (idx < weights.length - 1 && r >= weights[idx]) r -= weights[idx++];
    chosen.push(candidates[idx].id);
    candidates = candidates.filter((_, j) => j !== idx);
  }
  return chosen;
}

export function clueOrder(players: Player[], rng: Rng): string[] {
  const start = Math.floor(rng() * players.length);
  return [...players.slice(start), ...players.slice(0, start)].map((p) => p.id);
}

export function newRound(args: {
  players: Player[];
  settings: Settings;
  words: WordEntry[];
  usedWords: string[];
  imposterHistory: Record<string, number>;
  rng?: Rng;
}): Round {
  const { players, settings, words, usedWords, imposterHistory, rng = Math.random } = args;
  if (players.length < MIN_PLAYERS) throw new Error(`Need at least ${MIN_PLAYERS} players`);
  const entry = pickWord(wordPool(words, settings), usedWords, rng);
  const count = Math.max(1, Math.min(settings.imposterCount, maxImposters(players.length)));
  return {
    word: entry.word,
    cousin: entry.cousin,
    categoryId: entry.categoryId,
    imposterIds: pickImposters(players, count, imposterHistory, rng),
    order: clueOrder(players, rng),
    votes: {},
    guesses: {},
  };
}

export function cardFor(
  round: Round,
  playerId: string,
  settings: Settings,
  categoryName: (id: string) => string,
): Card {
  if (!round.imposterIds.includes(playerId)) return { kind: 'word', word: round.word };
  if (settings.undercover) return { kind: 'word', word: round.cousin };
  return {
    kind: 'imposter',
    category: settings.imposterSeesCategory ? categoryName(round.categoryId) : undefined,
  };
}

/**
 * Per-player scoring:
 * - Crew: +1 for voting for an imposter; +1 bonus each if every crew member did.
 * - Imposter: +1 if at least one crew member didn't vote for them; +1 bonus if
 *   nobody did; +1 more if uncaught and they named the secret word.
 * Imposters' own votes never score.
 */
export function scoreRound(round: Round, players: Player[]): RoundScore {
  const isImposter = (id: string) => round.imposterIds.includes(id);
  const crew = players.filter((p) => !isImposter(p.id));
  const score: RoundScore = Object.fromEntries(
    players.map((p) => [p.id, { points: 0, reasons: [] as string[] }]),
  );
  const add = (id: string, reason: string) => {
    score[id].points += 1;
    score[id].reasons.push(reason);
  };

  const crewCaught = crew.filter((p) => isImposter(round.votes[p.id] ?? ''));
  for (const p of crewCaught) add(p.id, 'Spotted an imposter');
  if (crew.length > 0 && crewCaught.length === crew.length) {
    for (const p of crew) add(p.id, 'Whole crew caught them');
  }

  for (const id of round.imposterIds) {
    const votesAgainst = crew.filter((p) => round.votes[p.id] === id).length;
    if (votesAgainst < crew.length) add(id, 'Fooled someone');
    if (votesAgainst === 0) {
      add(id, 'Fooled everyone');
      if (round.guesses[id]) add(id, 'Named the secret word');
    }
  }
  return score;
}

export function uncaughtImposters(round: Round, players: Player[]): string[] {
  const crew = players.filter((p) => !round.imposterIds.includes(p.id));
  return round.imposterIds.filter((id) => !crew.some((p) => round.votes[p.id] === id));
}

export function voteTally(round: Round): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const suspect of Object.values(round.votes)) tally[suspect] = (tally[suspect] ?? 0) + 1;
  return tally;
}
