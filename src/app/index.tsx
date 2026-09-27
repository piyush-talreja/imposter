import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Character } from '@/components/Character';
import { Bob, Body, Button, Label, Pop, Screen } from '@/components/ui';
import { useGame } from '@/features/game/store';
import { useColumnWidth } from '@/lib/fit';
import { colors, fonts, size, space } from '@/theme/tokens';

const TITLE = 'IMPOSTER'.split('');
// Every letter blends in except one: the odd one out.
const TITLE_COLORS = TITLE.map((_, i) => (i === 3 ? colors.pink : colors.text));
// A line-up where one of them doesn't belong. Neutral tones for the crowd.
const LINEUP = [
  { color: '#6E62A8', look: 'plain' },
  { color: '#8C80C9', look: 'plain' },
  { color: colors.pink, look: 'mask' },
  { color: '#8C80C9', look: 'plain' },
  { color: '#6E62A8', look: 'plain' },
] as const;

export default function Home() {
  const { game, dealt } = useGame();
  const column = useColumnWidth(48);
  const letterSize = Math.min(96, Math.floor(column / (TITLE.length * 0.62)));
  const figure = Math.min(84, Math.floor(column / 5.2));
  const resumeTo: Href | null =
    !game || game.over ? null : game.pendingGuess ? '/reveal' : dealt ? '/clues' : '/deal';

  return (
    <Screen
      onBack={null}
      scroll={false}
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
        <View style={styles.lineup} accessibilityLabel="Five characters, one wearing a mask">
          {LINEUP.map((c, i) => (
            <Pop key={i} delay={i * 90}>
              <Bob delay={i * 260} distance={c.look === 'mask' ? 8 : 4}>
                <View style={c.look === 'mask' ? styles.star : styles.extra}>
                  <Character
                    color={c.color}
                    look={c.look}
                    size={c.look === 'mask' ? figure * 1.25 : figure}
                  />
                </View>
              </Bob>
            </Pop>
          ))}
        </View>

        <View style={styles.titleRow} accessible accessibilityRole="header" accessibilityLabel="Imposter">
          {TITLE.map((ch, i) => (
            <Pop key={i} delay={450 + i * 50}>
              <Text
                style={[
                  styles.letter,
                  { fontSize: letterSize, lineHeight: Math.round(letterSize * 1.15), color: TITLE_COLORS[i] },
                  { transform: [{ rotate: `${i % 2 ? 5 : -5}deg` }, { translateY: i % 2 ? 3 : -2 }] },
                ]}
              >
                {ch}
              </Text>
            </Pop>
          ))}
        </View>
        <Pop delay={900}>
          <Body style={styles.tagline}>Someone here is faking it.</Body>
        </Pop>
      </View>

      <View style={styles.meta}>
        <Label color={colors.textSoft}>3–20 players · one phone · offline</Label>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  lineup: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: -space.sm },
  extra: { opacity: 0.9, marginHorizontal: -4 },
  star: { marginHorizontal: -2, zIndex: 1 },
  titleRow: { flexDirection: 'row' },
  letter: {
    fontFamily: fonts.display,
    textShadowColor: colors.outline,
    textShadowOffset: { width: 3, height: 4 },
    textShadowRadius: 0,
  },
  tagline: { textAlign: 'center', color: colors.textSoft, fontSize: size.lead },
  meta: { alignItems: 'center' },
});
