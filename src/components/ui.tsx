import { router } from 'expo-router';
import { type ReactNode } from 'react';
import {
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

import { tap } from '@/lib/haptics';
import { TOUCH, colors, font, radius, space } from '@/theme/tokens';

export function Screen({
  title,
  onBack,
  backLabel = '‹ Back',
  scroll = true,
  footer,
  children,
}: {
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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.column}>
        {(title || back) && (
          <View style={styles.header}>
            {back ? (
              <Pressable
                onPress={back}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={backLabel.replace('‹', '').trim()}
                style={styles.headerButton}
              >
                <Text style={styles.headerButtonText}>{backLabel}</Text>
              </Pressable>
            ) : null}
            {title ? (
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
            ) : null}
          </View>
        )}
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.scroll, { flex: 1 }]}>{body}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
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
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[variant],
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, variant === 'ghost' && { color: colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

const buttonStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.imposter },
};

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const step = (d: number) => {
    const next = Math.min(max, Math.max(min, value + d));
    if (next !== value) {
      tap();
      onChange(next);
    }
  };
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => step(-1)}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={[styles.stepButton, value <= min && { opacity: 0.3 }]}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue} accessibilityLabel={`${label}: ${value}`}>
          {value}
        </Text>
        <Pressable
          onPress={() => step(1)}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={[styles.stepButton, value >= max && { opacity: 0.3 }]}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.4 }]}>
      <View style={{ flex: 1, paddingRight: space.md }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          tap();
          onChange(v);
        }}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.text}
      />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.bodyText, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  // Keeps the layout phone-shaped on tablets and desktop web.
  column: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm },
  headerButton: { minHeight: TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  headerButtonText: { color: colors.muted, fontSize: font.body },
  title: { color: colors.text, fontSize: font.title + 4, fontWeight: '800' },
  scroll: { padding: space.lg, paddingBottom: space.xl },
  body: { gap: space.lg, flexGrow: 1 },
  footer: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.sm },
  button: {
    minHeight: TOUCH + 8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonText: { color: colors.primaryText, fontSize: font.body + 1, fontWeight: '700' },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: font.small + 1, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH,
  },
  rowLabel: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepButton: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.text, fontSize: font.title, fontWeight: '700' },
  stepValue: {
    color: colors.text,
    fontSize: font.title,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'center',
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  label: {
    color: colors.muted,
    fontSize: font.small,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bodyText: { color: colors.text, fontSize: font.body, lineHeight: 24 },
});
