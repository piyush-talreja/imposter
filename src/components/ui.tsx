import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tap, thud } from '@/lib/haptics';
import { CONFETTI, OUTLINE, SHADOW, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

export const NATIVE_DRIVER = Platform.OS !== 'web';

// Deterministic "random" scatter so the background is stable between renders.
const SHAPES = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 73) % 100,
  y: (i * 41 + 7) % 100,
  s: 10 + ((i * 29) % 26),
  kind: i % 3, // 0 dot, 1 square, 2 pill
  rot: (i * 47) % 90,
  color: CONFETTI[i % CONFETTI.length],
}));

/** Cream table scattered with soft confetti shapes. */
export function Table({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={styles.fill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {SHAPES.map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: (p.x / 100) * width,
              top: (p.y / 100) * height,
              width: p.kind === 2 ? p.s * 2.2 : p.s,
              height: p.s,
              borderRadius: p.kind === 1 ? 3 : p.s,
              backgroundColor: p.color,
              opacity: 0.22,
              transform: [{ rotate: `${p.rot}deg` }],
            }}
          />
        ))}
      </View>
      {children}
    </View>
  );
}

export function Screen({
  kicker,
  title,
  onBack,
  backLabel = 'Back',
  scroll = true,
  footer,
  children,
}: {
  kicker?: string;
  title?: string;
  /** Defaults to router.back; pass null to hide the back button. */
  onBack?: (() => void) | null;
  backLabel?: string;
  scroll?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const back = onBack === undefined ? () => router.back() : onBack;
  const body = <View style={styles.body}>{children}</View>;
  return (
    <Table>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.column}>
          <View style={styles.header}>
            {back ? (
              <Pressable
                onPress={back}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={backLabel}
                style={styles.back}
              >
                <Text style={styles.backText}>‹ {backLabel}</Text>
              </Pressable>
            ) : (
              <View style={{ height: space.sm }} />
            )}
            {kicker ? (
              <View style={styles.kicker}>
                <Text style={styles.kickerText}>{kicker}</Text>
              </View>
            ) : null}
            {title ? (
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
            ) : null}
          </View>
          {scroll ? (
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              {body}
            </ScrollView>
          ) : (
            <View style={[styles.scroll, styles.fill]}>{body}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </SafeAreaView>
    </Table>
  );
}

/** A die-cut sticker panel: thick outline, hard shadow, optional label badge. */
export function Card({
  badge,
  color = colors.paper,
  badgeColor = colors.yellow,
  tilt = 0,
  children,
  style,
}: {
  badge?: string;
  color?: string;
  badgeColor?: string;
  tilt?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ transform: [{ rotate: `${tilt}deg` }] }, badge ? { paddingTop: 16 } : null]}>
      <View style={styles.shadowWrap}>
        <View style={styles.cardShadow} />
        <View style={[styles.card, { backgroundColor: color }, style]}>{children}</View>
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

type ButtonVariant = 'pop' | 'outline' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'pop',
  color = colors.pink,
  disabled,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const press = () => {
    tap();
    onPress();
  };
  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={press}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.ghost, disabled && { opacity: 0.4 }, style]}
      >
        <Text style={styles.ghostText}>{label}</Text>
      </Pressable>
    );
  }
  const lightFill = variant === 'outline' || color === colors.yellow;
  return (
    <Pressable
      onPress={press}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      style={[styles.buttonWrap, disabled && { opacity: 0.45 }, style]}
    >
      {({ pressed }) => (
        <>
          <View style={styles.buttonShadow} />
          <View
            style={[
              styles.button,
              { backgroundColor: variant === 'pop' ? color : colors.white },
              // Pressing pushes the sticker down onto its shadow.
              pressed && { transform: [{ translateX: SHADOW - 1 }, { translateY: SHADOW - 1 }] },
            ]}
          >
            <Text style={[styles.buttonText, !lightFill && { color: colors.white }]}>{label}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color = colors.blue,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={[styles.chip, selected && { backgroundColor: color, transform: [{ rotate: '-2deg' }] }]}
    >
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  color = colors.ink,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  color?: string;
  onChange: (v: number) => void;
}) {
  const step = (d: number) => {
    const next = Math.min(max, Math.max(min, value + d));
    if (next !== value) {
      tap();
      onChange(next);
    }
  };
  const btn = (d: number, glyph: string, off: boolean) => (
    <Pressable
      onPress={() => step(d)}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={`${d < 0 ? 'Fewer' : 'More'} ${label}`}
      style={[styles.stepButton, { backgroundColor: off ? colors.white : color }, off && { opacity: 0.35 }]}
    >
      <Text style={[styles.stepGlyph, !off && { color: colors.white }]}>{glyph}</Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      <View style={styles.fill}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.stepper}>
        {btn(-1, '–', value <= min)}
        <Text style={styles.stepValue} accessibilityLabel={`${label}: ${value}`}>
          {value}
        </Text>
        {btn(1, '+', value >= max)}
      </View>
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.fill, { paddingRight: space.md }]}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          tap();
          onChange(v);
        }}
        accessibilityLabel={label}
        trackColor={{ true: colors.mint, false: '#E4D9C4' }}
        thumbColor={colors.white}
        {...(Platform.OS === 'web' ? { activeThumbColor: colors.white } : {})}
      />
    </View>
  );
}

export function Label({ children, color = colors.inkSoft }: { children: ReactNode; color?: string }) {
  return <Text style={[styles.label, { color }]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.bodyText, style]}>{children}</Text>;
}

/**
 * A sticker that gets slapped down: pops in from big with a springy overshoot
 * and lands at a jaunty angle.
 */
export function Sticker({
  text,
  emoji,
  color,
  angle = -6,
  delay = 150,
  fontSize = 34,
  style,
}: {
  text: string;
  emoji?: string;
  color: string;
  angle?: number;
  delay?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const id = setTimeout(thud, delay + 120);
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(t, { toValue: 1, friction: 4, tension: 120, useNativeDriver: NATIVE_DRIVER }),
    ]);
    anim.start();
    return () => {
      clearTimeout(id);
      anim.stop();
    };
  }, [t, delay]);
  return (
    <Animated.View
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[
        styles.sticker,
        { backgroundColor: color },
        {
          opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
          transform: [
            {
              rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`${angle - 25}deg`, `${angle}deg`] }),
            },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) },
          ],
        },
        style,
      ]}
    >
      {emoji ? <Text style={{ fontSize: fontSize * 0.9 }}>{emoji}</Text> : null}
      <Text
        style={[
          styles.stickerText,
          { fontSize, lineHeight: fontSize * 1.25 },
          color === colors.yellow && { color: colors.ink },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {text}
      </Text>
    </Animated.View>
  );
}

/** A burst of confetti flying out from the centre of its parent. Decorative only. */
export function Confetti({ delay = 250, count = 22 }: { delay?: number; count?: number }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 1100,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: NATIVE_DRIVER,
    });
    anim.start();
    return () => anim.stop();
  }, [t, delay]);
  return (
    <View
      pointerEvents="none"
      style={styles.confetti}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.3;
        const dist = 110 + ((i * 37) % 90);
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: i % 2 ? 10 : 14,
              height: i % 2 ? 10 : 6,
              borderRadius: i % 3 === 0 ? 5 : 2,
              backgroundColor: CONFETTI[i % CONFETTI.length],
              opacity: t.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                {
                  translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] }),
                },
                // Arc outwards, then drift down a little.
                {
                  translateY: t.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0, Math.sin(angle) * dist - 30, Math.sin(angle) * dist + 40],
                  }),
                },
                {
                  rotate: t.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 540}deg`],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

/** Bouncy entrance for staggered reveals. */
export function Pop({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(t, {
      toValue: 1,
      delay,
      friction: 6,
      tension: 90,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [t, delay]);
  return (
    <Animated.View
      style={[
        {
          opacity: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.xs },
  back: { minHeight: TOUCH - 8, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { color: colors.inkSoft, fontFamily: fonts.bodyBold, fontSize: size.body },
  kicker: {
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    transform: [{ rotate: '-2deg' }],
  },
  kickerText: {
    color: colors.yellow,
    fontFamily: fonts.bodyBold,
    fontSize: size.small - 1,
    letterSpacing: 1,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: size.title + 4,
    lineHeight: size.title + 14,
  },
  scroll: { padding: space.lg, paddingBottom: space.xl },
  body: { gap: space.lg, flexGrow: 1 },
  footer: { paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm, gap: space.sm },

  shadowWrap: { marginRight: SHADOW, marginBottom: SHADOW },
  cardShadow: {
    ...StyleSheet.absoluteFill,
    top: SHADOW,
    left: SHADOW,
    right: -SHADOW,
    bottom: -SHADOW,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: OUTLINE,
    borderColor: colors.ink,
    padding: space.lg,
    gap: space.md,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: space.lg,
    borderWidth: OUTLINE,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 3,
    transform: [{ rotate: '-3deg' }],
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: size.small, color: colors.ink },

  buttonWrap: { marginRight: SHADOW, marginBottom: SHADOW },
  buttonShadow: {
    ...StyleSheet.absoluteFill,
    top: SHADOW,
    left: SHADOW,
    right: -SHADOW,
    bottom: -SHADOW,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
  },
  button: {
    minHeight: TOUCH + 10,
    borderRadius: radius.md,
    borderWidth: OUTLINE,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonText: { color: colors.ink, fontFamily: fonts.display, fontSize: size.lead + 2, textAlign: 'center' },
  ghost: { minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
  ghostText: {
    color: colors.inkSoft,
    fontFamily: fonts.bodyBold,
    fontSize: size.body,
    textDecorationLine: 'underline',
  },

  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  chipText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: size.small + 1 },

  row: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH, gap: space.sm },
  rowLabel: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: size.body + 1 },
  hint: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: size.small - 1, marginTop: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepButton: {
    width: TOUCH - 4,
    height: TOUCH - 4,
    borderRadius: (TOUCH - 4) / 2,
    borderWidth: 2.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { color: colors.ink, fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  stepValue: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: size.title,
    minWidth: 32,
    textAlign: 'center',
  },

  label: { fontFamily: fonts.bodyBold, fontSize: size.small, letterSpacing: 0.5 },
  bodyText: { color: colors.ink, fontFamily: fonts.body, fontSize: size.body, lineHeight: 24 },

  sticker: {
    alignSelf: 'center',
    maxWidth: '94%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: OUTLINE + 1,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    shadowColor: colors.ink,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 6,
  },
  stickerText: { color: colors.white, fontFamily: fonts.display },
  confetti: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
