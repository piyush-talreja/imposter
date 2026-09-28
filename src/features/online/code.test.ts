import { CODE_ALPHABET, extractCode, isValidCode, normalizeCode } from './code';

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

describe('extractCode (paste)', () => {
  it('finds the code in a bare code, a link or the share message', () => {
    expect(extractCode('k7qx')).toBe('K7QX');
    expect(extractCode(' K7 QX ')).toBe('K7QX');
    expect(extractCode('https://imposter.app/join/K7QX')).toBe('K7QX');
    expect(extractCode('exp://1.2.3.4:8081/--/join/k7qx')).toBe('K7QX');
    expect(
      extractCode('Join my Imposter game! Room code K7QX\n\nOpen Imposter → Play online → Join, or tap: imposter://join/K7QX'),
    ).toBe('K7QX');
  });

  it('ignores text without a code', () => {
    expect(extractCode('Join my Imposter game tonight please')).toBe('');
    expect(extractCode('see you at the game K7QX')).toBe('K7QX');
  });
});
