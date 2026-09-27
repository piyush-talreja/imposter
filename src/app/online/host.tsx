import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Label, Screen } from '@/components/ui';
import { wordPool } from '@/features/game/engine';
import { SettingsCards } from '@/features/game/SettingsCards';
import { useGame } from '@/features/game/store';
import { friendlyError } from '@/features/online/errors';
import { createRoom, fetchRoom, updateSettings } from '@/features/online/rooms';
import { type ClueMode, type OnlineSettings } from '@/features/online/types';
import { WORDS } from '@/features/words/words';
import { colors, fonts, size, space } from '@/theme/tokens';

const CLUE_MODES: { id: ClueMode; label: string; hint: string }[] = [
  { id: 'typed', label: 'Typed', hint: 'Clues appear on everyone’s screen. Works apart.' },
  { id: 'spoken', label: 'Spoken', hint: 'Say clues out loud, together or on a call.' },
];
const CLUE_TIMERS = [null, 30, 60] as const;
const VOTE_TIMERS = [null, 60, 90] as const;
const timerLabel = (s: number | null) => (s ? `${s}s` : 'Off');

// Create a room, or (with ?roomId) edit its settings from the lobby.
export default function HostRoom() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const { onlineName, onlineSettings, setOnlineSettings } = useGame();
  const [settings, setSettings] = useState<OnlineSettings>(onlineSettings);
  const [playerCount, setPlayerCount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing: start from the room's current settings and real player count.
  useEffect(() => {
    if (!roomId) return;
    fetchRoom(roomId)
      .then(({ room, players }) => {
        if (room) setSettings({ ...onlineSettings, ...room.settings });
        setPlayerCount(players.length);
      })
      .catch((e) => setError(friendlyError(e)));
    // Load once per room.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const change = (patch: Partial<OnlineSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const problem =
    settings.difficulties.length === 0
      ? 'Pick a difficulty'
      : wordPool(WORDS, settings).length === 0
        ? 'No words match. Pick more topics'
        : null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      setOnlineSettings(settings);
      if (roomId) {
        await updateSettings(roomId, settings);
        router.back();
      } else {
        const room = await createRoom(onlineName, settings);
        router.replace({ pathname: '/online/room/[id]', params: { id: room.room_id } });
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      kicker={roomId ? 'ROOM SETTINGS' : 'HOST A ROOM'}
      title="Rules"
      footer={
        <>
          {problem || error ? <Text style={styles.problem}>{problem ?? error}</Text> : null}
          <Button
            label={busy ? 'Just a moment…' : roomId ? 'Save' : 'Create room'}
            onPress={submit}
            disabled={busy || !!problem}
          />
        </>
      }
    >
      <Card badge="Clues">
        <View style={styles.chips}>
          {CLUE_MODES.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              selected={settings.clueMode === m.id}
              onPress={() => change({ clueMode: m.id })}
            />
          ))}
        </View>
        <Label>{CLUE_MODES.find((m) => m.id === settings.clueMode)?.hint}</Label>
        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>Clue timer</Text>
          <View style={styles.chips}>
            {CLUE_TIMERS.map((t) => (
              <Chip
                key={String(t)}
                label={timerLabel(t)}
                selected={settings.clueSeconds === t}
                onPress={() => change({ clueSeconds: t })}
              />
            ))}
          </View>
        </View>
        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>Vote timer</Text>
          <View style={styles.chips}>
            {VOTE_TIMERS.map((t) => (
              <Chip
                key={String(t)}
                label={timerLabel(t)}
                selected={settings.voteSeconds === t}
                onPress={() => change({ voteSeconds: t })}
              />
            ))}
          </View>
        </View>
      </Card>

      <SettingsCards settings={settings} onChange={change} playerCount={playerCount} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  problem: { color: colors.pink, fontFamily: fonts.bodyBold, fontSize: size.small + 1, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  timerLabel: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.body },
});
