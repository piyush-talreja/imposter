import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Label, Screen } from '@/components/ui';
import { uncaughtImposters, voteTally } from '@/features/game/engine';
import { playerName, useGame } from '@/features/game/store';
import { categoryName } from '@/features/words/words';
import { success, thud } from '@/lib/haptics';
import { colors, font, radius, space } from '@/theme/tokens';

type Step = 'tally' | 'reveal' | 'scores';

export default function Reveal() {
  const game = useGame();
  const { round, players, settings, scores, lastRoundScore } = game;
  const [step, setStep] = useState<Step>(lastRoundScore ? 'scores' : 'tally');

  if (!round) return <Redirect href="/" />;
  const tally = voteTally(round);
  const maxVotes = Math.max(1, ...Object.values(tally));
  const uncaught = uncaughtImposters(round, players);
  const needGuesses = settings.scoring ? uncaught.filter((id) => round.guesses[id] === undefined) : [];
  const imposterNames = round.imposterIds.map((id) => playerName(players, id)).join(' & ');
  const caughtAll = uncaught.length === 0;

  const goScores = () => {
    game.finishRound();
    setStep('scores');
  };

  const nextRound = () => {
    game.startRound();
    router.replace('/deal');
  };

  const endGame = () => {
    game.endGame();
    router.dismissTo('/');
  };

  if (step === 'tally') {
    return (
      <Screen
        title="Votes are in"
        onBack={null}
        footer={
          <Button
            label="Reveal the imposter"
            variant="danger"
            onPress={() => {
              thud();
              setStep('reveal');
            }}
          />
        }
      >
        {[...round.order]
          .sort((a, b) => (tally[b] ?? 0) - (tally[a] ?? 0))
          .map((id) => (
            <View key={id} style={styles.tallyRow}>
              <Text style={styles.tallyName}>{playerName(players, id)}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { width: `${((tally[id] ?? 0) / maxVotes) * 100}%` }]} />
              </View>
              <Text style={styles.tallyCount}>{tally[id] ?? 0}</Text>
            </View>
          ))}
      </Screen>
    );
  }

  if (step === 'reveal') {
    return (
      <Screen
        title={round.imposterIds.length > 1 ? 'The imposters were…' : 'The imposter was…'}
        onBack={null}
        footer={
          needGuesses.length === 0 ? (
            <Button label={settings.scoring ? 'See scores' : 'Continue'} onPress={goScores} />
          ) : null
        }
      >
        <Card style={[styles.center, { borderWidth: 2, borderColor: colors.imposter }]}>
          <Text style={styles.emoji}>🕵️</Text>
          <Text style={styles.big}>{imposterNames}</Text>
          <Body style={styles.muted}>
            {caughtAll
              ? 'Busted! The crew sniffed them out.'
              : uncaught.length === round.imposterIds.length
                ? 'Got away with it! Nobody suspected a thing.'
                : 'Some of you spotted them, some were fooled.'}
          </Body>
        </Card>

        <Card style={styles.center}>
          <Label>The secret word</Label>
          <Text style={styles.big}>{round.word}</Text>
          <Body style={styles.muted}>
            {categoryName(round.categoryId)}
            {settings.undercover ? ` · imposter had "${round.cousin}"` : ''}
          </Body>
        </Card>

        {needGuesses.map((id) => (
          <Card key={id}>
            <Body>
              Nobody picked <Text style={{ fontWeight: '800' }}>{playerName(players, id)}</Text>. Before you
              told them, could they name the secret word?
            </Body>
            <View style={styles.row}>
              <Button
                label="Yes, +1"
                style={{ flex: 1 }}
                onPress={() => {
                  success();
                  game.setGuess(id, true);
                }}
              />
              <Button
                label="No"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => game.setGuess(id, false)}
              />
            </View>
          </Card>
        ))}
      </Screen>
    );
  }

  const ranked = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  return (
    <Screen
      title={settings.scoring ? 'Scoreboard' : 'Round over'}
      onBack={null}
      footer={
        <>
          <Button label="Next round" onPress={nextRound} />
          <Button label="End game" variant="ghost" onPress={endGame} />
        </>
      }
    >
      {settings.scoring ? (
        ranked.map((p, i) => {
          const gained = lastRoundScore?.[p.id];
          return (
            <View key={p.id} style={styles.scoreRow}>
              <Text style={styles.rank}>{i === 0 && (scores[p.id] ?? 0) > 0 ? '👑' : i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.scoreName}>
                  {p.name}
                  {round.imposterIds.includes(p.id) ? '  🕵️' : ''}
                </Text>
                {gained && gained.reasons.length > 0 ? (
                  <Text style={styles.reasons}>{gained.reasons.join(' · ')}</Text>
                ) : null}
              </View>
              {gained && gained.points > 0 ? <Text style={styles.gained}>+{gained.points}</Text> : null}
              <Text style={styles.total}>{scores[p.id] ?? 0}</Text>
            </View>
          );
        })
      ) : (
        <Body style={styles.muted}>Laugh about the weird clues, then deal the next word.</Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  emoji: { fontSize: 56 },
  big: { color: colors.text, fontSize: font.hero, fontWeight: '900', textAlign: 'center' },
  muted: { color: colors.muted, textAlign: 'center' },
  row: { flexDirection: 'row', gap: space.sm },
  tallyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tallyName: { color: colors.text, fontSize: font.body, fontWeight: '600', width: 96 },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  bar: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
  tallyCount: { color: colors.text, fontWeight: '800', width: 24, textAlign: 'right' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
  rank: { color: colors.muted, fontWeight: '800', width: 28, textAlign: 'center', fontSize: font.body },
  scoreName: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  reasons: { color: colors.muted, fontSize: font.small - 1, marginTop: 2 },
  gained: { color: colors.success, fontWeight: '800' },
  total: { color: colors.text, fontSize: font.title, fontWeight: '900', minWidth: 32, textAlign: 'right' },
});
