import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Label, NATIVE_DRIVER, Paper, Type } from '@/components/ui';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { thud } from '@/lib/haptics';
import { colors, fonts, size, space } from '@/theme/tokens';

import { type Card } from './engine';

const CARD_HEIGHT = 300;

/**
 * The secret is printed on the dossier under a black redaction bar. Pressing and
 * holding lifts the bar; letting go drops it back, so a glance over the shoulder
 * never catches it.
 */
export function SecretCard({ name, card, onSeen }: { name: string; card: Card; onSeen: () => void }) {
  const [lift] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  const [holding, setHolding] = useState(false);
  const wordWidth = useColumnWidth(48 + 2 + 48);
  const wordSize = (text: string) => {
    const fontSize = fitFontSize(text, size.giant - 6, wordWidth, { wrap: true });
    return { fontSize, lineHeight: Math.round(fontSize * 1.18) };
  };

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const move = (to: number) =>
    Animated.spring(lift, {
      toValue: to,
      useNativeDriver: NATIVE_DRIVER,
      speed: 28,
      bounciness: to ? 2 : 6,
    }).start();

  const press = () => {
    thud();
    setHolding(true);
    onSeen();
    move(1);
  };
  const release = () => {
    setHolding(false);
    move(0);
  };

  return (
    <Paper tab={`Eyes only · ${name}`} tilt={-0.6} style={{ padding: 0 }}>
      <Pressable
        onPressIn={press}
        onPressOut={release}
        // A very quick tap can end before onPressIn fires; still count it as seen.
        onPress={onSeen}
        // Web: a long press must not open the browser's context menu.
        onLongPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel={holding ? secretLabel(card) : 'Press and hold to reveal your secret word'}
        accessibilityHint="Only you should be looking at the screen"
        style={styles.area}
      >
        {/* The secret, printed on the page */}
        <View style={styles.secret}>
          {card.kind === 'word' ? (
            <>
              <Label>Your secret word</Label>
              <Text style={[styles.word, wordSize(card.word)]} numberOfLines={3} selectable={false}>
                {card.word}
              </Text>
              <Type style={styles.note}>Memorise it. Never say it.</Type>
            </>
          ) : (
            <>
              <Label color={colors.imposter}>No word for you</Label>
              <Text
                style={[styles.word, wordSize('Imposter'), { color: colors.imposter }]}
                selectable={false}
              >
                Imposter
              </Text>
              {card.category ? (
                <Type style={styles.note}>
                  Category: <Text style={{ color: colors.ink }}>{card.category}</Text>
                </Type>
              ) : null}
              <Type style={styles.note}>Listen, bluff, and work out the word.</Type>
            </>
          )}
        </View>

        {/* The redaction bar that lifts while held */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.redaction,
            {
              transform: [
                { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -CARD_HEIGHT - 40] }) },
                { rotate: lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] }) },
              ],
            },
          ]}
        >
          <View style={styles.redactionLines}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.redactionLine, { width: `${88 - ((i * 17) % 40)}%` }]} />
            ))}
          </View>
          <View style={styles.thumbWrap}>
            <Animated.View
              style={[
                styles.thumbRing,
                {
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.9] }) }],
                },
              ]}
            />
            <View style={styles.thumb}>
              <Text style={styles.thumbGlyph}>☝︎</Text>
            </View>
          </View>
          <Text style={styles.holdText}>PRESS & HOLD</Text>
          <Text style={styles.holdSub}>to declassify</Text>
        </Animated.View>
      </Pressable>
    </Paper>
  );
}

const secretLabel = (card: Card) =>
  card.kind === 'word'
    ? `Your word is ${card.word}`
    : `You are the imposter${card.category ? `. Category ${card.category}` : ''}`;

const styles = StyleSheet.create({
  area: { height: CARD_HEIGHT, overflow: 'hidden' },
  secret: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.sm },
  word: {
    fontFamily: fonts.display,
    fontSize: size.giant - 6,
    lineHeight: size.giant + 4,
    color: colors.ink,
    textAlign: 'center',
  },
  note: { color: colors.muted, textAlign: 'center', fontSize: size.small + 1 },
  redaction: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.redaction,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  redactionLines: { position: 'absolute', top: 22, left: 22, right: 22, gap: 9, opacity: 0.25 },
  redactionLine: { height: 7, backgroundColor: '#3A322B', borderRadius: 2 },
  thumbWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  thumbRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.imposter,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbGlyph: { color: colors.cream, fontSize: 28 },
  holdText: { color: colors.cream, fontFamily: fonts.stencil, fontSize: size.lead + 3, letterSpacing: 4 },
  holdSub: { color: colors.mutedOnDark, fontFamily: fonts.type, fontSize: size.small, letterSpacing: 2 },
});
