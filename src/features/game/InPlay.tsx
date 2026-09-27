import { StyleSheet, Text, View } from 'react-native';

import { RoleMark } from '@/components/ui';
import { colors, fonts, radius, size, space } from '@/theme/tokens';

import { alive, type Game } from './engine';

/**
 * What's still out there, so nobody has to remember (recognition over recall).
 * Counts only: role reveals are public, identities are not.
 */
export function InPlay({ game }: { game: Game }) {
  const left = alive(game);
  const count = (role: 'imposter' | 'undercover') => left.filter((id) => game.roles[id] === role).length;
  const items = [
    { role: 'imposter' as const, n: count('imposter'), label: 'Imposter' },
    { role: 'undercover' as const, n: count('undercover'), label: 'Undercover' },
  ].filter((i) => i.n > 0);
  if (items.length === 0) return null;
  return (
    <View
      style={styles.row}
      accessibilityLabel={`Still in: ${items.map((i) => `${i.n} ${i.label}`).join(', ')}`}
    >
      <Text style={styles.label}>Still in</Text>
      {items.map((i) => (
        <View key={i.role} style={styles.chip}>
          <RoleMark role={i.role} size={14} />
          <Text style={styles.text}>
            {i.n} {i.label}
            {i.n > 1 ? 's' : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Asked before leaving a game in progress. */
export const QUIT_CONFIRM = {
  title: 'Leave the game?',
  message: 'It’s saved. You can resume from the home screen.',
  confirmLabel: 'Leave',
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  label: { color: colors.textSoft, fontFamily: fonts.bodyBold, fontSize: size.small - 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.raised,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 4,
  },
  text: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.small - 1 },
});
