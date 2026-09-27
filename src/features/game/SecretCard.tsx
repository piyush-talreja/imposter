import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Label, NATIVE_DRIVER, RoleMark } from '@/components/ui';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { tap, thud } from '@/lib/haptics';
import { play } from '@/lib/sound';
import { OUTLINE, colors, fonts, radius, size, space } from '@/theme/tokens';

import { type Card as SecretCardData } from './engine';

const HEIGHT = 300;
const DOTS = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 53) % 100,
  y: (i * 31 + 11) % 100,
  r: 8 + ((i * 7) % 12),
}));

/**
 * The secret sits under a sticker. Holding the card lifts it slightly, peels
 * the sticker back from its corner and brings the word up with a soft sound;
 * letting go smooths the sticker back down, so a glance never catches it.
 *
 * Every card looks the same from across the table: the imposter's card uses
 * the same colours as a word card, so its colour can't give it away.
 */
export function SecretCard({ card, onSeen }: { card: SecretCardData; onSeen: () => void }) {
  const [peel] = useState(() => new Animated.Value(0));
  const [nudge] = useState(() => new Animated.Value(0));
  const [holding, setHolding] = useState(false);
  const wordWidth = useColumnWidth(48 + 12 + 48);
  const wordSize = (text: string) => {
    const fontSize = fitFontSize(text, size.giant, wordWidth, { wrap: true });
    return { fontSize, lineHeight: Math.round(fontSize * 1.1) };
  };

  // Idle nudge on the peel corner, inviting a press.
  useEffect(() => {
    const ease = { easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER, duration: 450 };
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, { toValue: 1, ...ease }),
        Animated.timing(nudge, { toValue: 0, ...ease }),
        Animated.delay(900),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [nudge]);

  const move = (to: number) =>
    Animated.spring(peel, {
      toValue: to,
      useNativeDriver: NATIVE_DRIVER,
      // Quick, no-bounce reveal; a slightly softer close.
      friction: to ? 12 : 10,
      tension: to ? 140 : 90,
    }).start();

  const press = () => {
    thud();
    play('reveal');
    setHolding(true);
    onSeen();
    move(1);
  };
  const release = () => {
    tap();
    setHolding(false);
    move(0);
  };

  // No scale or rotation anywhere near the word: phones rasterise text while it's
  // being scaled or rotated, which makes it look blurry. Fades and slides only.
  const lift = {
    transform: [{ translateY: peel.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  };
  const reveal = {
    opacity: peel.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.15, 1] }),
    transform: [{ translateY: peel.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
  // The cover peels a little and fades away, rather than swinging fully off.
  const cover = {
    opacity: peel.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.15, 0] }),
    transformOrigin: 'top left' as const,
    transform: [
      { rotate: peel.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-28deg'] }) },
      { translateY: peel.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
    ],
  };

  return (
    <Animated.View style={lift}>
      <Card style={{ padding: 0 }}>
        <Pressable
          onPressIn={press}
          onPressOut={release}
          // A very quick tap can end before onPressIn fires; still count it as seen.
          onPress={onSeen}
          // Web: a long press must not open the browser's context menu.
          onLongPress={() => {}}
          accessibilityRole="button"
          accessibilityLabel={holding ? secretLabel(card) : 'Press and hold to see your word'}
          accessibilityHint="Only you should be looking at the screen"
          style={styles.area}
        >
          <Animated.View style={[styles.secret, reveal]}>
            {card.kind === 'word' ? (
              <>
                <Label>Your word</Label>
                <Text style={[styles.word, wordSize(card.word)]} numberOfLines={3} selectable={false}>
                  {card.word}
                </Text>
              </>
            ) : (
              <>
                <Label>You are the</Label>
                <Text style={[styles.word, wordSize('Imposter')]} selectable={false}>
                  Imposter
                </Text>
                <View style={styles.imposterNote}>
                  <RoleMark role="imposter" size={18} />
                  <Text style={styles.note}>
                    {card.category ? `No word · Topic: ${card.category}` : 'No word. Blend in.'}
                  </Text>
                </View>
              </>
            )}
          </Animated.View>

          {/* The sticker cover, hinged at its top-left corner */}
          <Animated.View pointerEvents="none" style={[styles.cover, cover]}>
            {DOTS.map((d, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { left: `${d.x}%`, top: `${d.y}%`, width: d.r, height: d.r, borderRadius: d.r },
                ]}
              />
            ))}
            <View style={styles.coverLabel}>
              <View style={styles.thumb} />
              <Text style={styles.coverText}>Hold to see</Text>
            </View>
            <Animated.View
              style={[
                styles.corner,
                {
                  transform: [
                    { translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
                    { translateY: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
                    { rotate: '45deg' },
                  ],
                },
              ]}
            />
          </Animated.View>
        </Pressable>
      </Card>
    </Animated.View>
  );
}

const secretLabel = (card: SecretCardData) =>
  card.kind === 'word'
    ? `Your word is ${card.word}`
    : `You are the imposter${card.category ? `. Topic ${card.category}` : ''}`;

const styles = StyleSheet.create({
  area: { height: HEIGHT, overflow: 'hidden', borderRadius: radius.lg - OUTLINE },
  secret: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.sm },
  word: { fontFamily: fonts.display, color: colors.text, textAlign: 'center' },
  imposterNote: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  note: { color: colors.textSoft, fontFamily: fonts.body, fontSize: size.body - 1 },
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dot: { position: 'absolute', backgroundColor: colors.outline, opacity: 0.2 },
  coverLabel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    transform: [{ rotate: '-4deg' }],
  },
  // Target ring where the thumb goes.
  thumb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: colors.pink,
    marginBottom: space.xs,
  },
  coverText: { fontFamily: fonts.display, fontSize: size.title, color: colors.text },
  // Curled-up corner hinting that the sticker peels.
  corner: {
    position: 'absolute',
    right: -22,
    bottom: -22,
    width: 56,
    height: 56,
    backgroundColor: colors.surface,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
  },
});
