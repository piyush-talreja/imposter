import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Label, NATIVE_DRIVER } from '@/components/ui';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { tap } from '@/lib/haptics';
import { OUTLINE, colors, fonts, radius, size, space } from '@/theme/tokens';

import { type Card as SecretCardData } from './engine';

const HEIGHT = 300;
const DOTS = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 53) % 100,
  y: (i * 31 + 11) % 100,
  r: 8 + ((i * 7) % 12),
}));

/**
 * The secret is printed on the card under a big sticker. Pressing and holding
 * peels the sticker back from its corner; letting go smooths it back down, so
 * a glance over the shoulder never catches it.
 */
export function SecretCard({
  name,
  card,
  onSeen,
}: {
  name: string;
  card: SecretCardData;
  onSeen: () => void;
}) {
  const [peel] = useState(() => new Animated.Value(0));
  const [wiggle] = useState(() => new Animated.Value(0));
  const [holding, setHolding] = useState(false);
  // Screen padding + card borders/shadow + inner padding.
  const wordWidth = useColumnWidth(48 + 12 + 48);
  const wordSize = (text: string) => {
    const fontSize = fitFontSize(text, size.giant - 4, wordWidth, { wrap: true });
    return { fontSize, lineHeight: Math.round(fontSize * 1.2) };
  };

  // A gentle nudge on the peel corner to invite a press.
  useEffect(() => {
    const ease = { easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER, duration: 500 };
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, ...ease }),
        Animated.timing(wiggle, { toValue: 0, ...ease }),
        Animated.delay(700),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [wiggle]);

  const move = (to: number) =>
    Animated.spring(peel, {
      toValue: to,
      useNativeDriver: NATIVE_DRIVER,
      friction: to ? 7 : 5,
      tension: 70,
    }).start();

  const press = () => {
    tap();
    setHolding(true);
    onSeen();
    move(1);
  };
  const release = () => {
    setHolding(false);
    move(0);
  };

  return (
    <Card badge={`Only for ${name}`} badgeColor={colors.yellow} tilt={-1} style={{ padding: 0 }}>
      <Pressable
        onPressIn={press}
        onPressOut={release}
        // A very quick tap can end before onPressIn fires; still count it as seen.
        onPress={onSeen}
        onLongPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel={
          holding ? secretLabel(card) : 'Press and hold to peel back the sticker and see your word'
        }
        accessibilityHint="Only you should be looking at the screen"
        style={styles.area}
      >
        <View style={styles.secret}>
          {card.kind === 'word' ? (
            <>
              <Label>your secret word</Label>
              <Text style={[styles.word, wordSize(card.word)]} numberOfLines={3} selectable={false}>
                {card.word}
              </Text>
              <Text style={styles.note}>Remember it. Don&apos;t say it!</Text>
            </>
          ) : (
            <>
              <Text style={styles.mask}>🎭</Text>
              <Text style={[styles.word, wordSize('Imposter!'), { color: colors.pink }]} selectable={false}>
                Imposter!
              </Text>
              {card.category ? (
                <Text style={styles.note}>
                  Psst, the category is <Text style={styles.noteStrong}>{card.category}</Text>
                </Text>
              ) : null}
              <Text style={styles.note}>You have no word. Listen closely and fake it.</Text>
            </>
          )}
        </View>

        {/* The sticker cover, hinged at its top-left corner */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cover,
            {
              transformOrigin: 'top left',
              transform: [
                { rotate: peel.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-78deg'] }) },
                { translateY: peel.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) },
              ],
            },
          ]}
        >
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
            <Text style={styles.coverEmoji}>👆</Text>
            <Text style={styles.coverText}>Hold to peel</Text>
            <Text style={styles.coverSub}>let go to hide</Text>
          </View>
          <Animated.View
            style={[
              styles.corner,
              {
                transform: [
                  { translateX: wiggle.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
                  { translateY: wiggle.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
                  { rotate: '45deg' },
                ],
              },
            ]}
          />
        </Animated.View>
      </Pressable>
    </Card>
  );
}

const secretLabel = (card: SecretCardData) =>
  card.kind === 'word'
    ? `Your word is ${card.word}`
    : `You are the imposter${card.category ? `. Category ${card.category}` : ''}`;

const styles = StyleSheet.create({
  area: { height: HEIGHT, overflow: 'hidden', borderRadius: radius.lg - OUTLINE },
  secret: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.sm },
  word: {
    fontFamily: fonts.display,
    fontSize: size.giant - 4,
    lineHeight: size.giant + 10,
    color: colors.ink,
    textAlign: 'center',
  },
  mask: { fontSize: 44 },
  note: { color: colors.inkSoft, fontFamily: fonts.body, textAlign: 'center', fontSize: size.body - 1 },
  noteStrong: { color: colors.ink, fontFamily: fonts.bodyBold },
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dot: { position: 'absolute', backgroundColor: colors.yellow, opacity: 0.55 },
  coverLabel: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: OUTLINE,
    borderColor: colors.ink,
    borderRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    transform: [{ rotate: '-4deg' }],
  },
  coverEmoji: { fontSize: 34 },
  coverText: { fontFamily: fonts.display, fontSize: size.title, color: colors.ink },
  coverSub: { fontFamily: fonts.bodyBold, fontSize: size.small, color: colors.inkSoft },
  // Curled-up corner hinting that the sticker peels.
  corner: {
    position: 'absolute',
    right: -22,
    bottom: -22,
    width: 56,
    height: 56,
    backgroundColor: colors.paper,
    borderWidth: OUTLINE,
    borderColor: colors.ink,
  },
});
