import { DEFAULT_SETTINGS, type Game, type Role } from './engine';
import {
  castVote,
  continueGame,
  currentSpeaker,
  guess,
  markSeen,
  openVote,
  publicView,
  skipTurn,
  submitClue,
  suspect,
  validateClue,
  type OnlineState,
} from './online';

// Ana, Ben, Cy, Dee = villagers; Eli = undercover; Fay = imposter. Clues go in this order.
const order = ['ana', 'ben', 'cy', 'dee', 'eli', 'fay'];
const roles: Record<string, Role> = {
  ana: 'villager',
  ben: 'villager',
  cy: 'villager',
  dee: 'villager',
  eli: 'undercover',
  fay: 'imposter',
};

const state = (overrides: Partial<OnlineState> = {}, game: Partial<Game> = {}): OnlineState => ({
  game: {
    word: 'Pizza',
    cousin: 'Calzone',
    categoryId: 'food',
    roles,
    order,
    eliminated: [],
    round: 1,
    pendingGuess: null,
    lastGuess: null,
    winner: null,
    over: false,
    ...game,
  },
  phase: 'deal',
  mode: 'typed',
  seen: [],
  turn: 0,
  clues: [],
  suspicions: {},
  votes: {},
  result: null,
  roleCounts: { imposter: 1, undercover: 1 },
  ...overrides,
});

const errorCode = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return 'no error';
};

/** Everyone still in gives a clue, in turn. */
const allClues = (s: OnlineState) => {
  while (s.phase === 'clues') s = submitClue(s, currentSpeaker(s)!, `clue-${currentSpeaker(s)}`);
  return s;
};
/** Everyone still in votes for `target` (and target votes for someone else). */
const everyoneVotes = (s: OnlineState, target: string, fallback = 'ana') => {
  for (const id of order.filter((p) => !s.game.eliminated.includes(p))) {
    s = castVote(s, id, id === target ? fallback : target);
  }
  return s;
};

describe('deal', () => {
  it('moves to clues once everyone has seen their card', () => {
    let s = state();
    for (const id of order.slice(0, 5)) s = markSeen(s, id);
    expect(s.phase).toBe('deal');
    s = markSeen(s, 'fay');
    expect(s.phase).toBe('clues');
    expect(currentSpeaker(s)).toBe('ana');
  });

  it('only players in the game can mark seen', () => {
    expect(errorCode(() => markSeen(state(), 'zed'))).toBe('not_in_game');
  });
});

describe('typed clues', () => {
  it('go in turn, then discussion opens', () => {
    let s = state({ phase: 'clues' });
    expect(errorCode(() => submitClue(s, 'ben', 'cheesy'))).toBe('not_your_turn');
    s = allClues(s);
    expect(s.phase).toBe('discuss');
    expect(s.clues.map((c) => c.by)).toEqual(order);
  });

  it('must be one word and not too long', () => {
    expect(errorCode(() => validateClue('   ', 'Pizza'))).toBe('clue_empty');
    expect(errorCode(() => validateClue('hot cheese', 'Pizza'))).toBe('clue_one_word');
    expect(errorCode(() => validateClue('x'.repeat(25), 'Pizza'))).toBe('clue_too_long');
    expect(validateClue('  cheesy ', 'Pizza')).toBe('cheesy');
  });

  it('cannot be your own word', () => {
    const s = state({ phase: 'clues' });
    expect(errorCode(() => submitClue(s, 'ana', 'pizzas'))).toBe('clue_is_your_word');
  });

  it('only checks your own word, so it never leaks the other one', () => {
    // A villager may say "Calzone" (the undercover's word) without being told it's special.
    const s = submitClue(state({ phase: 'clues' }), 'ana', 'Calzone');
    expect(s.clues[0].text).toBe('Calzone');
    // The undercover is blocked from their own word, Calzone, but not from Pizza.
    const u = state({ phase: 'clues', turn: 4 });
    expect(errorCode(() => submitClue(u, 'eli', 'Calzone'))).toBe('clue_is_your_word');
    expect(submitClue(u, 'eli', 'Pizza').clues[0].text).toBe('Pizza');
  });

  it('spoken mode just records the turn', () => {
    const s = submitClue(state({ phase: 'clues', mode: 'spoken' }), 'ana', 'ignored');
    expect(s.clues[0]).toEqual({ round: 1, by: 'ana', text: null });
  });

  it('the host can skip a stuck turn', () => {
    const s = skipTurn(state({ phase: 'clues' }));
    expect(s.clues[0]).toEqual({ round: 1, by: 'ana', text: null });
    expect(currentSpeaker(s)).toBe('ben');
  });
});

describe('suspicion', () => {
  const discussing = () => allClues(state({ phase: 'clues' }));

  it('marks, moves and unmarks one clue per player per round', () => {
    let s = suspect(discussing(), 'ana', 'fay');
    s = suspect(s, 'ben', 'fay');
    expect(publicView(s).suspicion).toEqual({ fay: 2 });
    s = suspect(s, 'ana', 'cy');
    expect(publicView(s).suspicion).toEqual({ fay: 1, cy: 1 });
    s = suspect(s, 'ana', 'cy');
    expect(publicView(s).suspicion).toEqual({ fay: 1 });
  });

  it('cannot target yourself or a clue that does not exist', () => {
    expect(errorCode(() => suspect(discussing(), 'ana', 'ana'))).toBe('cannot_suspect_self');
    expect(errorCode(() => suspect(state({ phase: 'clues' }), 'ana', 'ben'))).toBe('no_such_clue');
  });
});

describe('voting', () => {
  const voting = () => openVote(allClues(state({ phase: 'clues' })));

  it('is secret until everyone has voted', () => {
    const s = castVote(voting(), 'ana', 'fay');
    const view = publicView(s);
    expect(view.voted).toEqual(['ana']);
    expect(view.result).toBeNull();
    expect(JSON.stringify(view)).not.toContain('"votes"');
  });

  it('rejects voting for yourself, twice-voting changes your vote', () => {
    expect(errorCode(() => castVote(voting(), 'ana', 'ana'))).toBe('cannot_vote_self');
    const s = castVote(castVote(voting(), 'ana', 'ben'), 'ana', 'fay');
    expect(s.votes.ana).toBe('fay');
  });

  it('a clear winner is voted out; a caught imposter must guess', () => {
    const s = everyoneVotes(voting(), 'fay');
    expect(s.result?.out).toBe('fay');
    expect(s.phase).toBe('guess');
    expect(publicView(s).pendingGuess).toBe('fay');
  });

  it('a tie means nobody is out, and another round of clues starts', () => {
    let s = voting();
    for (const [voter, target] of [
      ['ana', 'fay'],
      ['ben', 'fay'],
      ['cy', 'fay'],
      ['dee', 'eli'],
      ['eli', 'dee'],
      ['fay', 'dee'],
    ])
      s = castVote(s, voter, target);
    // fay 3, dee 2, eli 1: not a tie
    expect(s.result?.out).toBe('fay');

    let t = voting();
    for (const [voter, target] of [
      ['ana', 'fay'],
      ['ben', 'fay'],
      ['cy', 'fay'],
      ['dee', 'eli'],
      ['eli', 'ana'],
      ['fay', 'eli'],
    ])
      t = castVote(t, voter, target);
    expect(t.result?.out).toBe('fay');

    let tie = voting();
    for (const [voter, target] of [
      ['ana', 'fay'],
      ['ben', 'fay'],
      ['cy', 'eli'],
      ['dee', 'eli'],
      ['eli', 'ana'],
      ['fay', 'ben'],
    ])
      tie = castVote(tie, voter, target);
    expect(tie.result).toMatchObject({ out: null, tally: { fay: 2, eli: 2, ana: 1, ben: 1 } });
    expect(tie.phase).toBe('reveal');
    const next = continueGame(tie);
    expect(next.phase).toBe('clues');
    expect(next.game.round).toBe(2);
    expect(next.game.eliminated).toEqual([]);
  });

  it('players who are out cannot vote or be voted for', () => {
    const s = voting();
    const out = { ...s, game: { ...s.game, eliminated: ['ana'] } };
    expect(errorCode(() => castVote(out, 'ana', 'fay'))).toBe('not_in_game');
    expect(errorCode(() => castVote(out, 'ben', 'ana'))).toBe('not_in_game');
  });
});

describe('guess, rounds and the end', () => {
  const caught = () => everyoneVotes(openVote(allClues(state({ phase: 'clues' }))), 'fay');

  it('only the caught imposter can guess', () => {
    expect(errorCode(() => guess(caught(), 'ana', 'Pizza'))).toBe('not_your_guess');
  });

  it('a correct guess ends the game for the imposter', () => {
    const revealed = guess(caught(), 'fay', 'pizza');
    // Decided at the reveal, before the results screen shows.
    expect(publicView(revealed)).toMatchObject({ finished: true, over: false });
    const s = continueGame(revealed);
    expect(s.phase).toBe('over');
    expect(publicView(s).winner).toBe('imposters');
  });

  it('a wrong guess starts the undercover bonus round', () => {
    const revealed = guess(caught(), 'fay', 'Pasta');
    expect(publicView(revealed).finished).toBe(false);
    const s = continueGame(revealed);
    expect(s.phase).toBe('clues');
    expect(s.game.winner).toBe('villagers');
    expect(s.game.over).toBe(false);
    // Fay is out: clues skip her.
    expect(
      allClues(s)
        .clues.filter((c) => c.round === 2)
        .map((c) => c.by),
    ).toEqual(['ana', 'ben', 'cy', 'dee', 'eli']);
  });

  it('secrets appear in the public view only once the game is over', () => {
    const playing = publicView(caught());
    expect(playing.reveal).toBeNull();
    expect(JSON.stringify(playing)).not.toMatch(/Pizza|Calzone/);
    const over = publicView(continueGame(guess(caught(), 'fay', 'pizza')));
    expect(over.reveal?.word).toBe('Pizza');
    expect(over.reveal?.points.fay?.[0].points).toBeGreaterThan(0);
  });

  it('revealed roles are public only for players who are out', () => {
    const view = publicView(caught());
    expect(view.eliminated).toEqual([{ id: 'fay', role: 'imposter' }]);
    // No field maps players to roles, apart from those who are out.
    expect(JSON.stringify(view)).not.toMatch(/"(eli|ana|ben|cy|dee)":"(villager|undercover|imposter)"/);
  });
});

describe('settings passthrough', () => {
  it('uses DEFAULT_SETTINGS shape', () => {
    expect(DEFAULT_SETTINGS.imposterNeverFirst).toBe(true);
  });
});
