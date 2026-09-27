import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Chip, Label, RoleMark, Screen, Stepper, ToggleRow } from '@/components/ui';
import {
  MIN_PLAYERS,
  MIN_PLAYERS_FOR_UNDERCOVER,
  effectiveRoles,
  maxImposters,
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
  const count = Math.max(n, MIN_PLAYERS);
  const roles = effectiveRoles(settings, count);
  const villagers = Math.max(n - roles.undercover - roles.imposter, 0);
  const maxImp = Math.min(maxImposters(count), maxInfiltrators(count));
  const maxUnder = maxUndercover(count, roles.imposter);
  const setRoles = (next: typeof roles) => updateSettings({ autoRoles: false, roles: next });

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

      <Card badge="Roles" tilt={0.5}>
        <View style={styles.split}>
          {(['villager', 'undercover', 'imposter'] as const).map((r) => (
            <View key={r} style={styles.splitItem}>
              <RoleMark role={r} size={22} />
              <Text style={styles.splitCount}>{r === 'villager' ? villagers : roles[r]}</Text>
              <Text style={styles.splitLabel}>{ROLE_META[r].label}</Text>
            </View>
          ))}
        </View>
        <Stepper
          label="Imposters"
          hint={maxImp > 1 ? `Up to ${maxImp}` : `More from ${n < 6 ? 6 : 10} players`}
          color={colors.pink}
          value={roles.imposter}
          min={1}
          max={maxImp}
          onChange={(v) =>
            setRoles({ imposter: v, undercover: Math.min(roles.undercover, maxUndercover(count, v)) })
          }
        />
        <Stepper
          label="Undercovers"
          hint={
            count < MIN_PLAYERS_FOR_UNDERCOVER
              ? `From ${MIN_PLAYERS_FOR_UNDERCOVER} players`
              : `Optional · up to ${maxUnder}`
          }
          color={colors.amber}
          value={roles.undercover}
          min={0}
          max={maxUnder}
          onChange={(v) => setRoles({ ...roles, undercover: v })}
        />
        <View style={styles.chips}>
          <Chip
            label={settings.autoRoles ? 'Recommended' : 'Use recommended'}
            selected={settings.autoRoles}
            onPress={() => updateSettings({ autoRoles: true })}
          />
        </View>
      </Card>

      <Card badge="Topics" tilt={-0.4}>
        <View style={styles.chips}>
          <Chip
            label="All"
            selected={settings.categoryIds.length === 0}
            onPress={() => updateSettings({ categoryIds: [] })}
          />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
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
        </View>
      </Card>

      <Card badge="Rules" tilt={0.4}>
        <ToggleRow
          label="Imposter sees the topic"
          value={settings.imposterSeesCategory}
          onChange={(v) => updateSettings({ imposterSeesCategory: v })}
        />
        <ToggleRow
          label="Imposter never goes first"
          value={settings.imposterNeverFirst}
          onChange={(v) => updateSettings({ imposterNeverFirst: v })}
        />
        <ToggleRow
          label="Keep score"
          value={settings.scoring}
          onChange={(v) => updateSettings({ scoring: v })}
        />
      </Card>
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
  split: { flexDirection: 'row', gap: space.sm },
  splitItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderWidth: 2.5,
    borderColor: colors.outline,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    paddingVertical: space.sm,
  },
  splitCount: {
    fontFamily: fonts.display,
    fontSize: size.title,
    lineHeight: size.title + 6,
    color: colors.text,
  },
  splitLabel: { fontFamily: fonts.bodyBold, fontSize: size.small - 1, color: colors.textSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
