import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, Label, RoleMark, Stepper, ToggleRow } from '@/components/ui';
import {
  MIN_PLAYERS,
  MIN_PLAYERS_FOR_UNDERCOVER,
  effectiveRoles,
  maxImposters,
  maxInfiltrators,
  maxUndercover,
  type Settings,
} from '@/features/game/engine';
import { CATEGORIES, type Difficulty } from '@/features/words/words';
import { ROLE_META, colors, fonts, radius, size, space } from '@/theme/tokens';

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const toggle = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

/**
 * Roles, topics and rules cards, shared by pass-and-play setup and online room
 * settings. `playerCount` drives the role caps (the server re-checks at start).
 */
export function SettingsCards({
  settings,
  onChange,
  playerCount,
  extraRules,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  playerCount: number;
  /** More rows for the Rules card (e.g. sound, clue mode). */
  extraRules?: ReactNode;
}) {
  const count = Math.max(playerCount, MIN_PLAYERS);
  const roles = effectiveRoles(settings, count);
  const villagers = Math.max(playerCount - roles.undercover - roles.imposter, 0);
  const maxImp = Math.min(maxImposters(count), maxInfiltrators(count));
  const maxUnder = maxUndercover(count, roles.imposter);
  const setRoles = (next: typeof roles) => onChange({ autoRoles: false, roles: next });

  return (
    <>
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
          hint={maxImp > 1 ? `Up to ${maxImp}` : `More from ${count < 6 ? 6 : 10} players`}
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
            onPress={() => onChange({ autoRoles: true })}
          />
        </View>
      </Card>

      <Card badge="Topics" tilt={-0.4}>
        <View style={styles.chips}>
          <Chip
            label="All"
            selected={settings.categoryIds.length === 0}
            onPress={() => onChange({ categoryIds: [] })}
          />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={settings.categoryIds.includes(c.id)}
              onPress={() => onChange({ categoryIds: toggle(settings.categoryIds, c.id) })}
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
              onPress={() => onChange({ difficulties: toggle(settings.difficulties, d.id) })}
            />
          ))}
        </View>
      </Card>

      <Card badge="Rules" tilt={0.4}>
        <ToggleRow
          label="Imposter sees the topic"
          value={settings.imposterSeesCategory}
          onChange={(v) => onChange({ imposterSeesCategory: v })}
        />
        <ToggleRow
          label="Imposter never goes first"
          value={settings.imposterNeverFirst}
          onChange={(v) => onChange({ imposterNeverFirst: v })}
        />
        <ToggleRow label="Keep score" value={settings.scoring} onChange={(v) => onChange({ scoring: v })} />
        {extraRules}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
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
