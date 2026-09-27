import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Pop, Screen } from '@/components/ui';
import { cardFor } from '@/features/game/engine';
import { SecretCard } from '@/features/game/SecretCard';
import { useGame } from '@/features/game/store';
import { categoryName } from '@/features/words/words';
import { CONFETTI, colors, fonts, onColor, size, space } from '@/theme/tokens';

export default function Deal() {
  const { game, players, settings, markDealt } = useGame();
  const [index, setIndex] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [seen, setSeen] = useState(false);

  if (!game) return <Redirect href="/" />;
  const player = players[index];
  const isLast = index === players.length - 1;
  const color = CONFETTI[index % CONFETTI.length];

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
      kicker={`DEALING · ${index + 1} OF ${players.length}`}
      backLabel="Quit"
      onBack={() => router.dismissTo('/')}
      scroll={false}
      footer={
        claimed ? (
          <Button
            label={isLast ? "Everyone's in. Start!" : 'Got it, pass it on'}
            color={colors.blue}
            onPress={next}
            disabled={!seen}
            accessibilityHint={seen ? undefined : 'Hold the card to see your word first'}
          />
        ) : (
          <Button
            label={`I'm ${player.name}!`}
            color={color === colors.yellow ? colors.orange : color}
            onPress={() => setClaimed(true)}
          />
        )
      }
    >
      {!claimed ? (
        <Pop key={`pass-${index}`} style={styles.center}>
          <Text style={styles.emoji}>📱</Text>
          <Body style={styles.muted}>Pass the phone to</Body>
          <View
            style={[
              styles.nameTag,
              { backgroundColor: color, transform: [{ rotate: index % 2 ? '3deg' : '-3deg' }] },
            ]}
          >
            <Text style={[styles.name, { color: onColor(color) }]} numberOfLines={1} adjustsFontSizeToFit>
              {player.name}
            </Text>
          </View>
          <Body style={styles.muted}>No peeking, everyone else! 🙈</Body>
        </Pop>
      ) : (
        <Pop key={`card-${index}`} style={styles.center}>
          <View style={{ width: '100%' }}>
            <SecretCard
              name={player.name}
              card={cardFor(game, player.id, settings, categoryName)}
              onSeen={() => setSeen(true)}
            />
          </View>
          <Body style={styles.muted}>
            {seen ? 'Got it? Pass the phone on.' : 'Press and hold the sticker.'}
          </Body>
        </Pop>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.lg },
  emoji: { fontSize: 56 },
  muted: { color: colors.inkSoft, textAlign: 'center' },
  nameTag: {
    maxWidth: '100%',
    borderWidth: 4,
    borderColor: colors.ink,
    borderRadius: 32,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    shadowColor: colors.ink,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 6, height: 6 },
    elevation: 6,
  },
  name: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: size.giant,
    lineHeight: size.giant + 14,
    textAlign: 'center',
  },
});
