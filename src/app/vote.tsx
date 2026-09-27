import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Label, Screen } from '@/components/ui';
import { playerName, useGame } from '@/features/game/store';
import { tap } from '@/lib/haptics';
import { TOUCH, colors, font, radius, space } from '@/theme/tokens';

// Secret ballot: the phone goes round once more so nobody is swayed by others' votes.
export default function Vote() {
  const { round, players, castVote } = useGame();
  const [index, setIndex] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);

  if (!round) return <Redirect href="/" />;
  const voterId = round.order[index];
  const voter = playerName(players, voterId);
  const isLast = index === round.order.length - 1;

  const confirm = () => {
    if (!choice) return;
    castVote(voterId, choice);
    setChoice(null);
    setChoosing(false);
    if (isLast) router.replace('/reveal');
    else setIndex(index + 1);
  };

  return (
    <Screen
      title={`Vote · ${index + 1} of ${round.order.length}`}
      backLabel="‹ Quit"
      onBack={() => router.dismissTo('/')}
      footer={
        choosing ? (
          <Button label="Lock in vote" onPress={confirm} disabled={!choice} />
        ) : (
          <Button label={`I'm ${voter}, let me vote`} onPress={() => setChoosing(true)} />
        )
      }
    >
      {!choosing ? (
        <View style={styles.pass}>
          <Label>Pass the phone to</Label>
          <Text style={styles.name}>{voter}</Text>
          <Body style={styles.muted}>Votes are secret until everyone has voted.</Body>
        </View>
      ) : (
        <>
          <Body>
            <Text style={{ fontWeight: '800' }}>{voter}</Text>, who is the imposter?
          </Body>
          <View style={styles.grid}>
            {round.order
              .filter((id) => id !== voterId)
              .map((id) => {
                const selected = choice === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => {
                      tap();
                      setChoice(id);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <Text style={styles.optionText}>{playerName(players, id)}</Text>
                  </Pressable>
                );
              })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pass: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.md, minHeight: 360 },
  name: { color: colors.text, fontSize: font.giant, fontWeight: '900', textAlign: 'center' },
  muted: { color: colors.muted, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: TOUCH + 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.sm,
  },
  optionSelected: { borderColor: colors.imposter, backgroundColor: colors.surfaceRaised },
  optionText: { color: colors.text, fontSize: font.body + 1, fontWeight: '700' },
});
