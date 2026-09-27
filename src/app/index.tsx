import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Label, Pop, RoleMark, Screen } from '@/components/ui';
import { useGame } from '@/features/game/store';
import { useColumnWidth } from '@/lib/fit';
import { ROLE_META, colors, fonts, size, space } from '@/theme/tokens';

const TITLE = 'IMPOSTER'.split('');
// Every letter blends in except one: the odd one out.
const TITLE_COLORS = TITLE.map((_, i) => (i === 3 ? colors.pink : colors.text));

export default function Home() {
  const { game, dealt } = useGame();
  // 8 wobbly letters must fit across small phones (e.g. 320pt iPhone SE).
  const letterSize = Math.min(96, Math.floor(useColumnWidth(48) / (TITLE.length * 0.62)));
  const resumeTo: Href | null =
    !game || game.over ? null : game.pendingGuess ? '/reveal' : dealt ? '/clues' : '/deal';

  return (
    <Screen
      onBack={null}
      footer={
        <>
          {resumeTo ? <Button label="Resume game" onPress={() => router.push(resumeTo)} /> : null}
          <Button
            label="New game"
            variant={resumeTo ? 'outline' : 'pop'}
            onPress={() => router.push('/setup')}
          />
          <Button label="How to play" variant="ghost" onPress={() => router.push('/how-to-play')} />
        </>
      }
    >
      <View style={styles.hero}>
        <View style={styles.titleRow} accessible accessibilityRole="header" accessibilityLabel="Imposter">
          {TITLE.map((ch, i) => (
            <Pop key={i} delay={i * 60}>
              <Text
                style={[
                  styles.letter,
                  { fontSize: letterSize, lineHeight: Math.round(letterSize * 1.2) },
                  {
                    color: TITLE_COLORS[i],
                    transform: [{ rotate: `${i % 2 ? 6 : -6}deg` }, { translateY: i % 2 ? 4 : -2 }],
                  },
                ]}
              >
                {ch}
              </Text>
            </Pop>
          ))}
        </View>
        <Pop delay={550}>
          <Body style={styles.tagline}>Everyone gets the word. Almost.</Body>
        </Pop>
      </View>

      <Pop delay={700}>
        <Card tilt={-1}>
          {(['villager', 'undercover', 'imposter'] as const).map((role) => (
            <View key={role} style={styles.role}>
              <RoleMark role={role} />
              <Text style={styles.roleName}>{ROLE_META[role].label}</Text>
              <Body style={styles.roleBlurb}>{ROLE_META[role].blurb}</Body>
            </View>
          ))}
        </Card>
      </Pop>

      <Label color={colors.textSoft}>3–20 players · one phone</Label>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingTop: space.xl },
  titleRow: { flexDirection: 'row' },
  letter: {
    fontFamily: fonts.display,
    textShadowColor: colors.outline,
    textShadowOffset: { width: 3, height: 4 },
    textShadowRadius: 0,
  },
  tagline: { textAlign: 'center', color: colors.textSoft, fontSize: size.lead },
  role: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  roleName: { fontFamily: fonts.display, fontSize: size.lead + 2, color: colors.text, width: 104 },
  roleBlurb: { flex: 1, fontSize: size.small, color: colors.textSoft, lineHeight: 19 },
});
