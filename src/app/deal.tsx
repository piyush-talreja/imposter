import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Label, Screen } from '@/components/ui';
import { cardFor } from '@/features/game/engine';
import { useGame } from '@/features/game/store';
import { categoryName } from '@/features/words/words';
import { thud } from '@/lib/haptics';
import { colors, font, radius, space } from '@/theme/tokens';

export default function Deal() {
  const { round, players, settings } = useGame();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (!round) return <Redirect href="/" />;
  const player = players[index];
  const card = cardFor(round, player.id, settings, categoryName);
  const isLast = index === players.length - 1;

  const hideAndPass = () => {
    setRevealed(false);
    if (isLast) router.replace('/clues');
    else setIndex(index + 1);
  };

  return (
    <Screen
      title={`Dealing · ${index + 1} of ${players.length}`}
      backLabel="‹ Quit"
      onBack={() => router.dismissTo('/')}
      scroll={false}
      footer={
        revealed ? (
          <Button label={isLast ? 'Hide word & start clues' : 'Hide word & pass'} onPress={hideAndPass} />
        ) : (
          <Button
            label="Show my word"
            onPress={() => {
              thud();
              setRevealed(true);
            }}
            accessibilityHint="Make sure nobody else can see the screen"
          />
        )
      }
    >
      <View style={styles.center}>
        {!revealed ? (
          <>
            <Label>Pass the phone to</Label>
            <Text style={styles.name}>{player.name}</Text>
            <Body style={styles.muted}>Only {player.name} should look at the screen.</Body>
          </>
        ) : card.kind === 'word' ? (
          <Card style={styles.card}>
            <Label>{player.name}, your word is</Label>
            <Text style={styles.word} adjustsFontSizeToFit numberOfLines={2}>
              {card.word}
            </Text>
            <Body style={styles.muted}>Remember it. Don&apos;t say it out loud.</Body>
          </Card>
        ) : (
          <Card style={[styles.card, styles.imposterCard]}>
            <Text style={styles.emoji}>🕵️</Text>
            <Text style={[styles.word, { color: colors.imposter }]}>Imposter</Text>
            {card.category ? (
              <Body style={styles.muted}>
                Category: <Text style={{ color: colors.text, fontWeight: '700' }}>{card.category}</Text>
              </Body>
            ) : null}
            <Body style={styles.muted}>
              You don&apos;t know the word. Listen to the clues, blend in, and try to work it out.
            </Body>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.md },
  name: { color: colors.text, fontSize: font.giant, fontWeight: '900', textAlign: 'center' },
  muted: { color: colors.muted, textAlign: 'center' },
  card: { width: '100%', alignItems: 'center', paddingVertical: space.xxl, borderRadius: radius.lg },
  imposterCard: { borderWidth: 2, borderColor: colors.imposter },
  word: { color: colors.text, fontSize: font.giant, fontWeight: '900', textAlign: 'center' },
  emoji: { fontSize: 64 },
});
