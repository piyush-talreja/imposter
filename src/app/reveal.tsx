import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Confetti, Label, Pop, RoleMark, Screen, Sticker } from '@/components/ui';
import { inBonusRound, isCorrectGuess } from '@/features/game/engine';
import { playerName, useGame } from '@/features/game/store';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { useBlockBack } from '@/lib/useBlockBack';
import { OUTLINE, ROLE_META, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

export default function Reveal() {
  const { game, players, guess, continueRound } = useGame();
  const [text, setText] = useState('');
  const [missed, setMissed] = useState(false);
  const nameWidth = useColumnWidth(48 + 48 + 12);
  useBlockBack();

  if (!game || game.eliminated.length === 0) return <Redirect href="/" />;
  const outId = game.eliminated[game.eliminated.length - 1];
  const name = playerName(players, outId);
  const role = game.roles[outId];
  const meta = ROLE_META[role];
  const awaitingGuess = game.pendingGuess === outId;
  const bonus = inBonusRound(game);
  // The imposter was just caught and an undercover is still in: announce the bonus round.
  const bonusStarts = bonus && role === 'imposter';

  const check = () => {
    if (!text.trim()) return;
    // An exact (normalized) match is final; a miss lets the table overrule a near-miss.
    if (isCorrectGuess(text, game.word)) guess(text);
    else setMissed(true);
  };

  const footer = awaitingGuess ? (
    missed ? (
      <>
        <Button label="Wrong" onPress={() => guess(text)} />
        <Button label="Close enough, count it" variant="ghost" onPress={() => guess(text, true)} />
      </>
    ) : (
      <Button label="Guess" onPress={check} disabled={!text.trim()} />
    )
  ) : game.over ? (
    <Button label="Results" onPress={() => router.replace('/results')} />
  ) : (
    <Button
      label={bonusStarts ? 'Start bonus round' : `Round ${game.round + 1}`}
      onPress={() => {
        continueRound();
        router.replace('/clues');
      }}
    />
  );

  const line =
    role === 'villager'
      ? 'Innocent.'
      : role === 'undercover'
        ? `Their word was “${game.cousin}”.`
        : awaitingGuess
          ? 'One guess at the word.'
          : !game.winner
            ? 'Another Imposter is still in.'
            : null;

  const fontSize = fitFontSize(name, size.hero, nameWidth);

  return (
    <Screen
      kicker={bonus && !bonusStarts ? `BONUS ROUND · ${game.round}` : `ROUND ${game.round}`}
      onBack={null}
      footer={footer}
    >
      <Pop>
        <Card tilt={-0.8} style={styles.reveal}>
          <Text
            style={[styles.name, { fontSize, lineHeight: Math.round(fontSize * 1.15) }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <View style={styles.stickerSlot}>
            <Confetti delay={520} />
            <Sticker text={meta.label} color={meta.color} angle={-6} delay={420} fontSize={36} />
          </View>
          {line ? <Body style={styles.center}>{line}</Body> : null}
        </Card>
      </Pop>

      {awaitingGuess ? (
        <Pop delay={650}>
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              setMissed(false);
            }}
            onSubmitEditing={check}
            placeholder="The word is…"
            placeholderTextColor={colors.textSoft}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Imposter's guess"
            style={styles.input}
          />
          {missed ? <Body style={styles.miss}>Not an exact match.</Body> : null}
        </Pop>
      ) : null}

      {game.lastGuess ? (
        <Pop>
          <Card tilt={0.6} style={styles.reveal}>
            <Label>Guessed “{game.lastGuess.text.trim()}”</Label>
            <View style={styles.stickerSlot}>
              {game.lastGuess.correct ? <Confetti delay={150} /> : null}
              <Sticker
                text={game.lastGuess.correct ? 'Correct' : 'Wrong'}
                color={game.lastGuess.correct ? colors.pink : colors.raised}
                angle={5}
                delay={100}
                fontSize={30}
              />
            </View>
          </Card>
        </Pop>
      ) : null}

      {bonusStarts ? (
        <Pop delay={300}>
          <Card style={styles.bonus}>
            <RoleMark role="undercover" size={32} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bonusTitle}>An Undercover is still in</Text>
              <Body style={styles.bonusText}>Catch them for bonus points.</Body>
            </View>
          </Card>
        </Pop>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  reveal: { alignItems: 'center' },
  name: { color: colors.text, fontFamily: fonts.display, textAlign: 'center' },
  stickerSlot: { minHeight: 84, justifyContent: 'center', alignSelf: 'stretch' },
  center: { textAlign: 'center', color: colors.textSoft },
  miss: { color: colors.pink, marginTop: space.sm, textAlign: 'center' },
  input: {
    minHeight: TOUCH + 10,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: size.lead,
    paddingHorizontal: space.md,
  },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bonusTitle: { color: colors.amber, fontFamily: fonts.display, fontSize: size.lead + 2 },
  bonusText: { color: colors.textSoft, fontSize: size.small + 1 },
});
