import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Label, Paper, Rise, Screen, Stamp, Type } from '@/components/ui';
import { type Winner } from '@/features/game/engine';
import { playerName, useGame } from '@/features/game/store';
import { useBlockBack } from '@/lib/useBlockBack';
import { categoryName } from '@/features/words/words';
import { ROLE_META, colors, fonts, size, space } from '@/theme/tokens';

const HEADLINE: Record<Winner, { stamp: string; ink: string; line: string }> = {
  villagers: { stamp: 'Villagers win', ink: colors.villager, line: 'Every infiltrator was rooted out.' },
  infiltrators: { stamp: 'Infiltrators win', ink: colors.imposter, line: 'Only one villager left standing.' },
  'imposter-guess': { stamp: 'Imposter wins', ink: colors.imposter, line: 'Caught, but cracked the word.' },
};

export default function CaseClosed() {
  const { game, players, settings, scores, lastPoints, startGame } = useGame();
  useBlockBack();
  if (!game?.winner) return <Redirect href="/" />;
  const head = HEADLINE[game.winner];
  const ranked = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  return (
    <Screen
      kicker="CASE CLOSED"
      onBack={null}
      footer={
        <>
          <Button
            label="Next case"
            onPress={() => {
              startGame();
              router.replace('/deal');
            }}
          />
          <Button label="Change suspects" variant="paper" onPress={() => router.replace('/setup')} />
          <Button label="Home" variant="ghost" onPress={() => router.dismissTo('/')} />
        </>
      }
    >
      <View style={styles.hero}>
        <Stamp text={head.stamp} ink={head.ink} angle={-6} delay={200} fontSize={30} />
        <Rise delay={500}>
          <Type style={styles.line}>{head.line}</Type>
        </Rise>
      </View>

      <Rise delay={650}>
        <Paper tab="The words" tilt={-0.5}>
          <View style={styles.words}>
            <View style={styles.wordCol}>
              <Label color={colors.villager}>Villagers</Label>
              <Text style={styles.word}>{game.word}</Text>
            </View>
            <View style={styles.wordCol}>
              <Label color={colors.undercover}>Undercover</Label>
              <Text style={styles.word}>{game.cousin}</Text>
            </View>
          </View>
          <Type style={styles.muted}>
            Case file: {categoryName(game.categoryId)} · {game.round} round{game.round === 1 ? '' : 's'}
          </Type>
        </Paper>
      </Rise>

      <Rise delay={800}>
        <Paper tab={settings.scoring ? 'Standings' : 'Who was who'} tilt={0.4}>
          {(settings.scoring ? ranked : players).map((p, i) => {
            const role = game.roles[p.id];
            const gained = lastPoints?.[p.id];
            return (
              <View key={p.id} style={styles.row}>
                {settings.scoring ? (
                  <Text style={styles.rank}>{i === 0 && (scores[p.id] ?? 0) > 0 ? '★' : i + 1}</Text>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, game.eliminated.includes(p.id) && styles.out]}>{p.name}</Text>
                  <Text style={[styles.roleTag, { color: ROLE_META[role].ink }]}>
                    {ROLE_META[role].label.toUpperCase()}
                  </Text>
                </View>
                {gained ? <Text style={styles.gained}>+{gained}</Text> : null}
                {settings.scoring ? <Text style={styles.total}>{scores[p.id] ?? 0}</Text> : null}
              </View>
            );
          })}
          {game.lastGuess ? (
            <Type style={styles.muted}>
              {playerName(players, game.lastGuess.by)}&apos;s last guess: “{game.lastGuess.text.trim()}”
            </Type>
          ) : null}
        </Paper>
      </Rise>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  line: { color: colors.mutedOnDark, textAlign: 'center' },
  words: { flexDirection: 'row', gap: space.md },
  wordCol: { flex: 1, alignItems: 'center', gap: 2 },
  word: { color: colors.ink, fontFamily: fonts.display, fontSize: size.title, textAlign: 'center' },
  muted: { color: colors.muted, textAlign: 'center', fontSize: size.small },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.paperEdge,
  },
  rank: {
    width: 22,
    textAlign: 'center',
    color: colors.brass,
    fontFamily: fonts.display,
    fontSize: size.lead,
  },
  rowName: { color: colors.ink, fontFamily: fonts.type, fontSize: size.lead },
  out: { textDecorationLine: 'line-through', color: colors.muted },
  roleTag: { fontFamily: fonts.stencil, fontSize: 11, letterSpacing: 1.5, marginTop: 1 },
  gained: { color: colors.success, fontFamily: fonts.stencil, fontSize: size.body },
  total: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: size.title,
    minWidth: 36,
    textAlign: 'right',
  },
});
