import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Pop, Screen } from '@/components/ui';
import { alive } from '@/features/game/engine';
import { playerName, useGame } from '@/features/game/store';
import { tap } from '@/lib/haptics';
import {
  CONFETTI,
  OUTLINE,
  SHADOW,
  TOUCH,
  colors,
  fonts,
  onColor,
  radius,
  size,
  space,
} from '@/theme/tokens';

// One vote-out per round, decided out loud. The phone stays on the table.
export default function VoteOut() {
  const { game, players, eliminatePlayer } = useGame();
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
      kicker={`ROUND ${game.round} · THE VOTE`}
      title="Who's out?"
      backLabel="Quit"
      onBack={() => router.dismissTo('/')}
      footer={
        <Button
          label={choice ? `Vote out ${playerName(players, choice)}` : 'Tap a player'}
          onPress={confirm}
          disabled={!choice}
        />
      }
    >
      <Body style={styles.lead}>
        Agree together on one player. Then we&apos;ll find out who they really were!
      </Body>
      <View style={styles.grid}>
        {inGame.map((id, i) => {
          const selected = choice === id;
          const color = CONFETTI[game.order.indexOf(id) % CONFETTI.length];
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
                style={styles.cellInner}
              >
                <View style={styles.tileShadow} />
                <View
                  style={[
                    styles.tile,
                    { backgroundColor: selected ? colors.ink : colors.white },
                    { transform: [{ rotate: `${((i * 37) % 5) - 2}deg` }] },
                  ]}
                >
                  <View style={[styles.avatar, { backgroundColor: color }]}>
                    <Text style={[styles.initial, { color: onColor(color) }]}>
                      {playerName(players, id).slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.tileName, selected && { color: colors.white }]} numberOfLines={1}>
                    {playerName(players, id)}
                  </Text>
                  {selected ? <Text style={styles.pointer}>👉 out?</Text> : null}
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
  lead: { color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '46%', flexGrow: 1 },
  cellInner: { marginRight: SHADOW, marginBottom: SHADOW },
  tileShadow: {
    ...StyleSheet.absoluteFill,
    top: SHADOW,
    left: SHADOW,
    right: -SHADOW,
    bottom: -SHADOW,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
  },
  tile: {
    borderWidth: OUTLINE,
    borderColor: colors.ink,
    borderRadius: radius.lg,
    padding: space.md,
    alignItems: 'center',
    gap: space.sm,
    minHeight: TOUCH * 3,
    justifyContent: 'center',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: OUTLINE,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42 },
  tileName: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: size.lead },
  pointer: { color: colors.yellow, fontFamily: fonts.bodyBold, fontSize: size.small },
});
