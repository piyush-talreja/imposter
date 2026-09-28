import { StyleSheet, Text, View } from 'react-native';

import { Body, Card, Screen } from '@/components/ui';
import { colors, fonts, size, space } from '@/theme/tokens';

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'Pass-and-play',
    items: ['Everything stays on this device: player names, settings and scores. Nothing is sent anywhere.'],
  },
  {
    title: 'Online rooms',
    items: [
      'No account, email or phone number. You sign in anonymously; the game only knows the name you type.',
      'Stored while a room is open: player names, room settings, clues, votes and scores.',
      'Rooms are deleted automatically 24 hours after they’re created. Anonymous sign-ins unused for 30 days are deleted too.',
      'Secret words and roles are kept on the server and never sent to other players’ phones.',
    ],
  },
  {
    title: 'Not collected',
    items: ['No ads, no tracking, no analytics, no location, no contacts.'],
  },
];

export default function Privacy() {
  return (
    <Screen kicker="PRIVACY" title="What we store">
      {SECTIONS.map((s) => (
        <Card key={s.title} badge={s.title}>
          {s.items.map((item) => (
            <View key={item} style={styles.item}>
              <Text style={styles.bullet}>·</Text>
              <Body style={styles.text}>{item}</Body>
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: space.sm },
  bullet: { color: colors.pink, fontFamily: fonts.display, fontSize: size.lead, lineHeight: 22 },
  text: { flex: 1, color: colors.textSoft, fontSize: size.small + 1, lineHeight: 21 },
});
