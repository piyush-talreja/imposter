import { StyleSheet, Text, View } from 'react-native';

import { Body, Card, Label, Screen } from '@/components/ui';
import { colors, font, space } from '@/theme/tokens';

const STEPS: [string, string][] = [
  ['Add players', 'Three or more, in seating order. Six to ten is the sweet spot.'],
  ['Deal', 'Pass the phone round. Each player secretly sees the word, except the imposter.'],
  ['Clue', 'Going clockwise, everyone says one word that hints at the secret word, without giving it away.'],
  ['Repeat', 'Go round two or three times. The imposter listens closely and bluffs along.'],
  ['Vote', 'Discuss, then everyone secretly votes for who they think the imposter is.'],
  ['Reveal', 'See the votes, unmask the imposter, and laugh about the strangest clues.'],
];

const SCORING: [string, string][] = [
  ['+1', 'You voted for the imposter'],
  ['+1', 'Bonus for everyone if the whole crew caught them'],
  ['+1', 'Imposter: at least one person was fooled'],
  ['+1', 'Imposter: nobody voted for you'],
  ['+1', 'Imposter: uncaught, and you named the secret word'],
];

const TIPS = [
  'Crew: be clear enough to prove you know the word, vague enough not to hand it over.',
  'Imposter: copy the style of the clues around you. Hesitation is a giveaway.',
  'Undercover mode: the imposter gets a similar word and doesn’t know they’re the odd one out.',
];

export default function HowToPlay() {
  return (
    <Screen title="How to play">
      <Card>
        {STEPS.map(([title, text], i) => (
          <View key={title} style={styles.step}>
            <Text style={styles.num}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Body style={styles.muted}>{text}</Body>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Label>Scoring (optional)</Label>
        {SCORING.map(([pts, text]) => (
          <View key={text} style={styles.step}>
            <Text style={styles.pts}>{pts}</Text>
            <Body style={{ flex: 1 }}>{text}</Body>
          </View>
        ))}
      </Card>

      <Card>
        <Label>Tips</Label>
        {TIPS.map((t) => (
          <Body key={t} style={styles.muted}>
            • {t}
          </Body>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { color: colors.primary, fontSize: font.title, fontWeight: '900', width: 24 },
  stepTitle: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  muted: { color: colors.muted },
  pts: { color: colors.success, fontWeight: '900', width: 32, fontSize: font.body },
});
