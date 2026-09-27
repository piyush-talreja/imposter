import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Chip, Label, Screen, Stepper, ToggleRow } from '@/components/ui';
import {
  MIN_PLAYERS,
  MIN_PLAYERS_FOR_UNDERCOVER,
  effectiveRoles,
  maxInfiltrators,
  maxUndercover,
  wordPool,
} from '@/features/game/engine';
import { useGame } from '@/features/game/store';
import { CATEGORIES, WORDS, type Difficulty } from '@/features/words/words';
import { OUTLINE, ROLE_META, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const toggle = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

export default function Setup() {
  const { players, settings, addPlayer, removePlayer, updateSettings, startGame, resetScores } = useGame();
  const [name, setName] = useState('');

  const duplicate = players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  const submitName = () => {
    if (!name.trim() || duplicate) return;
    addPlayer(name);
    setName('');
  };

  const n = players.length;
  const roles = effectiveRoles(settings, Math.max(n, MIN_PLAYERS));
  const count = Math.max(n, MIN_PLAYERS);
  const maxInf = maxInfiltrators(count);
  const villagers = Math.max(n - roles.undercover - roles.imposter, 0);
  const setRoles = (patch: Partial<typeof roles>) =>
    updateSettings({ autoRoles: false, roles: { ...roles, ...patch } });

  const problem =
    n < MIN_PLAYERS
      ? `Add ${MIN_PLAYERS - n} more player${MIN_PLAYERS - n === 1 ? '' : 's'}`
      : settings.difficulties.length === 0
        ? 'Pick at least one difficulty'
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
      title="Who's playing?"
      footer={
        <>
          {problem ? <Text style={styles.problem}>{problem}</Text> : null}
          <Button label="Deal the words!" onPress={start} disabled={!!problem} />
        </>
      }
    >
      <Card badge={`Players · ${n}`} badgeColor={colors.pink} tilt={-0.6}>
        <Body style={styles.hint}>
          Add everyone in the order you&apos;re sitting. Clues go round clockwise.
        </Body>
        <View style={styles.players}>
          {players.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.player,
                {
                  backgroundColor: colors.raised,
                  transform: [{ rotate: `${i % 2 ? 2 : -2}deg` }],
                },
              ]}
            >
              <Text style={[styles.playerName, { color: colors.text }]}>{p.name}</Text>
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
            placeholder="Add a name"
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
        {duplicate && name.trim() ? <Text style={styles.problem}>That name is taken</Text> : null}
      </Card>

      <Card badge="Roles" badgeColor={colors.raised} tilt={0.5}>
        <View style={styles.split}>
          {(['villager', 'undercover', 'imposter'] as const).map((r) => (
            <View key={r} style={[styles.splitItem, { backgroundColor: ROLE_META[r].color }]}>
              <Text style={styles.splitEmoji}>{ROLE_META[r].emoji}</Text>
              <Text style={styles.splitCount}>{r === 'villager' ? villagers : roles[r]}</Text>
              <Text style={styles.splitLabel}>{ROLE_META[r].label}</Text>
            </View>
          ))}
        </View>
        <Stepper
          label="🎭 Imposter"
          hint="No word, and knows it. Always at least one"
          color={colors.pink}
          value={roles.imposter}
          min={1}
          max={maxInf}
          onChange={(v) =>
            setRoles({ imposter: v, undercover: Math.min(roles.undercover, maxUndercover(count, v)) })
          }
        />
        <Stepper
          label="🕶️ Undercover"
          hint={
            count < MIN_PLAYERS_FOR_UNDERCOVER
              ? `Optional · unlocks at ${MIN_PLAYERS_FOR_UNDERCOVER} players`
              : "Optional · a similar word, and doesn't know it"
          }
          color={colors.amber}
          value={roles.undercover}
          min={0}
          max={maxUndercover(count, roles.imposter)}
          onChange={(v) => setRoles({ undercover: v })}
        />
        <View style={styles.chips}>
          <Chip
            label={settings.autoRoles ? '✓ Best mix for your group' : 'Use the best mix'}
            selected={settings.autoRoles}
            onPress={() => updateSettings({ autoRoles: true })}
          />
        </View>
      </Card>

      <Card badge="Topics" badgeColor={colors.raised} tilt={-0.4}>
        <View style={styles.chips}>
          <Chip
            label="🎲 All"
            selected={settings.categoryIds.length === 0}
            onPress={() => updateSettings({ categoryIds: [] })}
          />
          {CATEGORIES.map((c, i) => (
            <Chip
              key={c.id}
              label={`${c.emoji} ${c.name}`}
              color={colors.pink}
              selected={settings.categoryIds.includes(c.id)}
              onPress={() => updateSettings({ categoryIds: toggle(settings.categoryIds, c.id) })}
            />
          ))}
        </View>
        <Label>How tricky?</Label>
        <View style={styles.chips}>
          {DIFFICULTIES.map((d) => (
            <Chip
              key={d.id}
              label={d.label}
              color={colors.pink}
              selected={settings.difficulties.includes(d.id)}
              onPress={() => updateSettings({ difficulties: toggle(settings.difficulties, d.id) })}
            />
          ))}
          <Chip
            label="🧒 Kids"
            selected={settings.difficulties.length === 1 && settings.difficulties[0] === 'easy'}
            onPress={() => updateSettings({ difficulties: ['easy'] })}
          />
        </View>
      </Card>

      <Card badge="House rules" badgeColor={colors.raised} tilt={0.4}>
        <ToggleRow
          label="Imposter sees the topic"
          hint="A little help for the one with no word"
          value={settings.imposterSeesCategory}
          onChange={(v) => updateSettings({ imposterSeesCategory: v })}
        />
        <ToggleRow
          label="Imposter never goes first"
          hint="Nobody should have to fake the very first clue"
          value={settings.imposterNeverFirst}
          onChange={(v) => updateSettings({ imposterNeverFirst: v })}
        />
        <ToggleRow
          label="Keep score"
          hint="Villager 2 · Undercover 5 · Imposter 6"
          value={settings.scoring}
          onChange={(v) => updateSettings({ scoring: v })}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textSoft, fontSize: size.small + 1, lineHeight: 20 },
  problem: { color: colors.pink, fontFamily: fonts.bodyBold, fontSize: size.small + 1, textAlign: 'center' },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: colors.outline,
    borderRadius: radius.pill,
    paddingLeft: space.md,
    minHeight: 42,
  },
  playerName: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: size.body },
  remove: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 22, lineHeight: 24 },
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
  split: { flexDirection: 'row', gap: space.sm },
  splitItem: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingVertical: space.sm,
  },
  splitEmoji: { fontSize: 20 },
  splitCount: {
    fontFamily: fonts.display,
    fontSize: size.title + 2,
    lineHeight: size.title + 10,
    color: colors.text,
  },
  splitLabel: { fontFamily: fonts.bodyBold, fontSize: size.small - 1, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
