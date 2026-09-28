import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Screen } from '@/components/ui';
import { useGame } from '@/features/game/store';
import { CODE_LENGTH, extractCode, isValidCode, normalizeCode } from '@/features/online/code';
import { friendlyError } from '@/features/online/errors';
import { joinRoom } from '@/features/online/rooms';
import { OUTLINE, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

// Join by code. Opening a shared link (/join/K7QX) lands here with the code filled in.
export default function JoinRoom() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { onlineName, setOnlineName } = useGame();
  const [code, setCode] = useState(normalizeCode(params.code ?? ''));
  const [name, setName] = useState(onlineName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinedFromLink = useRef(false);

  const join = async (c = code) => {
    if (!isValidCode(c) || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setOnlineName(name);
      const room = await joinRoom(c, name);
      router.replace({ pathname: '/online/room/[id]', params: { id: room.room_id } });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  // From a link, with a name already saved: join straight away.
  useEffect(() => {
    if (joinedFromLink.current || !params.code || !onlineName) return;
    joinedFromLink.current = true;
    join(normalizeCode(params.code));
    // Only on first arrival from a link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen
      kicker="JOIN A ROOM"
      title="Room code"
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={busy ? 'Joining…' : 'Join'}
            onPress={() => join()}
            disabled={busy || !isValidCode(code) || !name.trim()}
          />
        </>
      }
    >
      <Card style={styles.codeCard}>
        <TextInput
          value={code}
          onChangeText={(t) => {
            setError(null);
            setCode(normalizeCode(t));
          }}
          onSubmitEditing={() => join()}
          placeholder="K7QX"
          placeholderTextColor={colors.raised}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus={!params.code}
          maxLength={CODE_LENGTH + 2}
          returnKeyType="join"
          accessibilityLabel="Room code"
          style={styles.code}
        />
        <Body style={styles.hint}>4 letters and numbers, from the host’s screen</Body>
        <Button
          label="Paste"
          variant="ghost"
          onPress={async () => {
            const pasted = extractCode(await Clipboard.getStringAsync().catch(() => ''));
            if (pasted) {
              setError(null);
              setCode(pasted);
            }
          }}
        />
      </Card>

      {!onlineName ? (
        <Card badge="Your name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.textSoft}
            maxLength={16}
            autoCapitalize="words"
            accessibilityLabel="Your name"
            style={styles.input}
          />
        </Card>
      ) : (
        <View style={styles.as}>
          <Body style={styles.hint}>
            Joining as <Text style={styles.name}>{name}</Text>
          </Body>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: { alignItems: 'center' },
  code: {
    width: '100%',
    textAlign: 'center',
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 72,
    letterSpacing: 14,
    minHeight: 96,
  },
  hint: { color: colors.textSoft, textAlign: 'center', fontSize: size.small + 1 },
  error: { color: colors.pink, fontFamily: fonts.bodyBold, fontSize: size.small + 1, textAlign: 'center' },
  input: {
    minHeight: TOUCH + 10,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: size.lead,
    paddingHorizontal: space.md,
  },
  as: { alignItems: 'center' },
  name: { color: colors.text, fontFamily: fonts.bodyBold },
});
