import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Label, Rise, Screen, Type } from '@/components/ui';
import { alive } from '@/features/game/engine';
import { playerName, useGame } from '@/features/game/store';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { useBlockBack } from '@/lib/useBlockBack';
import { tap } from '@/lib/haptics';
import { TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

// One accusation per round, decided out loud. The phone stays on the table.
export default function Eliminate() {
  const { game, players, eliminatePlayer } = useGame();
  useBlockBack();
  // Two cards per row: screen padding, gap, card padding and borders.
  const cardText = useColumnWidth(48 + 16) / 2 - 28;
  const [choice, setChoice] = useState<string | null>(null);

  if (!game) return <Redirect href="/" />;
  const suspects = alive(game);

  const confirm = () => {
    if (!choice) return;
    eliminatePlayer(choice);
    router.replace('/verdict');
  };

  return (
    <Screen
      kicker={`ROUND ${game.round} · THE ACCUSATION`}
      title="Who goes?"
      backLabel="Quit"
      onBack={() => router.dismissTo('/')}
      footer={<Button label={choice ? 'Eliminate' : 'Pick a suspect'} onPress={confirm} disabled={!choice} />}
    >
      <Type style={styles.lead}>
        Argue it out, then agree on one suspect. Their true identity will be revealed.
      </Type>
      <View style={styles.grid}>
        {suspects.map((id, i) => {
          const selected = choice === id;
          return (
            <Rise key={id} delay={i * 50} style={styles.cell}>
              <Pressable
                onPress={() => {
                  tap();
                  setChoice(selected ? null : id);
                }}
                accessibilityRole="radio"
                accessibilityLabel={playerName(players, id)}
                accessibilityState={{ selected }}
                style={[
                  styles.card,
                  { transform: [{ rotate: `${((i * 37) % 5) - 2}deg` }] },
                  selected && styles.cardSelected,
                ]}
              >
                <View style={styles.photo}>
                  <Text style={styles.initial}>{playerName(players, id).slice(0, 1).toUpperCase()}</Text>
                </View>
                <Text
                  style={[
                    styles.cardName,
                    {
                      fontSize: fitFontSize(playerName(players, id), size.lead, cardText, {
                        wrap: true,
                        min: 12,
                      }),
                    },
                  ]}
                  numberOfLines={2}
                >
                  {playerName(players, id)}
                </Text>
                {selected ? (
                  <View style={styles.cross} pointerEvents="none">
                    <Text style={styles.crossText}>ACCUSED</Text>
                  </View>
                ) : null}
              </Pressable>
            </Rise>
          );
        })}
      </View>
      <Label color={colors.mutedOnDark}>{game.eliminated.length} eliminated so far</Label>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { color: colors.mutedOnDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '47%', flexGrow: 1 },
  card: {
    backgroundColor: colors.paper,
    padding: space.sm,
    paddingBottom: space.md,
    borderRadius: 2,
    alignItems: 'center',
    gap: space.sm,
    minHeight: TOUCH * 3,
    borderWidth: 3,
    borderColor: colors.paper,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardSelected: { borderColor: colors.imposter },
  photo: {
    alignSelf: 'stretch',
    height: 92,
    backgroundColor: '#3B332B',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  initial: { color: colors.paperShade, fontFamily: fonts.display, fontSize: 52, opacity: 0.8 },
  cardName: { color: colors.ink, fontFamily: fonts.type, fontSize: size.lead, textAlign: 'center' },
  cross: {
    position: 'absolute',
    top: 38,
    borderWidth: 3,
    borderColor: colors.imposter,
    paddingHorizontal: space.sm,
    transform: [{ rotate: '-14deg' }],
    backgroundColor: 'rgba(239,229,207,0.85)',
  },
  crossText: { color: colors.imposter, fontFamily: fonts.stencil, fontSize: size.lead, letterSpacing: 2 },
});
