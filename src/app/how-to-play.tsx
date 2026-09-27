import { StyleSheet, Text, View } from 'react-native';

import { Paper, Screen, Type } from '@/components/ui';
import { POINTS } from '@/features/game/engine';
import { ROLE_META, colors, fonts, size, space } from '@/theme/tokens';

const STEPS: [string, string][] = [
  ['Deal', 'Pass the phone round. Press and hold the file to see your word, then let go and pass it on.'],
  ['Clue', 'Going clockwise, everyone still in says one word that hints at theirs.'],
  ['Accuse', 'Discuss, then agree out loud on one suspect to eliminate. Their role is revealed.'],
  [
    'Last words',
    'If you eliminate the imposter, they get one guess at the word. If they get it right, they win.',
  ],
  ['Repeat', 'Keep going round by round until one side wins.'],
];

export default function HowToPlay() {
  return (
    <Screen kicker="BRIEFING" title="How to play">
      <Paper tab="The suspects" tilt={-0.5}>
        {(['villager', 'undercover', 'imposter'] as const).map((r) => (
          <View key={r} style={{ gap: 2 }}>
            <Text style={[styles.role, { color: ROLE_META[r].ink }]}>{ROLE_META[r].label.toUpperCase()}</Text>
            <Type style={styles.muted}>
              {r === 'villager'
                ? 'Most of the table. You all share the secret word.'
                : r === 'undercover'
                  ? 'Gets a word that’s close but different (Pizza → Calzone), and doesn’t know it’s different. Blend in until you work it out.'
                  : 'Gets no word, and knows it. Bluff from the clues, and if you’re caught, guess the word to steal the win.'}
            </Type>
          </View>
        ))}
      </Paper>

      <Paper tab="Procedure" tilt={0.4}>
        {STEPS.map(([title, text], i) => (
          <View key={title} style={styles.step}>
            <Text style={styles.num}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Type style={styles.muted}>{text}</Type>
            </View>
          </View>
        ))}
      </Paper>

      <Paper tab="How it ends" tilt={-0.3}>
        <Type>
          <Text style={{ color: colors.villager }}>Villagers win</Text> when every Undercover and Imposter is
          out.
        </Type>
        <Type>
          <Text style={{ color: colors.imposter }}>Infiltrators win</Text> when only one villager is left.
        </Type>
        <Type>
          <Text style={{ color: colors.imposter }}>An imposter wins alone</Text> by naming the word after
          being caught.
        </Type>
        <Type style={styles.muted}>
          Scoring: every member of the winning side gets points. Villager {POINTS.villager} · Undercover{' '}
          {POINTS.undercover} · Imposter {POINTS.imposter}.
        </Type>
      </Paper>
    </Screen>
  );
}

const styles = StyleSheet.create({
  role: { fontFamily: fonts.stencil, fontSize: size.lead, letterSpacing: 1.5 },
  muted: { color: colors.muted, fontSize: size.small + 1 },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: {
    color: colors.imposter,
    fontFamily: fonts.display,
    fontSize: size.title,
    width: 26,
    lineHeight: size.title + 4,
  },
  stepTitle: { color: colors.ink, fontFamily: fonts.stencil, fontSize: size.body, letterSpacing: 1 },
});
