import { StyleSheet, Text, View } from 'react-native';

import { Character, LOOK_FOR_ROLE } from '@/components/Character';
import { Body, Card, Screen } from '@/components/ui';
import { POINTS, type Role } from '@/features/game/engine';
import { fitFontSize, useColumnWidth } from '@/lib/fit';
import { OUTLINE, ROLE_META, colors, fonts, radius, size, space } from '@/theme/tokens';

const WHO: { role: Role; caption: string }[] = [
  { role: 'villager', caption: 'Gets the secret word' },
  { role: 'undercover', caption: 'Gets a similar word, and thinks it’s the real one' },
  { role: 'imposter', caption: 'Gets no word, and has to fake it' },
];

const STEPS = [
  {
    title: 'Get your word',
    text: 'Pass the phone around. Each player holds the card to secretly see their word, then passes it on.',
  },
  {
    title: 'Give a clue',
    text: 'Take turns saying one word that hints at your word. Too obvious and the Imposter will work it out; too vague and you’ll look suspicious.',
  },
  {
    title: 'Vote someone out',
    text: 'Talk it over and agree on who seems to be faking. They’re out, and the app reveals who they really were.',
  },
  {
    title: 'Repeat',
    text: 'Play more rounds until the Imposter is caught, or they win.',
  },
];

const WIN: { role: Role; title: string; text: string }[] = [
  { role: 'villager', title: 'Villagers win', text: 'by voting out every Imposter.' },
  {
    role: 'imposter',
    title: 'Imposter wins',
    text: 'by surviving, or by guessing the word after being caught.',
  },
  {
    role: 'undercover',
    title: 'Bonus round',
    text: 'If an Undercover is still in once the Imposter is caught, keep going to find them.',
  },
];

const SCORING: [string, number][] = [
  ['Imposter caught: every Villager and Undercover', POINTS.imposterCaught],
  ['Imposter wins: the Imposter', POINTS.imposterWins],
  ['Undercover caught: every Villager', POINTS.undercoverCaught],
  ['Undercover never caught: the Undercover', POINTS.undercoverUndetected],
];

export default function HowToPlay() {
  // Three role names side by side must each fit on one line ("Undercover" is the longest).
  const nameSize = fitFontSize('Undercover', size.lead, useColumnWidth(48 + 48 + 12) / 3 - space.sm);

  return (
    <Screen kicker="RULES" title="How to play">
      <Card style={styles.intro}>
        <View style={styles.introCast}>
          {(['villager', 'villager', 'imposter', 'villager'] as const).map((role, i) => (
            <Character
              key={i}
              color={role === 'imposter' ? colors.pink : '#7A6EB8'}
              look={LOOK_FOR_ROLE[role]}
              size={40}
            />
          ))}
        </View>
        <Text style={styles.introTitle}>The game in 30 seconds</Text>
        <Body style={styles.introText}>
          Everyone gets the same secret word, except the <Text style={styles.pink}>Imposter</Text>, who gets
          nothing. Take turns giving one-word clues. Work out who&apos;s bluffing and vote them out before
          they guess the word.
        </Body>
      </Card>

      <Card badge="Who’s who">
        <View style={styles.who}>
          {WHO.map(({ role, caption }) => (
            <View key={role} style={styles.whoItem}>
              <Character color={ROLE_META[role].color} look={LOOK_FOR_ROLE[role]} size={58} />
              <Text
                style={[styles.whoName, { color: ROLE_META[role].color, fontSize: nameSize }]}
                numberOfLines={1}
              >
                {ROLE_META[role].label}
              </Text>
              <Text style={styles.caption}>{caption}</Text>
            </View>
          ))}
        </View>
        <Body style={styles.note}>
          Undercover is optional (4+ players). Every game has at least one Imposter.
        </Body>
      </Card>

      <Card badge="How a round works">
        {STEPS.map(({ title, text }, i) => (
          <View key={title} style={styles.step}>
            <View style={styles.num}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Body style={styles.stepText}>{text}</Body>
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.wins}>
        {WIN.map(({ role, title, text }) => (
          <Card key={role} style={[styles.win, { borderColor: ROLE_META[role].color }]}>
            <Character color={ROLE_META[role].color} look={LOOK_FOR_ROLE[role]} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.winTitle, { color: ROLE_META[role].color }]}>{title}</Text>
              <Body style={styles.stepText}>{text}</Body>
            </View>
          </Card>
        ))}
      </View>

      <Card badge="Points">
        {SCORING.map(([text, pts]) => (
          <View key={text} style={styles.pointRow}>
            <Text style={styles.pts}>+{pts}</Text>
            <Body style={styles.stepText}>{text}</Body>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', gap: space.sm, borderColor: colors.pink },
  introCast: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-end' },
  introTitle: { fontFamily: fonts.display, fontSize: size.lead + 6, color: colors.text },
  introText: { textAlign: 'center', color: colors.textSoft, lineHeight: 24 },
  pink: { color: colors.pink, fontFamily: fonts.bodyBold },
  who: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  whoItem: { flex: 1, alignItems: 'center', gap: 2 },
  whoName: { fontFamily: fonts.display },
  caption: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: size.small - 1,
    textAlign: 'center',
    lineHeight: 17,
  },
  note: { color: colors.textSoft, fontSize: size.small, textAlign: 'center' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  num: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: OUTLINE - 0.5,
    borderColor: colors.outline,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numText: { fontFamily: fonts.display, fontSize: size.body + 1, lineHeight: 22, color: colors.white },
  stepTitle: { fontFamily: fonts.display, fontSize: size.lead + 2, color: colors.text },
  stepText: { color: colors.textSoft, fontSize: size.small + 1, lineHeight: 21 },
  wins: { gap: space.md },
  win: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderRadius: radius.lg,
  },
  winTitle: { fontFamily: fonts.display, fontSize: size.lead + 2 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pts: { width: 34, fontFamily: fonts.display, fontSize: size.lead, color: colors.pink },
});
