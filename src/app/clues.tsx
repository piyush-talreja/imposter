import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Label, Paper, Rise, Screen, Type } from '@/components/ui';
import { alive } from '@/features/game/engine';
import { playerName, useGame } from '@/features/game/store';
import { colors, fonts, size, space } from '@/theme/tokens';

export default function Clues() {
  const { game, players } = useGame();
  const [turn, setTurn] = useState(0);

  if (!game) return <Redirect href="/" />;
  const speakers = alive(game);
  const done = turn >= speakers.length;
  const speaker = speakers[Math.min(turn, speakers.length - 1)];

  return (
    <Screen
      kicker={`ROUND ${game.round} · STATEMENTS`}
      title={done ? 'All statements taken' : 'Give one clue'}
      backLabel="Quit"
      onBack={() => router.dismissTo('/')}
      footer={
        done ? (
          <Button label="Discuss & accuse" onPress={() => router.replace('/eliminate')} />
        ) : (
          <>
            <Button label="Next suspect" ink={colors.ink} onPress={() => setTurn(turn + 1)} />
            <Button
              label="Skip to the accusation"
              variant="ghost"
              onPress={() => router.replace('/eliminate')}
            />
          </>
        )
      }
    >
      <Rise key={done ? 'done' : speaker}>
        <Paper tab={done ? 'Next' : 'On the record'} tilt={-0.8} style={styles.spotlight}>
          {done ? (
            <>
              <Text style={styles.big}>Talk it out.</Text>
              <Type style={styles.center}>
                Who sounded off? Who hesitated? When you&apos;re ready, agree on one suspect to eliminate.
              </Type>
            </>
          ) : (
            <>
              <Label>
                Suspect {turn + 1} of {speakers.length}
              </Label>
              <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
                {playerName(players, speaker)}
              </Text>
              <Type style={styles.center}>
                One word that hints at yours. Too obvious and the imposter learns it.
              </Type>
            </>
          )}
        </Paper>
      </Rise>

      <View style={styles.list}>
        <Label color={colors.mutedOnDark}>Order of statements</Label>
        {game.order.map((id) => {
          const out = game.eliminated.includes(id);
          const i = speakers.indexOf(id);
          const active = !done && id === speaker;
          const given = !out && (done || i < turn);
          return (
            <View key={id} style={[styles.row, active && styles.rowActive]}>
              <Text style={[styles.idx, active && { color: colors.cream }]}>
                {out ? '—' : String(i + 1).padStart(2, '0')}
              </Text>
              <Text
                style={[
                  styles.rowName,
                  out && styles.struck,
                  given && !active && { color: colors.mutedOnDark },
                  active && { color: colors.cream },
                ]}
              >
                {playerName(players, id)}
              </Text>
              {out ? (
                <Text style={styles.outTag}>ELIMINATED</Text>
              ) : given ? (
                <Text style={styles.check}>✓</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spotlight: { alignItems: 'center', paddingVertical: space.xl },
  big: { color: colors.ink, fontFamily: fonts.display, fontSize: size.hero + 4, textAlign: 'center' },
  center: { textAlign: 'center', color: colors.muted },
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 10,
    paddingHorizontal: space.md,
  },
  rowActive: { backgroundColor: colors.imposter, borderRadius: 3, transform: [{ rotate: '-0.5deg' }] },
  idx: { color: colors.mutedOnDark, fontFamily: fonts.type, width: 24 },
  rowName: { color: colors.cream, fontFamily: fonts.type, fontSize: size.lead, flex: 1 },
  struck: { textDecorationLine: 'line-through', color: '#5E5446' },
  outTag: { color: '#5E5446', fontFamily: fonts.stencil, fontSize: 11, letterSpacing: 1.5 },
  check: { color: colors.brass, fontSize: size.body },
});
