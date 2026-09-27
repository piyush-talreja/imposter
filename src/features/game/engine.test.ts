import { WORDS, type WordEntry } from '@/features/words/words';

import {
  DEFAULT_SETTINGS,
  POINTS,
  alive,
  assignRoles,
  cardFor,
  clueOrder,
  effectiveRoles,
  eliminate,
  inBonusRound,
  isCorrectGuess,
  maxImposters,
  maxInfiltrators,
  maxUndercover,
  newGame,
  nextRound,
  pickWeighted,
  pickWord,
  resolveGuess,
  scoreGame,
  suggestRoles,
  totalPoints,
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
  over: false,
  ...overrides,
});

const points = (g: Game) =>
  Object.fromEntries(Object.entries(scoreGame(g)).map(([id, lines]) => [id, totalPoints(lines)]));

describe('role counts', () => {
  const manual = (undercover: number, imposter: number) => ({
    ...DEFAULT_SETTINGS,
    autoRoles: false,
    roles: { undercover, imposter },
  });

  it('suggests sensible splits by group size', () => {
    expect(suggestRoles(3)).toEqual({ undercover: 0, imposter: 1 });
    expect(suggestRoles(5)).toEqual({ undercover: 1, imposter: 1 });
    expect(suggestRoles(8)).toEqual({ undercover: 2, imposter: 1 });
    expect(suggestRoles(11)).toEqual({ undercover: 2, imposter: 2 });
  });

  it('suggestions always respect the caps', () => {
    for (let n = 3; n <= 20; n++) {
      const s = suggestRoles(n);
      expect(effectiveRoles({ ...DEFAULT_SETTINGS, autoRoles: true }, n)).toEqual(s);
    }
  });

  it('caps imposters by group size', () => {
    expect([3, 5, 6, 9, 10, 20].map(maxImposters)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(effectiveRoles(manual(0, 5), 8).imposter).toBe(2);
  });

  it('caps undercovers by group size', () => {
    expect(maxUndercover(3, 1)).toBe(0);
    expect(maxUndercover(4, 1)).toBe(1);
    expect(maxUndercover(6, 1)).toBe(1);
    expect(maxUndercover(9, 1)).toBe(2);
    expect(maxUndercover(20, 1)).toBe(3);
    expect(effectiveRoles(manual(9, 1), 6)).toEqual({ undercover: 1, imposter: 1 });
  });

  it('always has at least one imposter; undercover is optional', () => {
    expect(effectiveRoles(manual(0, 0), 5)).toEqual({ undercover: 0, imposter: 1 });
    expect(effectiveRoles(manual(0, 1), 8)).toEqual({ undercover: 0, imposter: 1 });
  });

  it('villagers are never outnumbered at the start', () => {
    for (let n = 3; n <= 20; n++) {
      const r = effectiveRoles(manual(9, 9), n);
      expect(r.undercover + r.imposter).toBeLessThanOrEqual(maxInfiltrators(n));
      expect(n - r.undercover - r.imposter).toBeGreaterThanOrEqual(r.undercover + r.imposter);
    }
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
    for (let i = 0; i < 500; i++) {
      if (
        pickWeighted(
          players.map((p) => p.id),
          1,
          history,
          Math.random,
        )[0] === 'fay'
      )
        fay++;
    }
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

describe('stage 1: find the imposter', () => {
  it('voting out a villager continues the game', () => {
    const g = eliminate(baseGame(), 'ana');
    expect(g.winner).toBeNull();
    expect(alive(g)).not.toContain('ana');
    expect(nextRound(g).round).toBe(2);
  });

  it('a caught imposter must guess before anything else happens', () => {
    const pending = eliminate(baseGame(), 'fay');
    expect(pending.pendingGuess).toBe('fay');
    expect(eliminate(pending, 'ana')).toBe(pending);
  });

  it('a correct guess wins outright for the imposter', () => {
    const g = resolveGuess(eliminate(baseGame(), 'fay'), '  pizzas! ');
    expect(g.winner).toBe('imposters');
    expect(g.over).toBe(true);
    // The undercover was never caught, so they still get their bonus.
    expect(points(g)).toEqual({ fay: POINTS.imposterWins, eli: POINTS.undercoverUndetected });
  });

  it('the table can accept a near-miss guess', () => {
    expect(resolveGuess(eliminate(baseGame(), 'fay'), 'pizza pie', true).winner).toBe('imposters');
  });

  it('the imposter wins by surviving until no longer outnumbered', () => {
    const roles: Record<string, Role> = { ana: 'villager', ben: 'villager', fay: 'imposter' };
    const g = eliminate(baseGame({ roles, order: ['ana', 'ben', 'fay'] }), 'ana');
    expect(g.winner).toBe('imposters');
    expect(g.over).toBe(true);
    expect(points(g)).toEqual({ fay: POINTS.imposterWins });
  });

  it('an undercover voted out early is a caught undercover', () => {
    let g = eliminate(baseGame(), 'eli');
    expect(g.winner).toBeNull();
    g = resolveGuess(eliminate(g, 'fay'), 'Calzone');
    // Imposter caught and no undercover left: game over, no bonus round.
    expect(g.winner).toBe('villagers');
    expect(g.over).toBe(true);
    expect(points(g).ana).toBe(POINTS.imposterCaught + POINTS.undercoverCaught);
    expect(points(g).eli).toBe(POINTS.imposterCaught);
    expect(points(g).fay).toBeUndefined();
  });
});

describe('stage 2: the undercover bonus round', () => {
  const imposterCaught = () => resolveGuess(eliminate(baseGame(), 'fay'), 'Pasta');

  it('starts when the imposter is caught and an undercover is still in', () => {
    const g = imposterCaught();
    expect(g.winner).toBe('villagers');
    expect(g.over).toBe(false);
    expect(inBonusRound(g)).toBe(true);
    expect(nextRound(g).round).toBe(2);
  });

  it('villagers earn the bonus for catching the undercover', () => {
    const g = eliminate(imposterCaught(), 'eli');
    expect(g.over).toBe(true);
    expect(points(g)).toEqual({
      ana: POINTS.imposterCaught + POINTS.undercoverCaught,
      ben: POINTS.imposterCaught + POINTS.undercoverCaught,
      cy: POINTS.imposterCaught + POINTS.undercoverCaught,
      dee: POINTS.imposterCaught + POINTS.undercoverCaught,
      eli: POINTS.imposterCaught,
    });
  });

  it('an undercover who survives to the last villager earns the bonus', () => {
    let g = imposterCaught();
    for (const id of ['ana', 'ben', 'cy']) g = eliminate(g, id);
    expect(g.over).toBe(true);
    expect(g.winner).toBe('villagers');
    expect(points(g).eli).toBe(POINTS.imposterCaught + POINTS.undercoverUndetected);
    expect(points(g).dee).toBe(POINTS.imposterCaught);
  });

  it('scores are only awarded once the game is over', () => {
    expect(scoreGame(imposterCaught())).toEqual({});
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
