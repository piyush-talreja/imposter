import { WORDS, type WordEntry } from '@/features/words/words';

import {
  DEFAULT_SETTINGS,
  cardFor,
  clueOrder,
  maxImposters,
  newRound,
  pickImposters,
  pickWord,
  scoreRound,
  uncaughtImposters,
  voteTally,
  wordPool,
  type Player,
  type Round,
} from './engine';

/** Deterministic rng that cycles through the given values. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const players: Player[] = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli'].map((name) => ({
  id: name.toLowerCase(),
  name,
}));

const baseRound = (overrides: Partial<Round> = {}): Round => ({
  word: 'Pizza',
  cousin: 'Calzone',
  categoryId: 'food',
  imposterIds: ['eli'],
  order: players.map((p) => p.id),
  votes: {},
  guesses: {},
  ...overrides,
});

describe('maxImposters', () => {
  it.each([
    [3, 1],
    [6, 1],
    [7, 2],
    [9, 2],
    [10, 3],
  ])('%i players -> %i', (n, expected) => expect(maxImposters(n)).toBe(expected));
});

describe('wordPool / pickWord', () => {
  it('filters by category and difficulty; empty categories means all', () => {
    const all = wordPool(WORDS, { ...DEFAULT_SETTINGS, difficulties: ['easy', 'medium', 'hard'] });
    expect(all).toHaveLength(WORDS.length);
    const food = wordPool(WORDS, { ...DEFAULT_SETTINGS, categoryIds: ['food'], difficulties: ['easy'] });
    expect(food.length).toBeGreaterThan(0);
    expect(food.every((w) => w.categoryId === 'food' && w.difficulty === 'easy')).toBe(true);
  });

  it('avoids recently used words until the pool runs out', () => {
    const pool: WordEntry[] = [
      { word: 'A', cousin: 'a', difficulty: 'easy', categoryId: 'x' },
      { word: 'B', cousin: 'b', difficulty: 'easy', categoryId: 'x' },
    ];
    expect(pickWord(pool, ['A'], seq(0)).word).toBe('B');
    expect(['A', 'B']).toContain(pickWord(pool, ['A', 'B'], seq(0.9)).word);
  });

  it('throws on an empty pool', () => {
    expect(() => pickWord([], [], Math.random)).toThrow(/No words/);
  });
});

describe('pickImposters', () => {
  it('never picks the same player twice and leaves at least one crew member', () => {
    const ids = pickImposters(players.slice(0, 3), 5, {}, Math.random);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('favours players who have been imposter less often', () => {
    const history = { ana: 50, ben: 50, cy: 50, dee: 50 };
    const counts: Record<string, number> = {};
    for (let i = 0; i < 500; i++) {
      const [id] = pickImposters(players, 1, history, Math.random);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    expect(counts.eli).toBeGreaterThan(400);
  });
});

describe('clueOrder', () => {
  it('rotates from a random start, keeping clockwise order', () => {
    expect(clueOrder(players, seq(0.4))).toEqual(['cy', 'dee', 'eli', 'ana', 'ben']);
  });
});

describe('newRound', () => {
  it('requires 3 players', () => {
    expect(() =>
      newRound({
        players: players.slice(0, 2),
        settings: DEFAULT_SETTINGS,
        words: WORDS,
        usedWords: [],
        imposterHistory: {},
      }),
    ).toThrow(/at least 3/);
  });

  it('caps imposters for small groups', () => {
    const round = newRound({
      players,
      settings: { ...DEFAULT_SETTINGS, imposterCount: 3 },
      words: WORDS,
      usedWords: [],
      imposterHistory: {},
    });
    expect(round.imposterIds).toHaveLength(1);
    expect(round.order).toHaveLength(players.length);
  });
});

describe('cardFor', () => {
  const name = () => 'Food';
  const round = baseRound();

  it('crew sees the word', () => {
    expect(cardFor(round, 'ana', DEFAULT_SETTINGS, name)).toEqual({ kind: 'word', word: 'Pizza' });
  });

  it('imposter sees Imposter, optionally with category', () => {
    expect(cardFor(round, 'eli', DEFAULT_SETTINGS, name)).toEqual({ kind: 'imposter' });
    expect(cardFor(round, 'eli', { ...DEFAULT_SETTINGS, imposterSeesCategory: true }, name)).toEqual({
      kind: 'imposter',
      category: 'Food',
    });
  });

  it('undercover imposter secretly gets the cousin word', () => {
    expect(cardFor(round, 'eli', { ...DEFAULT_SETTINGS, undercover: true }, name)).toEqual({
      kind: 'word',
      word: 'Calzone',
    });
  });
});

describe('scoreRound', () => {
  it('whole crew catches the imposter: crew get 2 each, imposter 0', () => {
    const round = baseRound({ votes: { ana: 'eli', ben: 'eli', cy: 'eli', dee: 'eli', eli: 'ana' } });
    const s = scoreRound(round, players);
    expect(s.ana.points).toBe(2);
    expect(s.dee.points).toBe(2);
    expect(s.eli.points).toBe(0);
  });

  it('split vote: catchers get 1, imposter gets 1 for fooling someone', () => {
    const round = baseRound({ votes: { ana: 'eli', ben: 'eli', cy: 'ana', dee: 'ben' } });
    const s = scoreRound(round, players);
    expect(s.ana.points).toBe(1);
    expect(s.cy.points).toBe(0);
    expect(s.eli.points).toBe(1);
    expect(uncaughtImposters(round, players)).toEqual([]);
  });

  it('perfect imposter round: fooled everyone and named the word = 3', () => {
    const round = baseRound({
      votes: { ana: 'ben', ben: 'cy', cy: 'dee', dee: 'ana' },
      guesses: { eli: true },
    });
    const s = scoreRound(round, players);
    expect(s.eli.points).toBe(3);
    expect(s.eli.reasons).toEqual(['Fooled someone', 'Fooled everyone', 'Named the secret word']);
    expect(uncaughtImposters(round, players)).toEqual(['eli']);
  });

  it('a guess does not count if the imposter was caught by anyone', () => {
    const round = baseRound({ votes: { ana: 'eli' }, guesses: { eli: true } });
    expect(scoreRound(round, players).eli.points).toBe(1);
  });

  it('with two imposters, a vote for either counts as a catch', () => {
    const round = baseRound({
      imposterIds: ['dee', 'eli'],
      votes: { ana: 'dee', ben: 'eli', cy: 'eli' },
    });
    const s = scoreRound(round, players);
    expect([s.ana.points, s.ben.points, s.cy.points]).toEqual([2, 2, 2]);
    expect(s.dee.points).toBe(1);
    expect(s.eli.points).toBe(1);
  });
});

describe('voteTally', () => {
  it('counts votes per suspect', () => {
    expect(voteTally(baseRound({ votes: { ana: 'eli', ben: 'eli', cy: 'ana' } }))).toEqual({
      eli: 2,
      ana: 1,
    });
  });
});
