import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tap, thud } from '@/lib/haptics';
import { TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

const GRAIN = require('@/assets/images/grain.png');
export const NATIVE_DRIVER = Platform.OS !== 'web';

/** Tiled film grain. <Image resizeMode="repeat"> tiles on both native and web. */
function Grain({ opacity }: { opacity: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={GRAIN} resizeMode="repeat" style={{ width: '100%', height: '100%', opacity }} />
    </View>
  );
}

/** Dark desk with a warm lamp-light vignette and film grain. */
export function Desk({ children }: { children: ReactNode }) {
  return (
    <View style={styles.fill}>
      <LinearGradient
        colors={[colors.deskLight, colors.desk, '#0A0807']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Grain opacity={0.9} />
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
  /** Small typewriter line above the title, e.g. "Case file · Round 2". */
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
    <Desk>
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
                <Text style={styles.backText}>← {backLabel.toUpperCase()}</Text>
              </Pressable>
            ) : (
              <View style={{ height: space.sm }} />
            )}
            {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
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
    </Desk>
  );
}

/** A sheet of dossier paper, optionally with a manila tab label and a slight tilt. */
export function Paper({
  tab,
  tilt = 0,
  children,
  style,
}: {
  tab?: string;
  tilt?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ transform: [{ rotate: `${tilt}deg` }] }, tab ? { paddingTop: 22 } : null]}>
      {tab ? (
        <View style={styles.tab}>
          <Text style={styles.tabText}>{tab.toUpperCase()}</Text>
        </View>
      ) : null}
      <View style={[styles.paper, style]}>
        <Grain opacity={0.6} />
        {children}
      </View>
    </View>
  );
}

type ButtonVariant = 'stamp' | 'paper' | 'ghost';

/**
 * `stamp`: red rubber-stamp CTA. `paper`: secondary on the desk. `ghost`: text only.
 */
export function Button({
  label,
  onPress,
  variant = 'stamp',
  ink = colors.imposter,
  disabled,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  ink?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        variant === 'stamp' && { backgroundColor: ink, borderColor: ink },
        variant === 'paper' && styles.buttonPaper,
        variant === 'ghost' && styles.buttonGhost,
        pressed && { transform: [{ scale: 0.97 }, { rotate: '-0.6deg' }] },
        disabled && { opacity: 0.35 },
        style,
      ]}
    >
      {variant === 'stamp' ? <View pointerEvents="none" style={styles.stampInner} /> : null}
      <Text
        style={[
          styles.buttonText,
          variant === 'paper' && { color: colors.ink },
          variant === 'ghost' && { color: colors.mutedOnDark, fontFamily: fonts.type, letterSpacing: 1 },
        ]}
      >
        {variant === 'ghost' ? label : label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

/** Evidence tag: a toggleable label for categories and difficulties. */
export function Tag({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={[styles.tag, selected && styles.tagSelected]}
    >
      <Text style={[styles.tagText, selected && { color: colors.cream }]}>{label}</Text>
    </Pressable>
  );
}

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  ink = colors.ink,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  ink?: string;
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
      style={[styles.stepButton, off && { opacity: 0.25 }]}
    >
      <Text style={styles.stepGlyph}>{glyph}</Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      <View style={styles.fill}>
        <Text style={[styles.rowLabel, { color: ink }]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.stepper}>
        {btn(-1, '−', value <= min)}
        <Text style={[styles.stepValue, { color: ink }]} accessibilityLabel={`${label}: ${value}`}>
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
        trackColor={{ true: colors.imposter, false: colors.paperEdge }}
        thumbColor={colors.cream}
        {...(Platform.OS === 'web' ? { activeThumbColor: colors.cream } : {})}
      />
    </View>
  );
}

/** Typewriter caps label. */
export function Label({ children, color = colors.muted }: { children: ReactNode; color?: string }) {
  return <Text style={[styles.label, { color }]}>{children}</Text>;
}

export function Type({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.type, style]}>{children}</Text>;
}

/**
 * Rubber stamp that slams onto the page: drops from large and faint to its
 * resting size with a small overshoot, then keeps a slightly skewed angle.
 */
export function Stamp({
  text,
  ink,
  angle = -8,
  delay = 150,
  fontSize = 42,
  style,
}: {
  text: string;
  ink: string;
  angle?: number;
  delay?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(t, {
        toValue: 1,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]);
    const id = setTimeout(thud, delay + 240);
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
        styles.stamp,
        { borderColor: ink },
        {
          opacity: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.5, 0.92] }),
          transform: [
            { rotate: `${angle}deg` },
            { scale: t.interpolate({ inputRange: [0, 0.85, 1], outputRange: [2.6, 0.94, 1] }) },
          ],
        },
        style,
      ]}
    >
      <View style={[styles.stampRule, { borderColor: ink }]}>
        <Text style={[styles.stampText, { color: ink, fontSize }]} numberOfLines={1} adjustsFontSizeToFit>
          {text.toUpperCase()}
        </Text>
      </View>
    </Animated.View>
  );
}

/** Fade + rise for staggered entrances. */
export function Rise({
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
    Animated.timing(t, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [t, delay]);
  return (
    <Animated.View
      style={[
        {
          opacity: t,
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
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
  header: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: 2 },
  back: { minHeight: TOUCH - 8, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { color: colors.mutedOnDark, fontFamily: fonts.type, fontSize: size.small, letterSpacing: 2 },
  kicker: { color: colors.brass, fontFamily: fonts.type, fontSize: size.small, letterSpacing: 2.5 },
  title: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: size.title + 4,
    lineHeight: size.title + 12,
  },
  scroll: { padding: space.lg, paddingBottom: space.xl },
  body: { gap: space.lg, flexGrow: 1 },
  footer: { paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm, gap: space.xs },

  paper: {
    backgroundColor: colors.paper,
    borderRadius: radius.sm,
    padding: space.lg,
    gap: space.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.paperEdge,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tab: {
    position: 'absolute',
    top: 0,
    left: space.lg,
    height: 26,
    paddingHorizontal: space.md,
    backgroundColor: colors.paperShade,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.paperEdge,
    justifyContent: 'center',
  },
  tabText: { fontFamily: fonts.type, fontSize: 11, letterSpacing: 2, color: colors.ink },

  button: {
    minHeight: TOUCH + 10,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  stampInner: {
    ...StyleSheet.absoluteFill,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
  },
  buttonPaper: { backgroundColor: colors.paper, borderColor: colors.paperEdge },
  buttonGhost: { backgroundColor: 'transparent', borderColor: 'transparent', minHeight: TOUCH },
  buttonText: {
    color: colors.cream,
    fontFamily: fonts.stencil,
    fontSize: size.lead,
    letterSpacing: 2,
    textAlign: 'center',
  },

  tag: {
    minHeight: 38,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  tagSelected: { backgroundColor: colors.ink, borderStyle: 'solid' },
  tagText: { color: colors.ink, fontFamily: fonts.type, fontSize: size.small + 1 },

  row: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH, gap: space.sm },
  rowLabel: { color: colors.ink, fontFamily: fonts.type, fontSize: size.body + 1 },
  hint: { color: colors.muted, fontFamily: fonts.type, fontSize: size.small - 1, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  stepButton: {
    width: TOUCH - 4,
    height: TOUCH - 4,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: -2 },
  stepValue: { fontFamily: fonts.display, fontSize: size.title, minWidth: 36, textAlign: 'center' },

  label: { fontFamily: fonts.type, fontSize: size.small, letterSpacing: 2.5 },
  type: { color: colors.ink, fontFamily: fonts.type, fontSize: size.body, lineHeight: 23 },

  stamp: { alignSelf: 'center', maxWidth: '94%', borderWidth: 4, borderRadius: radius.md, padding: 3 },
  stampRule: { borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 2 },
  stampText: { fontFamily: fonts.stencil, letterSpacing: 3 },
});
