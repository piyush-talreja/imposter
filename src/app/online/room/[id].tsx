import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Character } from '@/components/Character';
import { Body, Button, Card, ConfirmDialog, Label, Pop, Screen } from '@/components/ui';
import { MIN_PLAYERS } from '@/features/game/engine';
import { useGame } from '@/features/game/store';
import { friendlyError } from '@/features/online/errors';
import { kickPlayer, leaveRoom, startGame } from '@/features/online/rooms';
import { type RoomPlayer } from '@/features/online/types';
import { useRoom } from '@/features/online/useRoom';
import { OUTLINE, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

const LEAVE = {
  title: 'Leave the room?',
  message: 'You can rejoin with the same code while the room is open.',
  confirmLabel: 'Leave',
};

export default function Lobby() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { onlineName } = useGame();
  const { me, room, players, online, connection, kicked, gone } = useRoom(id, onlineName);
  const [showQr, setShowQr] = useState(false);
  const [removing, setRemoving] = useState<RoomPlayer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHost = !!room && room.host_id === me;
  const onlineCount = players.filter((p) => online.has(p.user_id)).length;
  const link = room ? Linking.createURL(`/join/${room.code}`) : '';

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const leave = () =>
    act(async () => {
      if (id) await leaveRoom(id).catch(() => {});
      router.dismissTo('/online');
    });

  const share = () =>
    room &&
    Share.share({ message: `Join my Imposter game: ${room.code}\n${link}`, url: link }).catch(() => {});

  // Removed, or the room has closed: explain, then back to the online hub.
  if (kicked || gone) {
    return (
      <Screen
        kicker="ROOM"
        onBack={null}
        footer={<Button label="OK" onPress={() => router.dismissTo('/online')} />}
      >
        <Card style={styles.center}>
          <Character color="#7A6EB8" size={72} />
          <Text style={styles.big}>{kicked ? 'You were removed' : 'This room has closed'}</Text>
          <Body style={styles.muted}>
            {kicked ? 'The host removed you from this room.' : 'Ask the host for a new code.'}
          </Body>
        </Card>
      </Screen>
    );
  }

  // M2 stops at the start line; M3 deals the cards.
  if (room?.status === 'playing') {
    const waiting = players.find((p) => p.user_id === me)?.waiting;
    return (
      <Screen kicker={`ROOM ${room.code}`} backLabel="Leave" onBack={leave} confirmBack={LEAVE}>
        <Card style={styles.center}>
          <Character color={colors.pink} look="mask" size={80} />
          <Text style={styles.big}>{waiting ? 'Game in progress' : 'Game starting…'}</Text>
          <Body style={styles.muted}>
            {waiting
              ? 'You’ll be dealt into the next game.'
              : 'Online games arrive in the next update. Stay tuned!'}
          </Body>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      kicker={isHost ? 'YOUR ROOM' : 'LOBBY'}
      backLabel="Leave"
      onBack={leave}
      confirmBack={LEAVE}
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {isHost ? (
            <>
              <Button
                label={onlineCount >= MIN_PLAYERS ? 'Start' : `Waiting for ${MIN_PLAYERS - onlineCount} more`}
                onPress={() => id && act(() => startGame(id))}
                disabled={busy || onlineCount < MIN_PLAYERS}
              />
              <Button
                label="Room settings"
                variant="ghost"
                onPress={() => router.push({ pathname: '/online/host', params: { roomId: id } })}
              />
            </>
          ) : (
            <View style={styles.center}>
              <Label>Waiting for the host to start</Label>
            </View>
          )}
        </>
      }
    >
      {connection === 'reconnecting' ? (
        <View style={styles.banner} accessibilityLiveRegion="polite">
          <Text style={styles.bannerText}>Offline. Reconnecting…</Text>
        </View>
      ) : null}

      <Card style={styles.center}>
        <Label>Room code</Label>
        <Text
          style={styles.code}
          accessibilityLabel={`Room code ${room?.code.split('').join(' ') ?? ''}`}
          selectable
        >
          {room?.code ?? '····'}
        </Text>
        <View style={styles.shareRow}>
          <Button label="Share" onPress={share} disabled={!room} style={styles.fill} />
          <Button
            label={showQr ? 'Hide QR' : 'QR code'}
            variant="outline"
            onPress={() => setShowQr((v) => !v)}
            disabled={!room}
            style={styles.fill}
          />
        </View>
        {showQr && room ? (
          <Pop>
            <View style={styles.qr} accessibilityLabel="QR code to join this room">
              <QRCode value={link} size={180} backgroundColor={colors.white} color={colors.outline} />
            </View>
          </Pop>
        ) : null}
      </Card>

      <Card badge={`${players.length} player${players.length === 1 ? '' : 's'} · ${onlineCount} online`}>
        {players.map((p, i) => {
          const isOnline = online.has(p.user_id);
          return (
            <Pop key={p.user_id} delay={i * 40}>
              <View style={styles.player}>
                <Character color={isOnline ? '#7A6EB8' : colors.raised} initial={p.name} size={36} />
                <View style={styles.fill}>
                  <Text style={[styles.playerName, !isOnline && styles.offline]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.playerMeta}>{isOnline ? 'Online' : 'Offline'}</Text>
                </View>
                {p.user_id === room?.host_id ? <Text style={styles.badge}>Host</Text> : null}
                {p.user_id === me ? <Text style={[styles.badge, styles.you]}>You</Text> : null}
                {isHost && p.user_id !== me ? (
                  <Pressable
                    onPress={() => setRemoving(p)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${p.name}`}
                    style={styles.remove}
                  >
                    <Text style={styles.removeText}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pop>
          );
        })}
      </Card>

      <ConfirmDialog
        visible={!!removing}
        title={`Remove ${removing?.name ?? ''}?`}
        message="They won’t be able to rejoin this room."
        confirmLabel="Remove"
        onConfirm={() => {
          const target = removing;
          setRemoving(null);
          if (target && id) act(() => kickPlayer(id, target.user_id));
        }}
        onCancel={() => setRemoving(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', gap: space.sm },
  big: { color: colors.text, fontFamily: fonts.display, fontSize: size.title, textAlign: 'center' },
  muted: { color: colors.textSoft, textAlign: 'center' },
  error: { color: colors.pink, fontFamily: fonts.bodyBold, fontSize: size.small + 1, textAlign: 'center' },
  code: { color: colors.text, fontFamily: fonts.display, fontSize: 60, lineHeight: 68, letterSpacing: 10 },
  shareRow: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' },
  qr: {
    padding: space.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
  },
  player: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TOUCH },
  playerName: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.body + 1 },
  offline: { color: colors.textSoft },
  playerMeta: { color: colors.textSoft, fontFamily: fonts.body, fontSize: size.small - 1 },
  badge: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: size.small - 1,
    backgroundColor: colors.raised,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  you: { backgroundColor: colors.pink, color: colors.white },
  remove: { width: TOUCH - 8, height: TOUCH - 8, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.textSoft, fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 26 },
  banner: {
    backgroundColor: colors.raised,
    borderRadius: radius.md,
    padding: space.sm,
    alignItems: 'center',
  },
  bannerText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.small },
});
