import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Label, Screen } from '@/components/ui';
import { playerName, useGame } from '@/features/game/store';
import { colors, font, radius, space } from '@/theme/tokens';

export default function Clues() {
  const { round, players, settings } = useGame();
  const [turn, setTurn] = useState(0);

  if (!round) return <Redirect href="/" />;
  const perPass = round.order.length;
  const pass = Math.floor(turn / perPass) + 1;
  const speaker = round.order[turn % perPass];
  const done = pass > settings.passes;

  return (
    <Screen
      title={done ? 'Clues done' : `Pass ${pass} of ${settings.passes}`}
      backLabel="‹ Quit"
      onBack={() => router.dismissTo('/')}
      footer={
        <>
          {done ? (
            <Button label="Time to vote" onPress={() => router.replace('/vote')} />
          ) : (
            <Button label="Next player" onPress={() => setTurn(turn + 1)} />
          )}
          {!done ? (
            <Button label="Skip to vote" variant="ghost" onPress={() => router.replace('/vote')} />
          ) : null}
        </>
      }
    >
      <Card style={styles.spotlight}>
        {done ? (
          <>
            <Text style={styles.emoji}>🗳️</Text>
            <Body style={styles.center}>
              Discuss who seems suspicious, then vote. Everyone votes for themselves, not as a team.
            </Body>
          </>
        ) : (
          <>
            <Label>Give a one-word clue</Label>
            <Text style={styles.speaker}>{playerName(players, speaker)}</Text>
            <Body style={styles.muted}>Don&apos;t say the word. Don&apos;t be too obvious either.</Body>
          </>
        )}
      </Card>

      <View style={styles.order}>
        <Label>Order</Label>
        {round.order.map((id, i) => {
          const active = !done && id === speaker;
          const given = done || i < turn % perPass;
          return (
            <View key={id} style={[styles.orderRow, active && styles.orderActive]}>
              <Text style={[styles.orderIndex, active && { color: colors.text }]}>{i + 1}</Text>
              <Text style={[styles.orderName, given && !active && { color: colors.muted }]}>
                {playerName(players, id)}
              </Text>
              {given && !active ? <Text style={styles.check}>✓</Text> : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spotlight: { alignItems: 'center', paddingVertical: space.xl },
  emoji: { fontSize: 56 },
  center: { textAlign: 'center' },
  muted: { color: colors.muted, textAlign: 'center' },
  speaker: { color: colors.text, fontSize: font.hero + 4, fontWeight: '900', textAlign: 'center' },
  order: { gap: space.sm },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  orderActive: { backgroundColor: colors.primary },
  orderIndex: { color: colors.muted, width: 20, fontWeight: '700' },
  orderName: { color: colors.text, fontSize: font.body, fontWeight: '600', flex: 1 },
  check: { color: colors.success, fontWeight: '800' },
});
