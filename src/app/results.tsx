import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Character, LOOK_FOR_ROLE } from '@/components/Character';
import { Button, Card, Confetti, Label, Pop, Screen, Sticker } from '@/components/ui';
import { POINTS, type Game, type Role } from '@/features/game/engine';
import { useGame } from '@/features/game/store';
import { categoryName } from '@/features/words/words';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { play } from '@/lib/sound';
import { useBlockBack } from '@/lib/useBlockBack';
import { ROLE_META, colors, fonts, radius, size, space } from '@/theme/tokens';

/** What happened this game, as a few short lines instead of per-player text. */
function summary(game: Game): { text: string; points: number; color: string }[] {
  const lines: { text: string; points: number; color: string }[] = [];
  const undercovers = Object.keys(game.roles).filter((id) => game.roles[id] === 'undercover');
  const caught = undercovers.filter((id) => game.eliminated.includes(id)).length;
  if (game.winner === 'villagers') {
    lines.push({
      text: 'Imposter caught · Villagers & Undercover',
      points: POINTS.imposterCaught,
      color: colors.cyan,
    });
  } else {
    lines.push({ text: 'Imposter wins', points: POINTS.imposterWins, color: colors.pink });
  }
  if (caught > 0)
    lines.push({
      text: 'Undercover caught · Villagers',
      points: POINTS.undercoverCaught * caught,
      color: colors.cyan,
    });
  if (caught < undercovers.length) {
    lines.push({ text: 'Undercover never caught', points: POINTS.undercoverUndetected, color: colors.amber });
  }
  return lines;
}

export default function Results() {
  const { game, players, settings, scores, lastPoints, startGame } = useGame();
  const boxWidth = useColumnWidth(48 + 48 + 12 + 8) / 2 - 24;
  useBlockBack();
  useEffect(() => {
    const id = setTimeout(() => play('win'), 250);
    return () => clearTimeout(id);
  }, []);
  if (!game?.over) return <Redirect href="/" />;

  const imposterWon = game.winner === 'imposters';
  const headline = imposterWon
    ? {
        text: game.lastGuess?.correct ? 'Imposter guessed it' : 'Imposter wins',
        color: colors.pink,
        role: 'imposter' as Role,
      }
    : { text: 'Imposter caught', color: colors.cyan, role: 'villager' as Role };
  const hasUndercover = Object.values(game.roles).includes('undercover');
  const ranked = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const gained = (id: string) => (lastPoints?.[id] ?? []).reduce((sum, l) => sum + l.points, 0);

  const fit = (word: string) => {
    const fontSize = fitFontSize(word, size.title, boxWidth, { wrap: true });
    return { fontSize, lineHeight: fontSize + 6 };
  };

  return (
    <Screen
      kicker="GAME OVER"
      onBack={null}
      footer={
        <>
          <Button
            label="Play again"
            onPress={() => {
              startGame();
              router.replace('/deal');
            }}
          />
          <View style={styles.links}>
            <Button label="Change players" variant="ghost" onPress={() => router.replace('/setup')} />
            <Button label="Home" variant="ghost" onPress={() => router.dismissTo('/')} />
          </View>
        </>
      }
    >
      <View style={styles.hero}>
        <Confetti delay={350} count={24} />
        <Pop>
          <Character color={headline.color} look={LOOK_FOR_ROLE[headline.role]} size={64} />
        </Pop>
        <Sticker text={headline.text} color={headline.color} angle={-4} delay={200} fontSize={34} />
      </View>

      {settings.scoring ? (
        <Pop delay={600}>
          <Card badge="Scores" tilt={0.4}>
            <View style={styles.summary}>
              {summary(game).map((l) => (
                <View key={l.text} style={styles.summaryRow}>
                  <Text style={[styles.summaryPts, { color: l.color }]}>+{l.points}</Text>
                  <Text style={styles.summaryText}>{l.text}</Text>
                </View>
              ))}
            </View>
            {ranked.map((p, i) => {
              const role = game.roles[p.id];
              const plus = gained(p.id);
              return (
                <View key={p.id} style={[styles.row, i === 0 && styles.leader]}>
                  <Text style={styles.rank}>{i + 1}</Text>
                  <Character color={ROLE_META[role].color} look={LOOK_FOR_ROLE[role]} size={30} />
                  <Text
                    style={[styles.rowName, game.eliminated.includes(p.id) && styles.out]}
                    numberOfLines={2}
                  >
                    {p.name}
                  </Text>
                  {plus ? <Text style={styles.gained}>+{plus}</Text> : null}
                  <Text style={styles.total}>{scores[p.id] ?? 0}</Text>
                </View>
              );
            })}
          </Card>
        </Pop>
      ) : (
        <Pop delay={600}>
          <Card badge="Roles" tilt={0.4}>
            {players.map((p) => {
              const role = game.roles[p.id];
              return (
                <View key={p.id} style={styles.row}>
                  <Character color={ROLE_META[role].color} look={LOOK_FOR_ROLE[role]} size={30} />
                  <Text style={styles.rowName}>{p.name}</Text>
                  <Text style={[styles.roleName, { color: ROLE_META[role].color }]}>
                    {ROLE_META[role].label}
                  </Text>
                </View>
              );
            })}
          </Card>
        </Pop>
      )}
      <Pop delay={450}>
        <Card tilt={-0.6}>
          <View style={styles.words}>
            <View style={[styles.wordBox, { backgroundColor: colors.cyan }]}>
              <Label color={colors.outline}>Villagers</Label>
              <Text style={[styles.word, fit(game.word)]}>{game.word}</Text>
            </View>
            {hasUndercover ? (
              <View style={[styles.wordBox, { backgroundColor: colors.amber }]}>
                <Label color={colors.outline}>Undercover</Label>
                <Text style={[styles.word, fit(game.cousin)]}>{game.cousin}</Text>
              </View>
            ) : null}
          </View>
          <Label>
            {categoryName(game.categoryId)} · {game.round} round{game.round === 1 ? '' : 's'}
          </Label>
        </Card>
      </Pop>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm },
  links: { flexDirection: 'row', justifyContent: 'center', gap: space.xl },
  words: { flexDirection: 'row', gap: space.sm },
  wordBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderWidth: 2.5,
    borderColor: colors.outline,
    borderRadius: radius.md,
    padding: space.sm,
  },
  word: { color: colors.outline, fontFamily: fonts.display, textAlign: 'center' },
  summary: { gap: 4, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: colors.raised },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  summaryPts: { fontFamily: fonts.display, fontSize: size.lead, width: 34 },
  summaryText: { color: colors.textSoft, fontFamily: fonts.body, fontSize: size.small, flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  leader: { backgroundColor: colors.raised, borderRadius: radius.sm },
  rank: {
    width: 20,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: size.lead,
    color: colors.textSoft,
  },
  rowName: { flex: 1, color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.body + 1 },
  out: { color: colors.textSoft },
  roleName: { fontFamily: fonts.bodyBold, fontSize: size.small },
  gained: { color: colors.pink, fontFamily: fonts.display, fontSize: size.lead },
  total: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: size.title - 2,
    minWidth: 36,
    textAlign: 'right',
  },
});
