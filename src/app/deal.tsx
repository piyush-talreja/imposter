import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Label, Rise, Screen, Type } from '@/components/ui';
import { cardFor } from '@/features/game/engine';
import { SecretCard } from '@/features/game/SecretCard';
import { useGame } from '@/features/game/store';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { useBlockBack } from '@/lib/useBlockBack';
import { categoryName } from '@/features/words/words';
import { colors, fonts, size, space } from '@/theme/tokens';

export default function Deal() {
  const { game, players, settings, markDealt } = useGame();
  const nameWidth = useColumnWidth(48);
  useBlockBack();
  const [index, setIndex] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [seen, setSeen] = useState(false);

  if (!game) return <Redirect href="/" />;
  const player = players[index];
  const isLast = index === players.length - 1;

  const next = () => {
    setClaimed(false);
    setSeen(false);
    if (isLast) {
      markDealt();
      router.replace('/clues');
    } else setIndex(index + 1);
  };

  return (
    <Screen
      kicker={`DEALING · FILE ${index + 1} OF ${players.length}`}
      backLabel="Quit"
      onBack={() => router.dismissTo('/')}
      scroll={false}
      footer={
        claimed ? (
          <Button
            label={isLast ? 'Begin' : 'Pass it on'}
            onPress={next}
            disabled={!seen}
            accessibilityHint={seen ? undefined : 'Hold the card to see your word first'}
          />
        ) : (
          <Button
            label="That's me"
            accessibilityHint={`Only ${player.name} should tap this`}
            ink={colors.ink}
            onPress={() => setClaimed(true)}
          />
        )
      }
    >
      {!claimed ? (
        <Rise key={`pass-${index}`} style={styles.center}>
          <Label color={colors.mutedOnDark}>Hand the phone to</Label>
          <Text
            style={[styles.name, sized(fitFontSize(player.name, size.giant + 8, nameWidth, { wrap: true }))]}
            numberOfLines={2}
          >
            {player.name}
          </Text>
          <Type style={styles.muted}>Everyone else, look away.</Type>
        </Rise>
      ) : (
        <Rise key={`card-${index}`} style={styles.center}>
          <View style={{ width: '100%' }}>
            <SecretCard
              name={player.name}
              card={cardFor(game, player.id, settings, categoryName)}
              onSeen={() => setSeen(true)}
            />
          </View>
          <Type style={styles.muted}>
            {seen ? 'Got it? Close the file and pass it on.' : 'Hold the card. Let go to hide it.'}
          </Type>
        </Rise>
      )}
    </Screen>
  );
}

const sized = (fontSize: number) => ({ fontSize, lineHeight: Math.round(fontSize * 1.2) });

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.lg },
  name: { color: colors.cream, fontFamily: fonts.display, fontSize: size.giant + 8, textAlign: 'center' },
  muted: { color: colors.mutedOnDark, textAlign: 'center' },
});
