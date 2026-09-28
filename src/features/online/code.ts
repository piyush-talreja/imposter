// Room codes: 4 characters from an alphabet with no look-alikes (no 0/O, 1/I/L).
// Must match rooms.code's check constraint and new_room_code() in the database.
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;

/** What a player typed or pasted → a clean code: uppercase, anything not in the alphabet dropped. */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter((c) => CODE_ALPHABET.includes(c))
    .join('')
    .slice(0, CODE_LENGTH);
}

export const isValidCode = (code: string) =>
  code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));

/**
 * Find a room code in anything a player might paste: a bare code, a join link
 * (".../join/K7QX"), or the whole share message ("... Room code K7QX ...").
 */
export function extractCode(text: string): string {
  const upper = text.toUpperCase();
  const fromLink = upper.match(/\/JOIN\/([A-Z0-9]{4})\b/);
  if (fromLink && isValidCode(fromLink[1])) return fromLink[1];
  const afterWord = upper.match(/\bCODE[:\s]+([A-Z0-9]{4})\b/);
  if (afterWord && isValidCode(afterWord[1])) return afterWord[1];
  // A loose 4-letter token only counts if it has a digit: plain words like "GAME"
  // are made of valid letters too. (Links and "code XXXX" are handled above.)
  const standalone = upper.match(/\b[A-HJ-KM-NP-Z2-9]{4}\b/g)?.find((t) => isValidCode(t) && /\d/.test(t));
  if (standalone) return standalone;
  // Short, code-like input with stray spaces or dashes ("k7 qx").
  return text.length <= 12 ? normalizeCode(text) : '';
}
