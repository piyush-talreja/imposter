import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Label, Pop, Screen } from '@/components/ui';
import { cardFor } from '@/features/game/engine';
import { SecretCard } from '@/features/game/SecretCard';
import { useGame } from '@/features/game/store';
import { categoryName } from '@/features/words/words';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { useBlockBack } from '@/lib/useBlockBack';
import { colors, fonts, size, space } from '@/theme/tokens';

// One screen per player: their name, and a covered card they hold to peek at.
// The card stays covered until held, so handing the phone over is safe.
export default function Deal() {
  const { game, players, settings, markDealt } = useGame();
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(false);
  const nameWidth = useColumnWidth(48);
  useBlockBack();

  if (!game) return <Redirect href="/" />;
  const player = players[index];
  const next = players[index + 1];

  const advance = () => {
    setSeen(false);
    if (!next) {
      markDealt();
      router.replace('/clues');
    } else setIndex(index + 1);
  };

  const fontSize = fitFontSize(player.name, size.giant, nameWidth);

  return (
    <Screen
      kicker={`DEALING · ${index + 1} OF ${players.length}`}
      backLabel="Quit"
      onBack={() => router.dismissTo('/')}
      scroll={false}
      footer={
        <Button
          label={next ? `Pass to ${next.name}` : 'Start'}
          onPress={advance}
          disabled={!seen}
          accessibilityHint={seen ? undefined : 'Hold the card to see your word first'}
        />
      }
    >
      <Pop key={player.id} style={styles.center}>
        <View style={styles.heading}>
          <Label>For</Label>
          <Text style={[styles.name, { fontSize, lineHeight: Math.round(fontSize * 1.1) }]} numberOfLines={1}>
            {player.name}
          </Text>
        </View>
        <View style={{ width: '100%' }}>
          <SecretCard card={cardFor(game, player.id, settings, categoryName)} onSeen={() => setSeen(true)} />
        </View>
      </Pop>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: space.lg },
  heading: { alignItems: 'center' },
  name: { color: colors.text, fontFamily: fonts.display, textAlign: 'center' },
});
