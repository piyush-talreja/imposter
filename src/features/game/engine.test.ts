import { WORDS, type WordEntry } from '@/features/words/words';

import {
  DEFAULT_SETTINGS,
  alive,
  assignRoles,
  cardFor,
  checkWinner,
  clueOrder,
  effectiveRoles,
  eliminate,
  isCorrectGuess,
  maxInfiltrators,
  maxUndercover,
  newGame,
  nextRound,
  pickWeighted,
  pickWord,
  resolveGuess,
  scoreGame,
  suggestRoles,
  wordPool,
  type Game,
  type Player,
  type Role,
} from './engine';

/** Deterministic rng that cycles through the given values. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const players: Player[] = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay'].map((name) => ({
  id: name.toLowerCase(),
  name,
}));

// Ana, Ben, Cy, Dee = villagers; Eli = undercover; Fay = imposter
const baseGame = (overrides: Partial<Game> = {}): Game => ({
  word: 'Pizza',
  cousin: 'Calzone',
  categoryId: 'food',
  roles: {
    ana: 'villager',
    ben: 'villager',
    cy: 'villager',
    dee: 'villager',
    eli: 'undercover',
    fay: 'imposter',
  },
  order: players.map((p) => p.id),
  eliminated: [],
  round: 1,
  pendingGuess: null,
  lastGuess: null,
  winner: null,
  ...overrides,
});

describe('role counts', () => {
  const manual = (undercover: number, imposter: number) => ({
    ...DEFAULT_SETTINGS,
    autoRoles: false,
    roles: { undercover, imposter },
  });

  it('suggests sensible splits by group size', () => {
    expect(suggestRoles(3)).toEqual({ undercover: 0, imposter: 1 });
    expect(suggestRoles(4)).toEqual({ undercover: 0, imposter: 1 });
    expect(suggestRoles(5)).toEqual({ undercover: 1, imposter: 1 });
    expect(suggestRoles(8)).toEqual({ undercover: 2, imposter: 1 });
  });

  it('always has at least one imposter', () => {
    expect(effectiveRoles(manual(0, 0), 5)).toEqual({ undercover: 0, imposter: 1 });
    expect(effectiveRoles(manual(2, 0), 6)).toEqual({ undercover: 1, imposter: 1 });
  });

  it('undercover is optional', () => {
    expect(effectiveRoles(manual(0, 1), 8)).toEqual({ undercover: 0, imposter: 1 });
  });

  it('3 players: imposter only, no undercover', () => {
    expect(maxUndercover(3, 1)).toBe(0);
    expect(effectiveRoles(manual(1, 1), 3)).toEqual({ undercover: 0, imposter: 1 });
  });

  it('4 players may add one undercover', () => {
    expect(effectiveRoles(manual(1, 1), 4)).toEqual({ undercover: 1, imposter: 1 });
    expect(effectiveRoles(manual(3, 1), 4)).toEqual({ undercover: 1, imposter: 1 });
  });

  it('keeps villagers in the majority from 5 players', () => {
    expect(maxInfiltrators(5)).toBe(2);
    expect(maxInfiltrators(6)).toBe(2);
    expect(effectiveRoles(manual(5, 5), 6)).toEqual({ undercover: 0, imposter: 2 });
  });
});

describe('wordPool / pickWord', () => {
  it('filters by category and difficulty; empty categories means all', () => {
    const all = wordPool(WORDS, { ...DEFAULT_SETTINGS, difficulties: ['easy', 'medium', 'hard'] });
    expect(all).toHaveLength(WORDS.length);
    const food = wordPool(WORDS, { ...DEFAULT_SETTINGS, categoryIds: ['food'], difficulties: ['easy'] });
    expect(food.every((w) => w.categoryId === 'food' && w.difficulty === 'easy')).toBe(true);
  });

  it('avoids recently used words until the pool runs out', () => {
    const pool: WordEntry[] = [
      { word: 'A', cousin: 'a', difficulty: 'easy', categoryId: 'x' },
      { word: 'B', cousin: 'b', difficulty: 'easy', categoryId: 'x' },
    ];
    expect(pickWord(pool, ['A'], seq(0)).word).toBe('B');
    expect(() => pickWord([], [], Math.random)).toThrow(/No words/);
  });
});

describe('assigning roles', () => {
  it('assigns exactly the requested roles', () => {
    const roles = assignRoles(players, { undercover: 2, imposter: 1 }, {}, Math.random);
    const count = (r: Role) => Object.values(roles).filter((x) => x === r).length;
    expect([count('villager'), count('undercover'), count('imposter')]).toEqual([3, 2, 1]);
  });

  it('favours players who have been infiltrators less often', () => {
    const history = { ana: 50, ben: 50, cy: 50, dee: 50, eli: 50 };
    let fay = 0;
    for (let i = 0; i < 500; i++)
      if (
        pickWeighted(
          players.map((p) => p.id),
          1,
          history,
          Math.random,
        )[0] === 'fay'
      )
        fay++;
    expect(fay).toBeGreaterThan(400);
  });

  it('never lets the imposter speak first when that rule is on', () => {
    const roles = baseGame().roles;
    for (let r = 0; r < 1; r += 0.05) {
      expect(roles[clueOrder(players, roles, true, () => r)[0]]).not.toBe('imposter');
    }
    expect(clueOrder(players, roles, false, seq(0.99))[0]).toBe('fay');
  });

  it('newGame requires 3 players', () => {
    expect(() =>
      newGame({
        players: players.slice(0, 2),
        settings: DEFAULT_SETTINGS,
        words: WORDS,
        usedWords: [],
        history: {},
      }),
    ).toThrow(/at least 3/);
  });
});

describe('cards', () => {
  const name = () => 'Food';
  const game = baseGame();
  it('villager gets the word, undercover the cousin, imposter nothing', () => {
    expect(cardFor(game, 'ana', DEFAULT_SETTINGS, name)).toEqual({ kind: 'word', word: 'Pizza' });
    expect(cardFor(game, 'eli', DEFAULT_SETTINGS, name)).toEqual({ kind: 'word', word: 'Calzone' });
    expect(cardFor(game, 'fay', DEFAULT_SETTINGS, name)).toEqual({ kind: 'imposter' });
    expect(cardFor(game, 'fay', { ...DEFAULT_SETTINGS, imposterSeesCategory: true }, name)).toEqual({
      kind: 'imposter',
      category: 'Food',
    });
  });
});

describe('elimination flow', () => {
  it('eliminating a villager continues the game', () => {
    const g = eliminate(baseGame(), 'ana');
    expect(g.winner).toBeNull();
    expect(alive(g)).not.toContain('ana');
    expect(nextRound(g).round).toBe(2);
  });

  it('villagers win once every infiltrator is out', () => {
    let g = eliminate(baseGame(), 'eli');
    g = eliminate(g, 'fay');
    expect(g.pendingGuess).toBe('fay');
    g = resolveGuess(g, 'Calzone');
    expect(g.lastGuess?.correct).toBe(false);
    expect(g.winner).toBe('villagers');
  });

  it('an eliminated imposter who names the word wins outright', () => {
    const g = resolveGuess(eliminate(baseGame(), 'fay'), '  pizzas! ');
    expect(g.winner).toBe('imposter-guess');
    expect(scoreGame(g)).toEqual({ fay: 6 });
  });

  it('the group can override a near-miss guess as correct', () => {
    const g = resolveGuess(eliminate(baseGame(), 'fay'), 'pizza pie', true);
    expect(g.winner).toBe('imposter-guess');
  });

  it('infiltrators win when only one villager is left', () => {
    let g = baseGame();
    for (const id of ['ana', 'ben', 'cy']) g = eliminate(g, id);
    expect(g.winner).toBe('infiltrators');
    expect(scoreGame(g)).toEqual({ eli: 5, fay: 6 });
  });

  it('ignores eliminations while a guess is pending or after the game ends', () => {
    const pending = eliminate(baseGame(), 'fay');
    expect(eliminate(pending, 'ana')).toBe(pending);
    const over = { ...baseGame(), winner: 'villagers' as const };
    expect(eliminate(over, 'ana')).toBe(over);
  });

  it('checkWinner on a fresh game is null', () => {
    expect(checkWinner(baseGame())).toBeNull();
  });

  it('villager win scores every villager, eliminated or not', () => {
    const g = { ...baseGame(), eliminated: ['ana', 'eli', 'fay'], winner: 'villagers' as const };
    expect(scoreGame(g)).toEqual({ ana: 2, ben: 2, cy: 2, dee: 2 });
  });
});

describe('isCorrectGuess', () => {
  it.each([
    ['Ice cream', 'Ice Cream', true],
    ['icecream', 'Ice Cream', true],
    ['Hot dog', 'Hot Dog', true],
    ['', 'Pizza', false],
    ['Pasta', 'Pizza', false],
  ])('%s vs %s -> %s', (guess, word, expected) => expect(isCorrectGuess(guess, word)).toBe(expected));
});
