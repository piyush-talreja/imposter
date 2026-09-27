import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Label, Pop, Screen } from '@/components/ui';
import { alive, inBonusRound } from '@/features/game/engine';
import { InPlay, QUIT_CONFIRM } from '@/features/game/InPlay';
import { playerName, useGame } from '@/features/game/store';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { useBlockBack } from '@/lib/useBlockBack';
import { colors, fonts, radius, size, space } from '@/theme/tokens';

export default function Clues() {
  const { game, players } = useGame();
  const [turn, setTurn] = useState(0);
  // Screen + card padding and borders.
  const nameWidth = useColumnWidth(48 + 48 + 12);
  useBlockBack();

  if (!game) return <Redirect href="/" />;
  const bonus = inBonusRound(game);
  const speakers = alive(game);
  const done = turn >= speakers.length;
  const speaker = speakers[Math.min(turn, speakers.length - 1)];
  const name = playerName(players, speaker);
  const fontSize = fitFontSize(name, size.hero, nameWidth);

  return (
    <Screen
      kicker={bonus ? `BONUS ROUND · ${game.round}` : `ROUND ${game.round}`}
      title={done ? 'Discuss' : 'Clues'}
      backLabel="Quit"
      onBack={() => router.dismissTo('/')}
      confirmBack={QUIT_CONFIRM}
      footer={
        done ? (
          <Button label="Vote" onPress={() => router.replace('/vote-out')} />
        ) : (
          <>
            <Button label="Next" onPress={() => setTurn(turn + 1)} />
            <Button label="Skip to vote" variant="ghost" onPress={() => router.replace('/vote-out')} />
          </>
        )
      }
    >
      <InPlay game={game} />
      <Pop key={done ? 'done' : speaker}>
        <Card color={done ? colors.surface : colors.pink} tilt={done ? 1 : -1} style={styles.spotlight}>
          {done ? (
            <>
              <Text style={styles.big}>{bonus ? 'Find the Undercover' : 'Who’s the Imposter?'}</Text>
              <Body style={styles.center}>Then vote one player out.</Body>
            </>
          ) : (
            <>
              <Label color={colors.white}>
                {turn + 1} of {speakers.length} · one word
              </Label>
              <Text
                style={[
                  styles.big,
                  { color: colors.white, fontSize, lineHeight: Math.round(fontSize * 1.15) },
                ]}
                numberOfLines={1}
              >
                {name}
              </Text>
            </>
          )}
        </Card>
      </Pop>

      <View style={styles.list}>
        {game.order.map((id) => {
          const out = game.eliminated.includes(id);
          const i = speakers.indexOf(id);
          const active = !done && id === speaker;
          const given = !out && (done || i < turn);
          return (
            <View
              key={id}
              style={[
                styles.pill,
                active && { backgroundColor: colors.pink },
                given && !active && styles.pillDone,
                out && styles.pillOut,
              ]}
            >
              <Text style={[styles.pillText, out && styles.pillTextOut]}>{playerName(players, id)}</Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spotlight: { alignItems: 'center', paddingVertical: space.xl },
  big: { color: colors.text, fontFamily: fonts.display, fontSize: size.title + 4, textAlign: 'center' },
  center: { textAlign: 'center', color: colors.textSoft },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  pill: {
    borderWidth: 2.5,
    borderColor: colors.outline,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    backgroundColor: colors.raised,
  },
  pillDone: { opacity: 0.45 },
  pillOut: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    borderColor: colors.textSoft,
    opacity: 0.4,
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: size.body, color: colors.text },
  pillTextOut: { textDecorationLine: 'line-through' },
});
