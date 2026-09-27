import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Label, Paper, Screen, Stepper, Tag, ToggleRow, Type } from '@/components/ui';
import { MIN_PLAYERS, effectiveRoles, maxInfiltrators, wordPool } from '@/features/game/engine';
import { useGame } from '@/features/game/store';
import { CATEGORIES, WORDS, type Difficulty } from '@/features/words/words';
import { ROLE_META, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

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
  const maxInf = maxInfiltrators(Math.max(n, MIN_PLAYERS));
  const villagers = n - roles.undercover - roles.imposter;
  const setRoles = (patch: Partial<typeof roles>) =>
    updateSettings({ autoRoles: false, roles: { ...roles, ...patch } });

  const problem =
    n < MIN_PLAYERS
      ? `Add ${MIN_PLAYERS - n} more suspect${MIN_PLAYERS - n === 1 ? '' : 's'}`
      : settings.difficulties.length === 0
        ? 'Pick at least one difficulty'
        : wordPool(WORDS, settings).length === 0
          ? 'No words match. Widen the case files'
          : null;

  const start = () => {
    resetScores();
    startGame();
    router.push('/deal');
  };

  return (
    <Screen
      kicker="NEW CASE"
      title="Brief the table"
      footer={
        <>
          {problem ? <Text style={styles.problem}>{problem}</Text> : null}
          <Button label="Deal the cards" onPress={start} disabled={!!problem} />
        </>
      }
    >
      <Paper tab={`Suspects · ${n}`} tilt={-0.4}>
        <Type style={styles.hint}>Add everyone in seating order. Clues go clockwise.</Type>
        {players.map((p, i) => (
          <View key={p.id} style={styles.player}>
            <Text style={styles.playerIndex}>{String(i + 1).padStart(2, '0')}</Text>
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
            placeholder="Suspect's name"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            submitBehavior="submit"
            maxLength={16}
            autoCapitalize="words"
            accessibilityLabel="New player name"
            style={styles.input}
          />
          <Button
            label="Add"
            variant="stamp"
            ink={colors.ink}
            onPress={submitName}
            disabled={!name.trim() || duplicate}
            style={styles.addButton}
          />
        </View>
        {duplicate && name.trim() ? <Text style={styles.problem}>That name is taken</Text> : null}
      </Paper>

      <Paper tab="Roles" tilt={0.5}>
        <View style={styles.split}>
          {(['villager', 'undercover', 'imposter'] as const).map((r) => (
            <View key={r} style={styles.splitItem}>
              <Text style={[styles.splitCount, { color: ROLE_META[r].ink }]}>
                {r === 'villager' ? Math.max(villagers, 0) : roles[r]}
              </Text>
              <Text style={[styles.splitLabel, { color: ROLE_META[r].ink }]}>{ROLE_META[r].label}</Text>
            </View>
          ))}
        </View>
        <Stepper
          label="Undercover"
          hint="Gets a similar word, doesn't know it"
          ink={colors.undercover}
          value={roles.undercover}
          min={roles.imposter === 0 ? 1 : 0}
          max={maxInf - roles.imposter}
          onChange={(v) => setRoles({ undercover: v })}
        />
        <Stepper
          label="Imposter"
          hint="Gets no word, knows it"
          ink={colors.imposter}
          value={roles.imposter}
          min={roles.undercover === 0 ? 1 : 0}
          max={maxInf - roles.undercover}
          onChange={(v) => setRoles({ imposter: v })}
        />
        <Tag
          label={settings.autoRoles ? '✓ Suggested split' : 'Use suggested split'}
          selected={settings.autoRoles}
          onPress={() => updateSettings({ autoRoles: true })}
        />
      </Paper>

      <Paper tab="Case files" tilt={-0.3}>
        <View style={styles.tags}>
          <Tag
            label="All"
            selected={settings.categoryIds.length === 0}
            onPress={() => updateSettings({ categoryIds: [] })}
          />
          {CATEGORIES.map((c) => (
            <Tag
              key={c.id}
              label={`${c.emoji} ${c.name}`}
              selected={settings.categoryIds.includes(c.id)}
              onPress={() => updateSettings({ categoryIds: toggle(settings.categoryIds, c.id) })}
            />
          ))}
        </View>
        <Label>Difficulty</Label>
        <View style={styles.tags}>
          {DIFFICULTIES.map((d) => (
            <Tag
              key={d.id}
              label={d.label}
              selected={settings.difficulties.includes(d.id)}
              onPress={() => updateSettings({ difficulties: toggle(settings.difficulties, d.id) })}
            />
          ))}
          <Tag
            label="🧒 Kids"
            selected={settings.difficulties.length === 1 && settings.difficulties[0] === 'easy'}
            onPress={() => updateSettings({ difficulties: ['easy'] })}
          />
        </View>
      </Paper>

      <Paper tab="House rules" tilt={0.4}>
        <ToggleRow
          label="Imposter sees category"
          hint="A lifeline for the one with no word"
          value={settings.imposterSeesCategory}
          onChange={(v) => updateSettings({ imposterSeesCategory: v })}
        />
        <ToggleRow
          label="Imposter never goes first"
          hint="Nobody should bluff blind on clue one"
          value={settings.imposterNeverFirst}
          onChange={(v) => updateSettings({ imposterNeverFirst: v })}
        />
        <ToggleRow
          label="Keep score"
          hint="Villager 2 · Undercover 5 · Imposter 6"
          value={settings.scoring}
          onChange={(v) => updateSettings({ scoring: v })}
        />
      </Paper>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontSize: size.small },
  problem: { color: colors.brass, fontFamily: fonts.type, fontSize: size.small, textAlign: 'center' },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: TOUCH,
    borderBottomWidth: 1,
    borderBottomColor: colors.paperEdge,
    borderStyle: 'dashed',
  },
  playerIndex: { color: colors.muted, fontFamily: fonts.type, width: 24 },
  playerName: { color: colors.ink, fontFamily: fonts.type, fontSize: size.lead, flex: 1 },
  remove: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.muted, fontSize: size.body },
  addRow: { flexDirection: 'row', gap: space.sm },
  input: {
    flex: 1,
    minWidth: 0, // web TextInput has an intrinsic width that otherwise pushes Add out
    minHeight: TOUCH + 8,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.ink,
    color: colors.ink,
    fontFamily: fonts.type,
    fontSize: size.body + 1,
    paddingHorizontal: space.md,
  },
  addButton: { paddingHorizontal: space.lg, flexShrink: 0 },
  split: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.paperEdge,
  },
  splitItem: { alignItems: 'center' },
  splitCount: { fontFamily: fonts.display, fontSize: size.hero, lineHeight: size.hero + 6 },
  splitLabel: { fontFamily: fonts.stencil, fontSize: size.small, letterSpacing: 1.5 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
