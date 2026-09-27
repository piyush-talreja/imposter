import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Label, Paper, Rise, Screen, Stamp, Type } from '@/components/ui';
import { isCorrectGuess } from '@/features/game/engine';
import { playerName, useGame } from '@/features/game/store';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { useBlockBack } from '@/lib/useBlockBack';
import { ROLE_META, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

export default function Verdict() {
  const { game, players, guess, continueRound } = useGame();
  const nameWidth = useColumnWidth(48 + 48 + 4);
  useBlockBack();
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(false);

  if (!game || game.eliminated.length === 0) return <Redirect href="/" />;
  const outId = game.eliminated[game.eliminated.length - 1];
  const name = playerName(players, outId);
  const role = game.roles[outId];
  const meta = ROLE_META[role];
  const awaitingGuess = game.pendingGuess === outId;
  const correctPreview = checked && isCorrectGuess(text, game.word);

  const check = () => {
    if (!text.trim()) return;
    // An exact (normalized) match is final; a miss lets the table overrule a near-miss.
    if (isCorrectGuess(text, game.word)) guess(text);
    else setChecked(true);
  };

  const footer = awaitingGuess ? (
    checked && !correctPreview ? (
      <>
        <Button label="Wrong · confirm" ink={colors.ink} onPress={() => guess(text)} />
        <Button label="Close enough, count it" variant="ghost" onPress={() => guess(text, true)} />
      </>
    ) : (
      <Button label="Submit the guess" onPress={check} disabled={!text.trim()} />
    )
  ) : game.winner ? (
    <Button label="Close the case" onPress={() => router.replace('/case-closed')} />
  ) : (
    <Button
      label={`Round ${game.round + 1}`}
      ink={colors.ink}
      onPress={() => {
        continueRound();
        router.replace('/clues');
      }}
    />
  );

  return (
    <Screen kicker={`ROUND ${game.round} · THE VERDICT`} onBack={null} footer={footer}>
      <Rise>
        <Paper tab="Identity confirmed" tilt={-0.7} style={styles.dossier}>
          <Label>The table eliminated</Label>
          <Text
            style={[styles.name, sized(fitFontSize(name, size.giant - 4, nameWidth, { wrap: true }))]}
            numberOfLines={2}
          >
            {name}
          </Text>
          <Type style={styles.muted}>who was…</Type>
          <View style={styles.stampSlot}>
            <Stamp
              text={meta.label}
              ink={meta.ink}
              angle={-7}
              delay={450}
              fontSize={meta.label.length > 8 ? 30 : 38}
            />
          </View>
          <Type style={styles.muted}>
            {role === 'villager'
              ? 'An innocent villager. Oops.'
              : role === 'undercover'
                ? 'Undercover all along, with a word that was close but not quite.'
                : 'The imposter! But they get one last shot…'}
          </Type>
        </Paper>
      </Rise>

      {awaitingGuess ? (
        <Rise delay={700}>
          <Paper tab="Last words" tilt={0.6}>
            <Type>
              <Text style={{ color: colors.imposter }}>{name}</Text>, name the villagers&apos; secret word.
              Get it right and you win the whole game.
            </Type>
            <TextInput
              value={text}
              onChangeText={(t) => {
                setText(t);
                setChecked(false);
              }}
              onSubmitEditing={check}
              placeholder="The secret word is…"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabel="Imposter's guess"
              style={styles.input}
            />
            {checked && !correctPreview ? (
              <Type style={{ color: colors.imposter }}>“{text.trim()}” isn&apos;t an exact match.</Type>
            ) : null}
          </Paper>
        </Rise>
      ) : null}

      {game.lastGuess ? (
        <Rise>
          <Paper tab="Last words" tilt={0.6} style={styles.dossier}>
            <Type style={styles.muted}>
              {playerName(players, game.lastGuess.by)} guessed “{game.lastGuess.text.trim()}”
            </Type>
            <Stamp
              text={game.lastGuess.correct ? 'Cracked it' : 'Wrong'}
              ink={game.lastGuess.correct ? colors.imposter : colors.villager}
              angle={6}
              delay={120}
              fontSize={30}
            />
          </Paper>
        </Rise>
      ) : null}

      {game.winner ? (
        <Label color={colors.brass}>That settles it. The case is closed.</Label>
      ) : !awaitingGuess ? (
        <Label color={colors.mutedOnDark}>No winner yet. The game goes on.</Label>
      ) : null}
    </Screen>
  );
}

const sized = (fontSize: number) => ({ fontSize, lineHeight: Math.round(fontSize * 1.2) });

const styles = StyleSheet.create({
  dossier: { alignItems: 'center' },
  name: { color: colors.ink, fontFamily: fonts.display, fontSize: size.giant - 4, textAlign: 'center' },
  muted: { color: colors.muted, textAlign: 'center' },
  // Stretch so the stamp's percentage maxWidth resolves against the card, not itself.
  stampSlot: { minHeight: 90, justifyContent: 'center', alignSelf: 'stretch' },
  input: {
    minHeight: TOUCH + 8,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.ink,
    color: colors.ink,
    fontFamily: fonts.type,
    fontSize: size.lead,
    paddingHorizontal: space.md,
  },
});
