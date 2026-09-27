import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Confetti, Label, Pop, RoleMark, Screen, Sticker } from '@/components/ui';
import { totalPoints } from '@/features/game/engine';
import { useGame } from '@/features/game/store';
import { categoryName } from '@/features/words/words';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { useBlockBack } from '@/lib/useBlockBack';
import { ROLE_META, colors, fonts, radius, size, space } from '@/theme/tokens';

export default function Results() {
  const { game, players, settings, scores, lastPoints, startGame } = useGame();
  // Two boxes side by side inside a card.
  const boxWidth = useColumnWidth(48 + 48 + 12 + 8) / 2 - 24;
  useBlockBack();
  if (!game?.over) return <Redirect href="/" />;

  const imposterWon = game.winner === 'imposters';
  const headline = imposterWon
    ? { text: game.lastGuess?.correct ? 'Imposter guessed it' : 'Imposter wins', color: colors.pink }
    : { text: 'Imposter caught', color: colors.cyan };
  const undercovers = Object.keys(game.roles).filter((id) => game.roles[id] === 'undercover');
  const caught = undercovers.filter((id) => game.eliminated.includes(id)).length;
  const ranked = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

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
          <Button label="Change players" variant="outline" onPress={() => router.replace('/setup')} />
          <Button label="Home" variant="ghost" onPress={() => router.dismissTo('/')} />
        </>
      }
    >
      <View style={styles.hero}>
        <Confetti delay={350} count={24} />
        <Sticker text={headline.text} color={headline.color} angle={-4} delay={200} fontSize={34} />
        {undercovers.length > 0 ? (
          <Pop delay={450}>
            <Label color={colors.amber}>
              {caught === undercovers.length
                ? `Undercover caught`
                : caught > 0
                  ? `${caught} of ${undercovers.length} Undercovers caught`
                  : 'Undercover got away'}
            </Label>
          </Pop>
        ) : null}
      </View>

      <Pop delay={600}>
        <Card tilt={-0.6}>
          <View style={styles.words}>
            <View style={[styles.wordBox, { backgroundColor: colors.cyan }]}>
              <Label color={colors.outline}>Villagers</Label>
              <Text style={[styles.word, fit(game.word)]}>{game.word}</Text>
            </View>
            {undercovers.length > 0 ? (
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

      <Pop delay={750}>
        <Card badge={settings.scoring ? 'Scores' : 'Roles'} tilt={0.4}>
          {(settings.scoring ? ranked : players).map((p, i) => {
            const role = game.roles[p.id];
            const lines = lastPoints?.[p.id] ?? [];
            const gained = totalPoints(lines);
            return (
              <View key={p.id} style={styles.row}>
                {settings.scoring ? <Text style={styles.rank}>{i + 1}</Text> : null}
                <RoleMark role={role} size={22} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, game.eliminated.includes(p.id) && styles.out]}>{p.name}</Text>
                  <Text style={styles.detail}>
                    {[ROLE_META[role].label, ...lines.map((l) => l.reason)].join(' · ')}
                  </Text>
                </View>
                {settings.scoring && gained ? <Text style={styles.gained}>+{gained}</Text> : null}
                {settings.scoring ? <Text style={styles.total}>{scores[p.id] ?? 0}</Text> : null}
              </View>
            );
          })}
        </Card>
      </Pop>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, paddingVertical: space.lg },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 },
  rank: {
    width: 22,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: size.lead,
    color: colors.textSoft,
  },
  rowName: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.body + 1 },
  out: { textDecorationLine: 'line-through', color: colors.textSoft },
  detail: { color: colors.textSoft, fontFamily: fonts.body, fontSize: size.small - 2 },
  gained: { color: colors.pink, fontFamily: fonts.display, fontSize: size.lead },
  total: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: size.title - 2,
    minWidth: 36,
    textAlign: 'right',
  },
});
