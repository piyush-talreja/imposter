import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Pop, Screen, Sticker } from '@/components/ui';
import { useGame } from '@/features/game/store';
import { ROLE_META, colors, fonts, size, space } from '@/theme/tokens';

const TITLE = 'Imposter'.split('');
const TITLE_COLORS = [
  colors.pink,
  colors.orange,
  colors.yellow,
  colors.mint,
  colors.blue,
  colors.purple,
  colors.pink,
  colors.orange,
];

export default function Home() {
  const { game, dealt } = useGame();
  const resumeTo: Href | null =
    !game || game.winner ? null : game.pendingGuess ? '/reveal' : dealt ? '/clues' : '/deal';

  return (
    <Screen
      onBack={null}
      footer={
        <>
          {resumeTo ? (
            <Button label="Keep playing" color={colors.mint} onPress={() => router.push(resumeTo)} />
          ) : null}
          <Button
            label={resumeTo ? 'New game' : "Let's play!"}
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
          <Body style={styles.tagline}>
            Everyone gets a secret word… almost. One of you has a sneaky twin word, one of you has nothing.
            Can you tell who?
          </Body>
        </Pop>
      </View>

      <Pop delay={700}>
        <Card badge="Who's who" badgeColor={colors.mint} tilt={-1.2}>
          {(['villager', 'undercover', 'imposter'] as const).map((role) => (
            <View key={role} style={styles.role}>
              <View style={[styles.roleIcon, { backgroundColor: ROLE_META[role].color }]}>
                <Text style={styles.roleEmoji}>{ROLE_META[role].emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleName}>{ROLE_META[role].label}</Text>
                <Body style={styles.roleBlurb}>{ROLE_META[role].blurb}</Body>
              </View>
            </View>
          ))}
        </Card>
      </Pop>

      <View style={styles.meta}>
        <Sticker text="3–20 players" color={colors.yellow} angle={-5} delay={1000} fontSize={18} />
        <Sticker text="1 phone" color={colors.blue} angle={4} delay={1150} fontSize={18} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.md, paddingTop: space.lg },
  titleRow: { flexDirection: 'row' },
  letter: {
    fontFamily: fonts.display,
    fontSize: 66,
    lineHeight: 84,
    textShadowColor: colors.ink,
    textShadowOffset: { width: 3, height: 4 },
    textShadowRadius: 0,
  },
  tagline: { textAlign: 'center', maxWidth: 360, color: colors.inkSoft },
  role: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleEmoji: { fontSize: 24 },
  roleName: { fontFamily: fonts.display, fontSize: size.lead + 2, color: colors.ink },
  roleBlurb: { fontSize: size.small + 1, color: colors.inkSoft, lineHeight: 20 },
  meta: { flexDirection: 'row', justifyContent: 'center', gap: space.md },
});
