import { CATEGORIES, WORDS } from './words';

// Guards the word-quality rules from the header comment in words.ts.
describe('word list quality', () => {
  it('has no duplicate words', () => {
    const seen = WORDS.map((w) => w.word.toLowerCase());
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('every word has a distinct cousin', () => {
    for (const w of WORDS) {
      expect(w.cousin.trim()).not.toBe('');
      expect(w.cousin.toLowerCase()).not.toBe(w.word.toLowerCase());
    }
  });

  it('every category offers easy words (kids mode)', () => {
    for (const c of CATEGORIES) {
      expect(WORDS.some((w) => w.categoryId === c.id && w.difficulty === 'easy')).toBe(true);
    }
  });
});
