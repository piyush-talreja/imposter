import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Confetti, Label, Pop, Screen, Sticker } from '@/components/ui';
import { isCorrectGuess } from '@/features/game/engine';
import { playerName, useGame } from '@/features/game/store';
import { OUTLINE, ROLE_META, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

export default function Reveal() {
  const { game, players, guess, continueRound } = useGame();
  const [text, setText] = useState('');
  const [missed, setMissed] = useState(false);

  if (!game || game.eliminated.length === 0) return <Redirect href="/" />;
  const outId = game.eliminated[game.eliminated.length - 1];
  const name = playerName(players, outId);
  const role = game.roles[outId];
  const meta = ROLE_META[role];
  const awaitingGuess = game.pendingGuess === outId;

  const check = () => {
    if (!text.trim()) return;
    // An exact (normalized) match is final; a miss lets the table overrule a near-miss.
    if (isCorrectGuess(text, game.word)) guess(text);
    else setMissed(true);
  };

  const footer = awaitingGuess ? (
    missed ? (
      <>
        <Button label="Nope, wrong!" color={colors.blue} onPress={() => guess(text)} />
        <Button label="Close enough, count it" variant="ghost" onPress={() => guess(text, true)} />
      </>
    ) : (
      <Button label="Lock in the guess" onPress={check} disabled={!text.trim()} />
    )
  ) : game.winner ? (
    <Button label="See who won! 🎉" color={colors.mint} onPress={() => router.replace('/results')} />
  ) : (
    <Button
      label={`On to round ${game.round + 1}`}
      color={colors.blue}
      onPress={() => {
        continueRound();
        router.replace('/clues');
      }}
    />
  );

  return (
    <Screen kicker={`ROUND ${game.round} · THE REVEAL`} onBack={null} footer={footer}>
      <Pop>
        <Card
          badge={`${name} was…`}
          badgeColor={colors.white}
          color={colors.paper}
          tilt={-0.8}
          style={styles.reveal}
        >
          <Text style={styles.bigEmoji}>{meta.emoji}</Text>
          <View style={styles.stickerSlot}>
            <Confetti delay={520} />
            <Sticker
              text={meta.label}
              color={meta.color}
              angle={-6}
              delay={420}
              fontSize={role === 'undercover' ? 34 : 40}
            />
          </View>
          <Body style={styles.center}>
            {role === 'villager'
              ? `Oops! ${name} was innocent all along.`
              : role === 'undercover'
                ? `Gotcha! ${name}'s word was “${game.cousin}”, close but not the same.`
                : `Busted! But ${name} gets one last chance…`}
          </Body>
        </Card>
      </Pop>

      {awaitingGuess ? (
        <Pop delay={650}>
          <Card badge="Last chance" badgeColor={colors.pink} tilt={0.6}>
            <Body>
              <Text style={styles.strong}>{name}</Text>, what&apos;s the secret word? Get it right and you win
              the whole game!
            </Body>
            <TextInput
              value={text}
              onChangeText={(t) => {
                setText(t);
                setMissed(false);
              }}
              onSubmitEditing={check}
              placeholder="Type your guess…"
              placeholderTextColor={colors.inkSoft}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabel="Imposter's guess"
              style={styles.input}
            />
            {missed ? (
              <Body style={{ color: colors.pink }}>Hmm, “{text.trim()}” doesn&apos;t match exactly.</Body>
            ) : null}
          </Card>
        </Pop>
      ) : null}

      {game.lastGuess ? (
        <Pop>
          <Card badge="The guess" badgeColor={colors.yellow} tilt={0.6} style={styles.reveal}>
            <Body style={styles.center}>
              {playerName(players, game.lastGuess.by)} guessed “{game.lastGuess.text.trim()}”
            </Body>
            <View style={styles.stickerSlot}>
              {game.lastGuess.correct ? <Confetti delay={150} /> : null}
              <Sticker
                text={game.lastGuess.correct ? 'Nailed it!' : 'Nope!'}
                emoji={game.lastGuess.correct ? '🎯' : '❌'}
                color={game.lastGuess.correct ? colors.pink : colors.blue}
                angle={5}
                delay={100}
                fontSize={30}
              />
            </View>
          </Card>
        </Pop>
      ) : null}

      {!awaitingGuess ? (
        <Label color={colors.inkSoft}>
          {game.winner ? 'And that ends the game!' : 'No winner yet. Keep going!'}
        </Label>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  reveal: { alignItems: 'center' },
  bigEmoji: { fontSize: 64 },
  stickerSlot: { minHeight: 84, justifyContent: 'center', alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  strong: { fontFamily: fonts.bodyBold, color: colors.pink },
  input: {
    minHeight: TOUCH + 10,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: OUTLINE,
    borderColor: colors.ink,
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: size.lead,
    paddingHorizontal: space.md,
  },
});
