import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Confetti, Label, Pop, Screen, Sticker } from '@/components/ui';
import { type Winner } from '@/features/game/engine';
import { playerName, useGame } from '@/features/game/store';
import { categoryName } from '@/features/words/words';
import { OUTLINE, ROLE_META, colors, fonts, radius, size, space } from '@/theme/tokens';

const HEADLINE: Record<Winner, { text: string; emoji: string; color: string; line: string }> = {
  villagers: { text: 'Villagers win!', emoji: '🏡', color: colors.mint, line: 'Every faker was found out.' },
  infiltrators: {
    text: 'Fakers win!',
    emoji: '🕶️',
    color: colors.orange,
    line: 'Only one villager was left standing.',
  },
  'imposter-guess': {
    text: 'Imposter wins!',
    emoji: '🎭',
    color: colors.pink,
    line: 'Caught, but guessed the word!',
  },
};

/** Shrink long words so they fit the half-width boxes (adjustsFontSizeToFit is native-only). */
const fit = (word: string) => {
  const longest = Math.max(...word.split(' ').map((w) => w.length));
  const fontSize = longest > 9 ? 20 : longest > 7 ? 23 : 28;
  return { fontSize, lineHeight: fontSize + 8 };
};

export default function Results() {
  const { game, players, settings, scores, lastPoints, startGame } = useGame();
  if (!game?.winner) return <Redirect href="/" />;
  const head = HEADLINE[game.winner];
  const ranked = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  return (
    <Screen
      kicker="GAME OVER"
      onBack={null}
      footer={
        <>
          <Button
            label="Play again!"
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
        <Confetti delay={350} count={30} />
        <Sticker
          text={head.text}
          emoji={head.emoji}
          color={head.color}
          angle={-5}
          delay={200}
          fontSize={32}
        />
        <Pop delay={450}>
          <Body style={styles.center}>{head.line}</Body>
        </Pop>
      </View>

      <Pop delay={600}>
        <Card badge="The words" badgeColor={colors.yellow} tilt={-0.6}>
          <View style={styles.words}>
            <View style={[styles.wordBox, { backgroundColor: colors.mint }]}>
              <Label color={colors.ink}>🏡 Villagers</Label>
              <Text style={[styles.word, fit(game.word)]}>{game.word}</Text>
            </View>
            <View style={[styles.wordBox, { backgroundColor: colors.orange }]}>
              <Label color={colors.ink}>🕶️ Undercover</Label>
              <Text style={[styles.word, fit(game.cousin)]}>{game.cousin}</Text>
            </View>
          </View>
          <Body style={styles.meta}>
            Topic: {categoryName(game.categoryId)} · {game.round} round{game.round === 1 ? '' : 's'}
          </Body>
        </Card>
      </Pop>

      <Pop delay={750}>
        <Card badge={settings.scoring ? 'Scoreboard' : 'Who was who'} badgeColor={colors.pink} tilt={0.4}>
          {(settings.scoring ? ranked : players).map((p, i) => {
            const role = game.roles[p.id];
            const gained = lastPoints?.[p.id];
            return (
              <View key={p.id} style={styles.row}>
                {settings.scoring ? (
                  <Text style={styles.rank}>{i === 0 && (scores[p.id] ?? 0) > 0 ? '👑' : i + 1}</Text>
                ) : null}
                <View style={[styles.roleDot, { backgroundColor: ROLE_META[role].color }]}>
                  <Text style={{ fontSize: 16 }}>{ROLE_META[role].emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, game.eliminated.includes(p.id) && styles.out]}>{p.name}</Text>
                  <Text style={styles.roleName}>{ROLE_META[role].label}</Text>
                </View>
                {gained ? <Text style={styles.gained}>+{gained}</Text> : null}
                {settings.scoring ? <Text style={styles.total}>{scores[p.id] ?? 0}</Text> : null}
              </View>
            );
          })}
          {game.lastGuess ? (
            <Body style={styles.meta}>
              {playerName(players, game.lastGuess.by)}&apos;s guess: “{game.lastGuess.text.trim()}”
            </Body>
          ) : null}
        </Card>
      </Pop>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  center: { textAlign: 'center' },
  words: { flexDirection: 'row', gap: space.sm },
  wordBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: space.sm,
  },
  word: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: size.title - 4,
    lineHeight: size.title + 6,
    textAlign: 'center',
  },
  meta: { color: colors.inkSoft, textAlign: 'center', fontSize: size.small + 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 },
  rank: { width: 26, textAlign: 'center', fontFamily: fonts.display, fontSize: size.lead, color: colors.ink },
  roleDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: OUTLINE - 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: size.body + 1 },
  out: { textDecorationLine: 'line-through', color: colors.inkSoft },
  roleName: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: size.small - 1 },
  gained: { color: colors.mint, fontFamily: fonts.display, fontSize: size.lead },
  total: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: size.title - 2,
    minWidth: 36,
    textAlign: 'right',
  },
});
