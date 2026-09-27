import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Screen } from '@/components/ui';
import { useGame } from '@/features/game/store';
import { colors, font, space } from '@/theme/tokens';

export default function Home() {
  const round = useGame((s) => s.round);
  const lastRoundScore = useGame((s) => s.lastRoundScore);
  // A round is resumable until its scores have been tallied.
  const inProgress = !!round && !lastRoundScore;

  return (
    <Screen
      onBack={null}
      scroll={false}
      footer={
        <>
          {inProgress ? <Button label="Resume round" onPress={() => router.push('/deal')} /> : null}
          <Button
            label={inProgress ? 'New game' : 'Play'}
            variant={inProgress ? 'secondary' : 'primary'}
            onPress={() => router.push('/setup')}
          />
          <Button label="How to play" variant="ghost" onPress={() => router.push('/how-to-play')} />
        </>
      }
    >
      <View style={styles.hero}>
        <Text style={styles.emoji} accessibilityElementsHidden>
          🕵️
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          Imposter
        </Text>
        <Body style={styles.tagline}>
          Everyone gets the secret word, except one. Give clues, bluff, and vote out the imposter.
        </Body>
        <Text style={styles.meta}>3+ players · one phone · 10–20 min</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.md },
  emoji: { fontSize: 88 },
  title: { color: colors.text, fontSize: font.giant, fontWeight: '900', letterSpacing: -1 },
  tagline: { textAlign: 'center', color: colors.muted, maxWidth: 340 },
  meta: { color: colors.primary, fontSize: font.small, fontWeight: '700', marginTop: space.sm },
});
