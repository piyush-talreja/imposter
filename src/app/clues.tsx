import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Label, Pop, Screen } from '@/components/ui';
import { alive } from '@/features/game/engine';
import { playerName, useGame } from '@/features/game/store';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { useBlockBack } from '@/lib/useBlockBack';
import { CONFETTI, colors, fonts, onColor, radius, size, space } from '@/theme/tokens';

export default function Clues() {
  const { game, players } = useGame();
  const [turn, setTurn] = useState(0);
  // Screen + card padding and borders.
  const nameWidth = useColumnWidth(48 + 48 + 12);
  useBlockBack();

  if (!game) return <Redirect href="/" />;
  const speakers = alive(game);
  const done = turn >= speakers.length;
  const speaker = speakers[Math.min(turn, speakers.length - 1)];
  const colorOf = (id: string) => CONFETTI[game.order.indexOf(id) % CONFETTI.length];

  return (
    <Screen
      kicker={`ROUND ${game.round} · CLUE TIME`}
      title={done ? 'Time to talk!' : 'Your turn!'}
      backLabel="Quit"
      onBack={() => router.dismissTo('/')}
      footer={
        done ? (
          <Button label="Vote someone out" onPress={() => router.replace('/vote-out')} />
        ) : (
          <>
            <Button label="Next player" color={colors.blue} onPress={() => setTurn(turn + 1)} />
            <Button label="Skip to the vote" variant="ghost" onPress={() => router.replace('/vote-out')} />
          </>
        )
      }
    >
      <Pop key={done ? 'done' : speaker}>
        <Card
          color={done ? colors.yellow : colorOf(speaker)}
          tilt={done ? 1 : -1}
          style={styles.spotlight}
          badge={done ? 'Discuss' : `${turn + 1} of ${speakers.length}`}
          badgeColor={colors.white}
        >
          {done ? (
            <>
              <Text style={styles.emoji}>🗣️</Text>
              <Text style={[styles.big, { color: colors.ink }]}>Who&apos;s faking it?</Text>
              <Body style={styles.center}>
                Whose clue was a bit off? Who hesitated? Talk it through, then pick one player to vote out.
              </Body>
            </>
          ) : (
            <>
              <Label color={onColor(colorOf(speaker))}>give one word</Label>
              <Text
                style={[
                  styles.big,
                  { color: onColor(colorOf(speaker)) },
                  sized(fitFontSize(playerName(players, speaker), size.hero, nameWidth)),
                ]}
                numberOfLines={1}
              >
                {playerName(players, speaker)}
              </Text>
              <Body style={[styles.center, { color: onColor(colorOf(speaker)) }]}>
                A clue for your word. Not too obvious, or the imposter will get it!
              </Body>
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
                active && { backgroundColor: colorOf(id), transform: [{ scale: 1.05 }] },
                given && !active && { backgroundColor: colors.white },
                out && styles.pillOut,
              ]}
            >
              <Text style={[styles.pillText, out && styles.pillTextOut]}>
                {given && !active ? '✓ ' : ''}
                {playerName(players, id)}
                {out ? ' 👋' : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const sized = (fontSize: number) => ({ fontSize, lineHeight: Math.round(fontSize * 1.25) });

const styles = StyleSheet.create({
  spotlight: { alignItems: 'center', paddingVertical: space.xl },
  emoji: { fontSize: 44 },
  big: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: size.hero,
    lineHeight: size.hero + 12,
    textAlign: 'center',
  },
  center: { textAlign: 'center' },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  pill: {
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    backgroundColor: colors.paper,
  },
  pillOut: { borderStyle: 'dashed', backgroundColor: 'transparent', borderColor: colors.inkSoft },
  pillText: { fontFamily: fonts.bodyBold, fontSize: size.body, color: colors.ink },
  pillTextOut: { color: colors.inkSoft, textDecorationLine: 'line-through' },
});
