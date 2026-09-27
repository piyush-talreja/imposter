import { StyleSheet, Text, View } from 'react-native';

import { Character, LOOK_FOR_ROLE } from '@/components/Character';
import { Body, Card, Label, Screen } from '@/components/ui';
import { POINTS, type Role } from '@/features/game/engine';
import { OUTLINE, ROLE_META, colors, fonts, radius, size, space } from '@/theme/tokens';

const WHO: { role: Role; caption: string }[] = [
  { role: 'villager', caption: 'Knows the word' },
  { role: 'undercover', caption: 'Similar word. Doesn’t know it' },
  { role: 'imposter', caption: 'No word. Knows it' },
];

const ROUND = [
  { verb: 'Peek', text: 'Hold the card to see your word.' },
  { verb: 'Clue', text: 'Everyone says one word about it.' },
  { verb: 'Vote', text: 'Agree on one player to vote out.' },
];

const WIN: { role: Role; title: string; text: string }[] = [
  { role: 'villager', title: 'Villagers win', text: 'Catch every Imposter.' },
  { role: 'imposter', title: 'Imposter wins', text: 'Survive, or guess the word when caught.' },
  { role: 'undercover', title: 'Bonus round', text: 'Imposter caught? Now find the Undercover.' },
];

const SCORING: [string, number][] = [
  ['Imposter caught · Villagers & Undercover', POINTS.imposterCaught],
  ['Imposter wins · Imposter', POINTS.imposterWins],
  ['Undercover caught · Villagers', POINTS.undercoverCaught],
  ['Undercover never caught · Undercover', POINTS.undercoverUndetected],
];

export default function HowToPlay() {
  return (
    <Screen kicker="RULES" title="How to play">
      <Card badge="Who’s who" tilt={-0.4}>
        <View style={styles.who}>
          {WHO.map(({ role, caption }) => (
            <View key={role} style={styles.whoItem}>
              <Character color={ROLE_META[role].color} look={LOOK_FOR_ROLE[role]} size={62} />
              <Text style={[styles.whoName, { color: ROLE_META[role].color }]}>{ROLE_META[role].label}</Text>
              <Text style={styles.caption}>{caption}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card badge="Each round" tilt={0.3}>
        {ROUND.map(({ verb, text }, i) => (
          <View key={verb} style={styles.step}>
            <View style={styles.num}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <Text style={styles.verb}>{verb}</Text>
            <Body style={styles.stepText}>{text}</Body>
          </View>
        ))}
        <Label>Repeat until someone wins.</Label>
      </Card>

      <View style={styles.wins}>
        {WIN.map(({ role, title, text }) => (
          <Card key={role} style={[styles.win, { borderColor: ROLE_META[role].color }]}>
            <Character color={ROLE_META[role].color} look={LOOK_FOR_ROLE[role]} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.winTitle, { color: ROLE_META[role].color }]}>{title}</Text>
              <Body style={styles.stepText}>{text}</Body>
            </View>
          </Card>
        ))}
      </View>

      <Card badge="Points" tilt={-0.3}>
        {SCORING.map(([text, pts]) => (
          <View key={text} style={styles.pointRow}>
            <Text style={styles.pts}>+{pts}</Text>
            <Body style={styles.stepText}>{text}</Body>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  whoItem: { flex: 1, alignItems: 'center', gap: 2 },
  whoName: { fontFamily: fonts.display, fontSize: size.lead },
  caption: { color: colors.textSoft, fontFamily: fonts.body, fontSize: size.small - 1, textAlign: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  num: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: OUTLINE - 0.5,
    borderColor: colors.outline,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontFamily: fonts.display, fontSize: size.body + 1, lineHeight: 22, color: colors.white },
  verb: { width: 52, fontFamily: fonts.display, fontSize: size.lead + 2, color: colors.text },
  stepText: { flex: 1, color: colors.textSoft, fontSize: size.small + 1, lineHeight: 20 },
  wins: { gap: space.md },
  win: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderRadius: radius.lg,
  },
  winTitle: { fontFamily: fonts.display, fontSize: size.lead + 2 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pts: { width: 34, fontFamily: fonts.display, fontSize: size.lead, color: colors.pink },
});
