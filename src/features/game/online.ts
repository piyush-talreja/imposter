// Online game flow (Phase 2, M3). Pure and deterministic like engine.ts: the
// server runs these functions and is the only place the full state lives.
// Phones only ever see publicView() and their own card.
//
//   deal → clues → discuss → vote → reveal → (guess → reveal) → clues … → over
//
// A tied vote eliminates nobody and starts another round of clues.

import {
  alive,
  cardFor,
  effectiveRoles,
  eliminate,
  isCorrectGuess,
  newGame,
  nextRound,
  resolveGuess,
  scoreGame,
  type Card,
  type Game,
  type Player,
  type Rng,
  type Role,
  type ScoreLine,
  type Settings,
  type Winner,
} from './engine';
import type { WordEntry } from '@/features/words/words';

export type ClueMode = 'typed' | 'spoken';
export type Phase = 'deal' | 'clues' | 'discuss' | 'vote' | 'reveal' | 'guess' | 'over';

export type Clue = { round: number; by: string; text: string | null };

export type VoteResult = {
  round: number;
  /** Who was voted out, or null on a tie. */
  out: string | null;
  tally: Record<string, number>;
};

export type OnlineState = {
  /** The engine's game, including the secret word and roles. Server only. */
  game: Game;
  phase: Phase;
  mode: ClueMode;
  /** Players who have looked at their card. */
  seen: string[];
  /** Index into this round's speakers (the players still in). */
  turn: number;
  clues: Clue[];
  /** voter → the player whose clue they marked suspicious this round. */
  suspicions: Record<string, string>;
  /** voter → who they voted for. Secret until everyone has voted. */
  votes: Record<string, string>;
  result: VoteResult | null;
  /** Role counts at the start, which everyone is told. */
  roleCounts: { imposter: number; undercover: number };
};

export class OnlineError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
const fail = (code: string): never => {
  throw new OnlineError(code);
};

export const MAX_CLUE_LENGTH = 24;

export function startOnline(args: {
  players: Player[];
  settings: Settings;
  mode: ClueMode;
  words: WordEntry[];
  usedWords: string[];
  history: Record<string, number>;
  rng?: Rng;
}): OnlineState {
  const game = newGame(args);
  return {
    game,
    phase: 'deal',
    mode: args.mode,
    seen: [],
    turn: 0,
    clues: [],
    suspicions: {},
    votes: {},
    result: null,
    roleCounts: effectiveRoles(args.settings, args.players.length),
  };
}

const isPlayer = (s: OnlineState, id: string) => id in s.game.roles;
const isAlive = (s: OnlineState, id: string) => alive(s.game).includes(id);
const requirePhase = (s: OnlineState, ...phases: Phase[]) => {
  if (!phases.includes(s.phase)) fail('wrong_phase');
};
const requireAlive = (s: OnlineState, id: string) => {
  if (!isAlive(s, id)) fail('not_in_game');
};

export const speakers = (s: OnlineState) => alive(s.game);

/** The word on this player's own card, or null for an imposter. */
const ownWord = (game: Game, id: string) =>
  game.roles[id] === 'villager' ? game.word : game.roles[id] === 'undercover' ? game.cousin : null;
export const currentSpeaker = (s: OnlineState) =>
  s.phase === 'clues' ? (speakers(s)[s.turn] ?? null) : null;

/** A player's own card. */
export function myCard(
  s: OnlineState,
  id: string,
  settings: Settings,
  categoryName: (id: string) => string,
): Card {
  if (!isPlayer(s, id)) fail('not_in_game');
  return cardFor(s.game, id, settings, categoryName);
}

export function markSeen(s: OnlineState, id: string): OnlineState {
  requirePhase(s, 'deal');
  if (!isPlayer(s, id)) fail('not_in_game');
  const seen = s.seen.includes(id) ? s.seen : [...s.seen, id];
  const everyone = Object.keys(s.game.roles).every((p) => seen.includes(p));
  return { ...s, seen, phase: everyone ? 'clues' : 'deal', turn: 0 };
}

/**
 * Typed clues are one word, and not the player's own secret word. We only ever
 * check against the player's own card: rejecting a Villager's clue for matching
 * the Undercover's word would tell them what the Undercover's word is.
 */
export function validateClue(text: string, ownWord: string | null): string {
  const clue = text.trim();
  if (!clue) fail('clue_empty');
  if (/\s/.test(clue)) fail('clue_one_word');
  if (clue.length > MAX_CLUE_LENGTH) fail('clue_too_long');
  if (ownWord && isCorrectGuess(clue, ownWord)) fail('clue_is_your_word');
  return clue;
}

function advanceTurn(s: OnlineState, clue: Clue): OnlineState {
  const clues = [...s.clues, clue];
  const turn = s.turn + 1;
  return { ...s, clues, turn, phase: turn >= speakers(s).length ? 'discuss' : 'clues' };
}

export function submitClue(s: OnlineState, id: string, text: string | null): OnlineState {
  requirePhase(s, 'clues');
  if (currentSpeaker(s) !== id) fail('not_your_turn');
  let clue: string | null = null;
  if (s.mode === 'typed') clue = validateClue(text ?? '', ownWord(s.game, id));
  return advanceTurn(s, { round: s.game.round, by: id, text: clue });
}

/** Host moves a stuck turn along (the player's clue is recorded as skipped). */
export function skipTurn(s: OnlineState): OnlineState {
  requirePhase(s, 'clues');
  const by = currentSpeaker(s);
  if (!by) fail('wrong_phase');
  return advanceTurn(s, { round: s.game.round, by: by!, text: null });
}

/** Mark (or unmark) one clue from this round as suspicious. */
export function suspect(s: OnlineState, id: string, clueBy: string | null): OnlineState {
  requirePhase(s, 'clues', 'discuss');
  requireAlive(s, id);
  const suspicions = { ...s.suspicions };
  if (clueBy === null || suspicions[id] === clueBy) {
    delete suspicions[id];
  } else {
    if (clueBy === id) fail('cannot_suspect_self');
    if (!s.clues.some((c) => c.round === s.game.round && c.by === clueBy)) fail('no_such_clue');
    suspicions[id] = clueBy;
  }
  return { ...s, suspicions };
}

export function openVote(s: OnlineState): OnlineState {
  requirePhase(s, 'discuss');
  return { ...s, phase: 'vote', votes: {} };
}

export function castVote(s: OnlineState, id: string, target: string): OnlineState {
  requirePhase(s, 'vote');
  requireAlive(s, id);
  if (!isAlive(s, target)) fail('not_in_game');
  if (target === id) fail('cannot_vote_self');
  const votes = { ...s.votes, [id]: target };
  const everyone = speakers(s).every((p) => p in votes);
  return everyone ? tally({ ...s, votes }) : { ...s, votes };
}

function tally(s: OnlineState): OnlineState {
  const counts: Record<string, number> = {};
  for (const target of Object.values(s.votes)) counts[target] = (counts[target] ?? 0) + 1;
  const top = Math.max(...Object.values(counts));
  const leaders = Object.keys(counts).filter((id) => counts[id] === top);
  const round = s.game.round;
  if (leaders.length > 1) {
    return { ...s, phase: 'reveal', result: { round, out: null, tally: counts } };
  }
  const game = eliminate(s.game, leaders[0]);
  return {
    ...s,
    game,
    phase: game.pendingGuess ? 'guess' : 'reveal',
    result: { round, out: leaders[0], tally: counts },
  };
}

export function guess(s: OnlineState, id: string, text: string): OnlineState {
  requirePhase(s, 'guess');
  if (s.game.pendingGuess !== id) fail('not_your_guess');
  if (!text.trim()) fail('guess_empty');
  return { ...s, game: resolveGuess(s.game, text.trim()), phase: 'reveal' };
}

/** After a reveal: the game is over, or the next round of clues starts. */
export function continueGame(s: OnlineState): OnlineState {
  requirePhase(s, 'reveal');
  if (s.game.over) return { ...s, phase: 'over' };
  return {
    ...s,
    game: nextRound(s.game),
    phase: 'clues',
    turn: 0,
    votes: {},
    suspicions: {},
    result: null,
  };
}

// ---------------------------------------------------------------- what phones see

export type PublicView = {
  phase: Phase;
  mode: ClueMode;
  round: number;
  order: string[];
  /** Voted out, with their role (revealed to everyone when they go). */
  eliminated: { id: string; role: Role }[];
  seen: string[];
  speaker: string | null;
  clues: Clue[];
  /** Clue author → how many players marked it suspicious this round. */
  suspicion: Record<string, number>;
  /** Who has voted (never for whom, until the result). */
  voted: string[];
  result: VoteResult | null;
  pendingGuess: string | null;
  lastGuess: Game['lastGuess'];
  winner: Winner | null;
  /** The game is decided (the results screen may not be showing yet). */
  finished: boolean;
  /** The results screen is showing. */
  over: boolean;
  roleCounts: { imposter: number; undercover: number };
  /** Only once the game is over. */
  reveal: {
    word: string;
    cousin: string;
    roles: Record<string, Role>;
    points: Record<string, ScoreLine[]>;
  } | null;
};

export function publicView(s: OnlineState): PublicView {
  const suspicion: Record<string, number> = {};
  for (const clueBy of Object.values(s.suspicions)) suspicion[clueBy] = (suspicion[clueBy] ?? 0) + 1;
  const over = s.phase === 'over';
  return {
    phase: s.phase,
    mode: s.mode,
    round: s.game.round,
    order: s.game.order,
    eliminated: s.game.eliminated.map((id) => ({ id, role: s.game.roles[id] })),
    seen: s.seen,
    speaker: currentSpeaker(s),
    clues: s.clues,
    suspicion,
    voted: Object.keys(s.votes),
    result: s.phase === 'vote' ? null : s.result,
    pendingGuess: s.game.pendingGuess,
    lastGuess: s.game.lastGuess,
    winner: s.game.winner,
    finished: s.game.over,
    over,
    roleCounts: s.roleCounts,
    reveal: over
      ? { word: s.game.word, cousin: s.game.cousin, roles: s.game.roles, points: scoreGame(s.game) }
      : null,
  };
}
