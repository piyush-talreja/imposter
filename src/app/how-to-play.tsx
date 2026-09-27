import { StyleSheet, Text, View } from 'react-native';

import { Body, Card, Screen } from '@/components/ui';
import { POINTS } from '@/features/game/engine';
import { CONFETTI, OUTLINE, ROLE_META, colors, fonts, onColor, size, space } from '@/theme/tokens';

const STEPS: [string, string][] = [
  [
    'Deal',
    'Pass the phone round. Press and hold the sticker to peek at your word, then let go and pass it on.',
  ],
  ['Clue', 'Going round the circle, everyone still in says one word about theirs.'],
  ['Vote', 'Talk it over, then agree on one player to vote out. Their role is revealed!'],
  ['Last chance', 'If the Imposter is voted out, they get one guess at the word. If it’s right, they win!'],
  ['Repeat', 'Keep going round by round until one side wins.'],
];

const ROLE_TEXT = {
  villager: 'Most players. You all share the same secret word.',
  undercover:
    'Gets a word that’s close but different (Pizza → Calzone), and doesn’t know it! Blend in until you figure it out.',
  imposter:
    'Gets no word, and knows it. Fake it from the clues you hear. If you’re caught, guess the word to steal the win.',
} as const;

export default function HowToPlay() {
  return (
    <Screen kicker="THE RULES" title="How to play">
      <Card badge="The roles" badgeColor={colors.yellow} tilt={-0.5}>
        {(['villager', 'undercover', 'imposter'] as const).map((r) => (
          <View key={r} style={styles.role}>
            <View style={[styles.roleIcon, { backgroundColor: ROLE_META[r].color }]}>
              <Text style={{ fontSize: 22 }}>{ROLE_META[r].emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleName}>{ROLE_META[r].label}</Text>
              <Body style={styles.muted}>{ROLE_TEXT[r]}</Body>
            </View>
          </View>
        ))}
      </Card>

      <Card badge="Each round" badgeColor={colors.mint} tilt={0.4}>
        {STEPS.map(([title, text], i) => (
          <View key={title} style={styles.step}>
            <View style={[styles.num, { backgroundColor: CONFETTI[i] }]}>
              <Text style={[styles.numText, { color: onColor(CONFETTI[i]) }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Body style={styles.muted}>{text}</Body>
            </View>
          </View>
        ))}
      </Card>

      <Card badge="Who wins?" badgeColor={colors.pink} tilt={-0.3}>
        <Body>
          🏡 <Text style={styles.strong}>Villagers win</Text> when every Undercover and Imposter is out.
        </Body>
        <Body>
          🕶️ <Text style={styles.strong}>Fakers win</Text> (Undercover and Imposter) when only one villager is
          left.
        </Body>
        <Body>
          🎭 <Text style={styles.strong}>The Imposter wins alone</Text> by guessing the word after being voted
          out.
        </Body>
        <Body style={styles.muted}>
          Points go to the whole winning side: Villager {POINTS.villager} · Undercover {POINTS.undercover} ·
          Imposter {POINTS.imposter}.
        </Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  role: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  roleIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: OUTLINE - 0.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleName: { fontFamily: fonts.display, fontSize: size.lead + 2, color: colors.ink },
  muted: { color: colors.inkSoft, fontSize: size.small + 1, lineHeight: 21 },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: OUTLINE - 0.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontFamily: fonts.display, fontSize: size.lead, lineHeight: 26 },
  stepTitle: { fontFamily: fonts.bodyBold, fontSize: size.body + 1, color: colors.ink },
  strong: { fontFamily: fonts.bodyBold },
});
