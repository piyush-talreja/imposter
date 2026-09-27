import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Screen, ToggleRow } from '@/components/ui';
import { MIN_PLAYERS, wordPool } from '@/features/game/engine';
import { SettingsCards } from '@/features/game/SettingsCards';
import { useGame } from '@/features/game/store';
import { WORDS } from '@/features/words/words';
import { OUTLINE, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

export default function Setup() {
  const {
    players,
    settings,
    addPlayer,
    removePlayer,
    updateSettings,
    startGame,
    resetScores,
    sound,
    setSound,
  } = useGame();
  const [name, setName] = useState('');

  const duplicate = players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  const submitName = () => {
    if (!name.trim() || duplicate) return;
    addPlayer(name);
    setName('');
  };

  const n = players.length;

  const problem =
    n < MIN_PLAYERS
      ? `Add ${MIN_PLAYERS - n} more player${MIN_PLAYERS - n === 1 ? '' : 's'}`
      : settings.difficulties.length === 0
        ? 'Pick a difficulty'
        : wordPool(WORDS, settings).length === 0
          ? 'No words match. Pick more topics'
          : null;

  const start = () => {
    resetScores();
    startGame();
    router.push('/deal');
  };

  return (
    <Screen
      kicker="NEW GAME"
      title="Players"
      footer={
        <>
          {problem ? <Text style={styles.problem}>{problem}</Text> : null}
          <Button label="Deal" onPress={start} disabled={!!problem} />
        </>
      }
    >
      <Card badge={`${n} · in seating order`} tilt={-0.6}>
        <View style={styles.players}>
          {players.map((p) => (
            <View key={p.id} style={styles.player}>
              <Text style={styles.playerName}>{p.name}</Text>
              <Pressable
                onPress={() => removePlayer(p.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${p.name}`}
                style={styles.remove}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submitName}
            placeholder="Name"
            placeholderTextColor={colors.textSoft}
            returnKeyType="done"
            submitBehavior="submit"
            maxLength={16}
            autoCapitalize="words"
            accessibilityLabel="New player name"
            style={styles.input}
          />
          <Button
            label="Add"
            onPress={submitName}
            disabled={!name.trim() || duplicate}
            style={styles.addButton}
          />
        </View>
        {duplicate && name.trim() ? <Text style={styles.problem}>Name taken</Text> : null}
      </Card>

      <SettingsCards
        settings={settings}
        onChange={updateSettings}
        playerCount={n}
        extraRules={<ToggleRow label="Sound effects" value={sound} onChange={setSound} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  problem: { color: colors.pink, fontFamily: fonts.bodyBold, fontSize: size.small + 1, textAlign: 'center' },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: colors.outline,
    borderRadius: radius.pill,
    backgroundColor: colors.raised,
    paddingLeft: space.md,
    minHeight: 42,
  },
  playerName: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.body },
  remove: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.textSoft, fontFamily: fonts.bodyBold, fontSize: 22, lineHeight: 24 },
  addRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  input: {
    flex: 1,
    minWidth: 0, // web TextInput has an intrinsic width that otherwise pushes Add out
    minHeight: TOUCH + 10,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: size.body + 1,
    paddingHorizontal: space.md,
  },
  addButton: { flexShrink: 0 },
});
