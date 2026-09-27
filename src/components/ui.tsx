import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Modal,
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

import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { tap, thud } from '@/lib/haptics';
import { play } from '@/lib/sound';
import { type Role } from '@/features/game/engine';
import {
  ACCENTS,
  OUTLINE,
  ROLE_META,
  SHADOW,
  TOUCH,
  colors,
  fonts,
  onColor,
  radius,
  size,
  space,
} from '@/theme/tokens';

export const NATIVE_DRIVER = Platform.OS !== 'web';

// A few faint sparkles in the role accents, placed deterministically.
const SPARKLES = Array.from({ length: 9 }, (_, i) => ({
  x: (i * 71 + 13) % 100,
  y: (i * 43 + 9) % 100,
  s: 4 + ((i * 5) % 5),
  color: ACCENTS[i % ACCENTS.length],
}));

/** A dim room: deep violet with two soft coloured spotlights and faint sparkles. */
export function Table({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const glow = Math.max(width, height) * 0.9;
  return (
    <View style={styles.fill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <View
          style={[
            styles.glow,
            { width: glow, height: glow, left: -glow * 0.55, top: -glow * 0.6, backgroundColor: colors.pink },
          ]}
        />
        <View
          style={[
            styles.glow,
            {
              width: glow,
              height: glow,
              right: -glow * 0.6,
              bottom: -glow * 0.65,
              backgroundColor: colors.cyan,
            },
          ]}
        />
        {SPARKLES.map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: (p.x / 100) * width,
              top: (p.y / 100) * height,
              width: p.s,
              height: p.s,
              borderRadius: p.s,
              backgroundColor: p.color,
              opacity: 0.35,
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
  confirmBack,
  footer,
  children,
}: {
  kicker?: string;
  title?: string;
  /** Defaults to router.back; pass null to hide the back button. */
  onBack?: (() => void) | null;
  backLabel?: string;
  scroll?: boolean;
  /** Ask before leaving (e.g. quitting mid-game). */
  confirmBack?: { title: string; message: string; confirmLabel: string };
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [asking, setAsking] = useState(false);
  const leave = onBack === undefined ? () => router.back() : onBack;
  const back = leave && confirmBack ? () => setAsking(true) : leave;
  const body = <View style={styles.body}>{children}</View>;
  return (
    <Table>
      {confirmBack && leave ? (
        <ConfirmDialog
          visible={asking}
          {...confirmBack}
          onConfirm={() => {
            setAsking(false);
            leave();
          }}
          onCancel={() => setAsking(false)}
        />
      ) : null}
      <SafeAreaView style={styles.fill} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.column} behavior="padding">
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Table>
  );
}

const isAccent = (c: string) => (ACCENTS as readonly string[]).includes(c);

/** A die-cut sticker panel: thick outline, hard shadow, optional label badge. */
export function Card({
  badge,
  color = colors.surface,
  badgeColor = colors.raised,
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
          <Text
            style={[styles.badgeText, { color: isAccent(badgeColor) ? onColor(badgeColor) : colors.text }]}
          >
            {badge}
          </Text>
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
              { backgroundColor: variant === 'pop' ? color : colors.raised },
              // Pressing pushes the sticker down onto its shadow.
              pressed && { transform: [{ translateX: SHADOW - 1 }, { translateY: SHADOW - 1 }] },
            ]}
          >
            <Text style={[styles.buttonText, { color: variant === 'pop' ? onColor(color) : colors.text }]}>
              {label}
            </Text>
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
  color = colors.pink,
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
      <Text style={[styles.chipText, selected && { color: onColor(color) }]}>{label}</Text>
    </Pressable>
  );
}

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  color = colors.pink,
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
      style={[styles.stepButton, { backgroundColor: off ? colors.raised : color }, off && { opacity: 0.35 }]}
    >
      <Text style={[styles.stepGlyph, !off && { color: onColor(color) }]}>{glyph}</Text>
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
        trackColor={{ true: colors.pink, false: colors.raised }}
        thumbColor={colors.white}
        {...(Platform.OS === 'web' ? { activeThumbColor: colors.white } : {})}
      />
    </View>
  );
}

export function Label({ children, color = colors.textSoft }: { children: ReactNode; color?: string }) {
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
  color,
  angle = -6,
  delay = 150,
  fontSize = 34,
  style,
}: {
  text: string;
  color: string;
  angle?: number;
  delay?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [t] = useState(() => new Animated.Value(0));
  // Sits inside a Card on the screen column: screen + card padding, borders, shadow, own padding.
  const avail = useColumnWidth(170);
  const fs = fitFontSize(text, fontSize, avail, { letterSpacing: 1 });
  useEffect(() => {
    const id = setTimeout(() => {
      thud();
      play('stamp');
    }, delay + 120);
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
      <Text
        style={[styles.stickerText, { fontSize: fs, lineHeight: fs * 1.25 }, { color: onColor(color) }]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * Role symbol: a full dot (has the word), a half dot (has a similar word) or an
 * empty ring (has no word). Shape carries the meaning, not just colour.
 */
export function RoleMark({ role, size: d = 28 }: { role: Role; size?: number }) {
  const color = ROLE_META[role].color;
  const base = { width: d, height: d, borderRadius: d / 2, borderWidth: 2.5, overflow: 'hidden' as const };
  if (role === 'villager')
    return <View style={[base, { backgroundColor: color, borderColor: colors.outline }]} />;
  if (role === 'undercover') {
    return (
      <View style={[base, { backgroundColor: colors.raised, borderColor: colors.outline }]}>
        <View style={{ width: '50%', height: '100%', backgroundColor: color }} />
      </View>
    );
  }
  return <View style={[base, { borderColor: color, borderWidth: Math.max(3, d / 7) }]} />;
}

/** Centered confirmation for risky actions (error prevention). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Dismiss">
        <Pressable style={styles.dialogWrap} onPress={() => {}}>
          <Card>
            <Text style={styles.dialogTitle}>{title}</Text>
            <Text style={styles.dialogText}>{message}</Text>
            <View style={styles.dialogButtons}>
              <Button label="Cancel" variant="outline" onPress={onCancel} style={styles.fill} />
              <Button label={confirmLabel} onPress={onConfirm} style={styles.fill} />
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Gentle idle float, offset per item so a row of characters doesn't move in lockstep. */
export function Bob({
  children,
  delay = 0,
  distance = 5,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
}) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const ease = { duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE_DRIVER };
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, ...ease }),
        Animated.timing(t, { toValue: 0, ...ease }),
      ]),
    );
    const id = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(id);
      loop.stop();
    };
  }, [t, delay]);
  return (
    <Animated.View
      style={{
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }],
      }}
    >
      {children}
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
              backgroundColor: ACCENTS[i % ACCENTS.length],
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
  backText: { color: colors.textSoft, fontFamily: fonts.bodyBold, fontSize: size.body },
  kicker: {
    alignSelf: 'flex-start',
    backgroundColor: colors.outline,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    transform: [{ rotate: '-2deg' }],
  },
  kickerText: {
    color: colors.pink,
    fontFamily: fonts.bodyBold,
    fontSize: size.small - 1,
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
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
    backgroundColor: colors.outline,
    borderRadius: radius.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    padding: space.lg,
    gap: space.md,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: space.lg,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 3,
    transform: [{ rotate: '-3deg' }],
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: size.small, color: colors.text },

  buttonWrap: { marginRight: SHADOW, marginBottom: SHADOW },
  buttonShadow: {
    ...StyleSheet.absoluteFill,
    top: SHADOW,
    left: SHADOW,
    right: -SHADOW,
    bottom: -SHADOW,
    backgroundColor: colors.outline,
    borderRadius: radius.md,
  },
  button: {
    minHeight: TOUCH + 10,
    borderRadius: radius.md,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonText: { color: colors.text, fontFamily: fonts.display, fontSize: size.lead + 2, textAlign: 'center' },
  ghost: { minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
  ghostText: {
    color: colors.textSoft,
    fontFamily: fonts.bodyBold,
    fontSize: size.body,
    textDecorationLine: 'underline',
  },

  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2.5,
    borderColor: colors.outline,
    backgroundColor: colors.raised,
    justifyContent: 'center',
  },
  chipText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.small + 1 },

  row: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH, gap: space.sm },
  rowLabel: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.body + 1 },
  hint: { color: colors.textSoft, fontFamily: fonts.body, fontSize: size.small - 1, marginTop: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepButton: {
    width: TOUCH - 4,
    height: TOUCH - 4,
    borderRadius: (TOUCH - 4) / 2,
    borderWidth: 2.5,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { color: colors.text, fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  stepValue: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: size.title,
    minWidth: 32,
    textAlign: 'center',
  },

  label: { fontFamily: fonts.bodyBold, fontSize: size.small, letterSpacing: 0.5 },
  bodyText: { color: colors.text, fontFamily: fonts.body, fontSize: size.body, lineHeight: 24 },

  sticker: {
    alignSelf: 'center',
    maxWidth: '94%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: OUTLINE + 1,
    borderColor: colors.outline,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    shadowColor: colors.outline,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 6,
  },
  stickerText: {
    color: colors.white,
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  glow: { position: 'absolute', borderRadius: 9999, opacity: 0.1 },
  scrim: { flex: 1, backgroundColor: 'rgba(5,3,10,0.72)', justifyContent: 'center', padding: space.lg },
  dialogWrap: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  dialogTitle: { color: colors.text, fontFamily: fonts.display, fontSize: size.title },
  dialogText: { color: colors.textSoft, fontFamily: fonts.body, fontSize: size.body, lineHeight: 24 },
  dialogButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
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
