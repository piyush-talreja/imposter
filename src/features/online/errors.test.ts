import { friendlyError } from './errors';

describe('friendlyError', () => {
  it('maps server codes to plain language', () => {
    expect(friendlyError({ message: 'room_not_found' })).toMatch(/No room with that code/);
    expect(friendlyError(new Error('ERROR: kicked'))).toMatch(/removed you/);
  });

  it('recognises network failures', () => {
    expect(friendlyError(new Error('TypeError: Failed to fetch'))).toMatch(/internet/);
  });

  it('never shows raw errors', () => {
    expect(friendlyError(new Error('duplicate key value violates unique constraint'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
