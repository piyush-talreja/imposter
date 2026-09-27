import { StyleSheet, Text, View } from 'react-native';

import { Body, Card, RoleMark, Screen } from '@/components/ui';
import { POINTS } from '@/features/game/engine';
import { OUTLINE, ROLE_META, colors, fonts, size, space } from '@/theme/tokens';

const ROLES = {
  villager: 'Most players. Everyone shares the word.',
  undercover: 'Optional, from 4 players. Gets a similar word and doesn’t know it.',
  imposter: 'At least one per game. Gets no word, and knows it.',
} as const;

const STEPS = [
  'Pass the phone round. Hold the card to see your word.',
  'Everyone still in says one word as a clue.',
  'Discuss, then vote one player out. Their role is revealed.',
  'A caught Imposter gets one guess. If it’s right, they win.',
  'Once the Imposter is caught, a bonus round hunts any Undercover still in.',
];

const SCORING: [string, number][] = [
  ['Imposter caught: every Villager and Undercover', POINTS.imposterCaught],
  ['Imposter wins: the Imposter', POINTS.imposterWins],
  ['Undercover caught: every Villager', POINTS.undercoverCaught],
  ['Undercover never caught: that Undercover', POINTS.undercoverUndetected],
];

export default function HowToPlay() {
  return (
    <Screen kicker="RULES" title="How to play">
      <Card badge="Roles" tilt={-0.5}>
        {(['villager', 'undercover', 'imposter'] as const).map((r) => (
          <View key={r} style={styles.row}>
            <RoleMark role={r} />
            <View style={{ flex: 1 }}>
              <Text style={styles.roleName}>{ROLE_META[r].label}</Text>
              <Body style={styles.muted}>{ROLES[r]}</Body>
            </View>
          </View>
        ))}
      </Card>

      <Card badge="Each round" tilt={0.4}>
        {STEPS.map((text, i) => (
          <View key={text} style={styles.row}>
            <View style={styles.num}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <Body style={[styles.muted, { flex: 1 }]}>{text}</Body>
          </View>
        ))}
      </Card>

      <Card badge="Points" tilt={-0.3}>
        {SCORING.map(([text, pts]) => (
          <View key={text} style={styles.row}>
            <Text style={styles.pts}>+{pts}</Text>
            <Body style={[styles.muted, { flex: 1 }]}>{text}</Body>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  roleName: { fontFamily: fonts.display, fontSize: size.lead + 2, color: colors.text },
  muted: { color: colors.textSoft, fontSize: size.small + 1, lineHeight: 21 },
  num: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: OUTLINE - 0.5,
    borderColor: colors.outline,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontFamily: fonts.display, fontSize: size.lead, lineHeight: 24, color: colors.white },
  pts: { width: 32, textAlign: 'center', fontFamily: fonts.display, fontSize: size.lead, color: colors.pink },
});
