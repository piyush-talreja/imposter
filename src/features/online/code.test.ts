import { CODE_ALPHABET, isValidCode, normalizeCode } from './code';

describe('room codes', () => {
  it('uses no look-alike characters', () => {
    for (const c of '0O1IL') expect(CODE_ALPHABET).not.toContain(c);
  });

  it('normalizes what people type or paste', () => {
    expect(normalizeCode('k7qx')).toBe('K7QX');
    expect(normalizeCode(' K7 - QX ')).toBe('K7QX');
    expect(normalizeCode('K7QXTRA')).toBe('K7QX');
    // Look-alikes can't be in a code, so they're dropped rather than guessed.
    expect(normalizeCode('KOQX')).toBe('KQX');
  });

  it('validates complete codes only', () => {
    expect(isValidCode('K7QX')).toBe(true);
    expect(isValidCode('K7Q')).toBe(false);
    expect(isValidCode('K7QO')).toBe(false);
  });
});
