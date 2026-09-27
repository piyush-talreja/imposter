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
