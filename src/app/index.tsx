import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Label, Paper, Rise, Screen, Stamp, Type } from '@/components/ui';
import { useGame } from '@/features/game/store';
import { ROLE_META, colors, fonts, size, space } from '@/theme/tokens';

export default function Home() {
  const { game, dealt } = useGame();
  const resumeTo: Href | null = !game
    ? null
    : game.winner
      ? null
      : game.pendingGuess
        ? '/verdict'
        : dealt
          ? '/clues'
          : '/deal';

  return (
    <Screen
      onBack={null}
      footer={
        <>
          {resumeTo ? <Button label="Resume case" onPress={() => router.push(resumeTo)} /> : null}
          <Button
            label={resumeTo ? 'Open a new case' : 'Open a case'}
            variant={resumeTo ? 'paper' : 'stamp'}
            onPress={() => router.push('/setup')}
          />
          <Button label="How to play" variant="ghost" onPress={() => router.push('/how-to-play')} />
        </>
      }
    >
      <Rise>
        <Text style={styles.kicker}>CASE NO. 0427 · A PARTY GAME</Text>
        <Text style={styles.title} accessibilityRole="header">
          Imposter
        </Text>
        <Type style={styles.tagline}>
          One word. One phone. Somebody at this table is lying, and somebody doesn&apos;t even know they are.
        </Type>
      </Rise>

      <Rise delay={180}>
        <Paper tab="The suspects" tilt={1.2}>
          {(['villager', 'undercover', 'imposter'] as const).map((role) => (
            <View key={role} style={styles.role}>
              <View style={[styles.dot, { backgroundColor: ROLE_META[role].ink }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleName, { color: ROLE_META[role].ink }]}>{ROLE_META[role].label}</Text>
                <Type style={styles.roleBlurb}>{ROLE_META[role].blurb}</Type>
              </View>
            </View>
          ))}
        </Paper>
        <Stamp
          text="Top secret"
          ink={colors.imposter}
          angle={7}
          delay={650}
          fontSize={16}
          style={styles.stamp}
        />
      </Rise>

      <Rise delay={320}>
        <Label color={colors.mutedOnDark}>3–20 players · pass & play · works offline</Label>
      </Rise>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.brass,
    fontFamily: fonts.type,
    fontSize: size.small,
    letterSpacing: 3,
    marginTop: space.md,
  },
  title: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 76,
    lineHeight: 88,
    marginTop: space.xs,
  },
  tagline: { color: colors.mutedOnDark, fontSize: size.body + 1, lineHeight: 25, maxWidth: 380 },
  role: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 8 },
  roleName: { fontFamily: fonts.stencil, fontSize: size.lead, letterSpacing: 1.5 },
  roleBlurb: { fontSize: size.small + 1, color: colors.muted },
  stamp: { position: 'absolute', right: 6, top: -4 },
});
