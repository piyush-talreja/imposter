import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Chip, Label, Screen, Stepper, ToggleRow } from '@/components/ui';
import { MIN_PLAYERS, maxImposters, wordPool } from '@/features/game/engine';
import { useGame } from '@/features/game/store';
import { CATEGORIES, WORDS, type Difficulty } from '@/features/words/words';
import { TOUCH, colors, font, radius, space } from '@/theme/tokens';

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const toggle = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

export default function Setup() {
  const { players, settings, addPlayer, removePlayer, updateSettings, startRound, endGame } = useGame();
  const [name, setName] = useState('');

  const duplicate = players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  const submitName = () => {
    if (!name.trim() || duplicate) return;
    addPlayer(name);
    setName('');
  };

  const maxImp = maxImposters(players.length);
  const poolSize = wordPool(WORDS, settings).length;
  const problem =
    players.length < MIN_PLAYERS
      ? `Add ${MIN_PLAYERS - players.length} more player${MIN_PLAYERS - players.length === 1 ? '' : 's'}`
      : settings.difficulties.length === 0
        ? 'Pick at least one difficulty'
        : poolSize === 0
          ? 'No words match. Try more categories or difficulties'
          : null;

  const start = () => {
    endGame(); // fresh scoreboard for a new game
    startRound();
    router.push('/deal');
  };

  return (
    <Screen
      title="New game"
      footer={
        <>
          {problem ? <Text style={styles.problem}>{problem}</Text> : null}
          <Button label="Start game" onPress={start} disabled={!!problem} />
        </>
      }
    >
      <Card>
        <Label>Players · {players.length}</Label>
        <Body style={styles.hint}>Add them in seating order. Clues go clockwise.</Body>
        {players.map((p, i) => (
          <View key={p.id} style={styles.player}>
            <Text style={styles.playerIndex}>{i + 1}</Text>
            <Text style={styles.playerName}>{p.name}</Text>
            <Pressable
              onPress={() => removePlayer(p.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${p.name}`}
              style={styles.remove}
            >
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submitName}
            placeholder="Player name"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            submitBehavior="submit"
            maxLength={20}
            autoCapitalize="words"
            accessibilityLabel="New player name"
            style={styles.input}
          />
          <Button
            label="Add"
            onPress={submitName}
            disabled={!name.trim() || duplicate}
            style={{ paddingHorizontal: space.lg, flexShrink: 0 }}
          />
        </View>
        {duplicate && name.trim() ? <Text style={styles.problem}>That name is taken</Text> : null}
      </Card>

      <Card>
        <Label>Categories</Label>
        <View style={styles.chips}>
          <Chip
            label="🎲 All"
            selected={settings.categoryIds.length === 0}
            onPress={() => updateSettings({ categoryIds: [] })}
          />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={`${c.emoji} ${c.name}`}
              selected={settings.categoryIds.includes(c.id)}
              onPress={() => updateSettings({ categoryIds: toggle(settings.categoryIds, c.id) })}
            />
          ))}
        </View>

        <Label>Difficulty</Label>
        <View style={styles.chips}>
          {DIFFICULTIES.map((d) => (
            <Chip
              key={d.id}
              label={d.label}
              selected={settings.difficulties.includes(d.id)}
              onPress={() => updateSettings({ difficulties: toggle(settings.difficulties, d.id) })}
            />
          ))}
          <Chip
            label="🧒 Kids mode"
            selected={settings.difficulties.length === 1 && settings.difficulties[0] === 'easy'}
            onPress={() => updateSettings({ difficulties: ['easy'] })}
          />
        </View>
      </Card>

      <Card>
        <Label>Rules</Label>
        <Stepper
          label="Imposters"
          value={Math.min(settings.imposterCount, maxImp)}
          min={1}
          max={maxImp}
          onChange={(v) => updateSettings({ imposterCount: v })}
        />
        {maxImp === 1 ? <Text style={styles.hint}>2 imposters unlock at 7 players</Text> : null}
        <Stepper
          label="Clue passes"
          value={settings.passes}
          min={1}
          max={5}
          onChange={(v) => updateSettings({ passes: v })}
        />
        <ToggleRow
          label="Keep score"
          hint="Points for catching, and for fooling"
          value={settings.scoring}
          onChange={(v) => updateSettings({ scoring: v })}
        />
        <ToggleRow
          label="Imposter sees category"
          hint="Easier for the imposter"
          value={settings.imposterSeesCategory && !settings.undercover}
          disabled={settings.undercover}
          onChange={(v) => updateSettings({ imposterSeesCategory: v })}
        />
        <ToggleRow
          label="Undercover mode"
          hint="The imposter gets a similar word and doesn't know they're the imposter"
          value={settings.undercover}
          onChange={(v) => updateSettings({ undercover: v })}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontSize: font.small },
  problem: { color: colors.warning, fontSize: font.small, textAlign: 'center' },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: TOUCH,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  playerIndex: { color: colors.muted, width: 20, fontWeight: '700' },
  playerName: { color: colors.text, fontSize: font.body, flex: 1, fontWeight: '600' },
  remove: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.muted, fontSize: font.body },
  addRow: { flexDirection: 'row', gap: space.sm },
  input: {
    flex: 1,
    minWidth: 0, // web TextInput has an intrinsic width that otherwise pushes Add out
    minHeight: TOUCH + 8,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: font.body,
    paddingHorizontal: space.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
