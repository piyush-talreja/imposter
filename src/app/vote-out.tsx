import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Character } from '@/components/Character';
import { Button, Pop, Screen } from '@/components/ui';
import { alive, inBonusRound } from '@/features/game/engine';
import { InPlay, QUIT_CONFIRM } from '@/features/game/InPlay';
import { playerName, useGame } from '@/features/game/store';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { useBlockBack } from '@/lib/useBlockBack';
import { tap } from '@/lib/haptics';
import { OUTLINE, SHADOW, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

// One vote-out per round, decided out loud. The phone stays on the table.
export default function VoteOut() {
  const { game, players, eliminatePlayer } = useGame();
  useBlockBack();
  // Two tiles per row: screen padding, gap, shadows, tile padding and borders.
  const tileText = useColumnWidth(48 + 16 + 10) / 2 - 38;
  const [choice, setChoice] = useState<string | null>(null);

  if (!game) return <Redirect href="/" />;
  const inGame = alive(game);

  const confirm = () => {
    if (!choice) return;
    eliminatePlayer(choice);
    router.replace('/reveal');
  };

  return (
    <Screen
      kicker={inBonusRound(game) ? `BONUS ROUND · ${game.round}` : `ROUND ${game.round}`}
      title={inBonusRound(game) ? 'Who’s the Undercover?' : 'Vote out'}
      backLabel="Quit"
      onBack={() => router.dismissTo('/')}
      confirmBack={QUIT_CONFIRM}
      footer={
        <Button
          label={choice ? 'Vote out' : 'Pick one'}
          accessibilityHint={choice ? `Votes out ${playerName(players, choice)}` : undefined}
          onPress={confirm}
          disabled={!choice}
        />
      }
    >
      <InPlay game={game} />
      <View style={styles.grid}>
        {inGame.map((id, i) => {
          const selected = choice === id;
          return (
            <Pop key={id} delay={i * 45} style={styles.cell}>
              <Pressable
                onPress={() => {
                  tap();
                  setChoice(selected ? null : id);
                }}
                accessibilityRole="radio"
                accessibilityLabel={playerName(players, id)}
                accessibilityState={{ selected }}
                style={[styles.cellInner, { transform: [{ rotate: `${((i * 37) % 5) - 2}deg` }] }]}
              >
                <View style={styles.tileShadow} />
                <View style={[styles.tile, { backgroundColor: selected ? colors.pink : colors.raised }]}>
                  <Character
                    color={selected ? colors.surface : '#7A6EB8'}
                    initial={playerName(players, id)}
                    size={58}
                  />
                  <Text
                    style={[
                      styles.tileName,
                      {
                        fontSize: fitFontSize(playerName(players, id), size.body, tileText, {
                          wrap: true,
                          min: 12,
                        }),
                      },
                      selected && { color: colors.white },
                    ]}
                    numberOfLines={2}
                  >
                    {playerName(players, id)}
                  </Text>
                </View>
              </Pressable>
            </Pop>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '46%', flexGrow: 1 },
  cellInner: { marginRight: SHADOW, marginBottom: SHADOW },
  tileShadow: {
    ...StyleSheet.absoluteFill,
    top: SHADOW,
    left: SHADOW,
    right: -SHADOW,
    bottom: -SHADOW,
    backgroundColor: colors.outline,
    borderRadius: radius.lg,
  },
  tile: {
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    padding: space.md,
    alignItems: 'center',
    gap: space.sm,
    minHeight: TOUCH * 3,
    justifyContent: 'center',
  },
  tileName: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.body, textAlign: 'center' },
});
