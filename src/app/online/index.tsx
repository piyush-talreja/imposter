import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Character } from '@/components/Character';
import { Body, Button, Card, Label, Screen } from '@/components/ui';
import { useGame } from '@/features/game/store';
import { checkServer } from '@/features/online/client';
import { OUTLINE, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

const STEPS = [
  { title: 'Host a room', text: 'Pick the rules and get a 4-letter code.' },
  { title: 'Friends join', text: 'On their own phones, with the code, a link or the QR.' },
  { title: 'Play anywhere', text: 'Together, on a call, or apart with typed clues. Votes are secret.' },
];

type Server = 'checking' | 'up' | 'down';

// Online hub: a first-time intro, your name (remembered), then host or join.
export default function OnlineHub() {
  const { onlineName, setOnlineName, onlineIntroSeen, dismissOnlineIntro } = useGame();
  const [name, setName] = useState(onlineName);
  const [server, setServer] = useState<Server>('checking');
  const probe = useCallback(() => checkServer().then((ok) => setServer(ok ? 'up' : 'down')), []);
  useEffect(() => {
    probe();
  }, [probe]);
  const check = () => {
    setServer('checking');
    probe();
  };

  const ready = name.trim().length > 0 && server === 'up';
  const go = (path: '/online/host' | '/online/join') => {
    setOnlineName(name);
    router.push(path);
  };

  return (
    <Screen kicker="ONLINE" title="Play online">
      {!onlineIntroSeen ? (
        <Card badge="How it works">
          {STEPS.map((s, i) => (
            <View key={s.title} style={styles.step}>
              <View style={styles.num}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <View style={styles.fill}>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Body style={styles.stepText}>{s.text}</Body>
              </View>
            </View>
          ))}
          <Button label="Got it" variant="outline" onPress={dismissOnlineIntro} />
        </Card>
      ) : (
        <Card style={styles.intro}>
          <View style={styles.cast}>
            {['#6E62A8', '#8C80C9', '#6E62A8'].map((c, i) => (
              <Character key={i} color={c} size={40} />
            ))}
          </View>
          <Body style={styles.center}>Everyone plays on their own phone, together or apart.</Body>
        </Card>
      )}

      {server === 'down' ? (
        <Card style={styles.center} badge="Can’t connect">
          <Body style={styles.center}>
            The game server isn’t reachable. Check your internet connection. Pass-and-play still works
            offline.
          </Body>
          <Button label="Try again" onPress={check} />
        </Card>
      ) : null}

      <Card badge="Your name">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={colors.textSoft}
          maxLength={16}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel="Your name"
          style={styles.input}
        />
      </Card>

      <View style={styles.choices}>
        <Card style={styles.choice}>
          <Text style={styles.choiceTitle}>Host a room</Text>
          <Label>Pick the rules, get a code to share</Label>
          <Button label="Host" onPress={() => go('/online/host')} disabled={!ready} />
        </Card>
        <Card style={styles.choice}>
          <Text style={styles.choiceTitle}>Join a room</Text>
          <Label>Enter the 4-letter code from the host</Label>
          <Button label="Join" variant="outline" onPress={() => go('/online/join')} disabled={!ready} />
        </Card>
      </View>
      {server === 'checking' ? (
        <View style={styles.center}>
          <Label>Connecting…</Label>
        </View>
      ) : null}
      <View style={styles.center}>
        <Button label="Privacy" variant="ghost" onPress={() => router.push('/privacy')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  intro: { alignItems: 'center', gap: space.sm },
  cast: { flexDirection: 'row', gap: space.xs },
  center: { textAlign: 'center', color: colors.textSoft, alignItems: 'center' },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: OUTLINE - 0.5,
    borderColor: colors.outline,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontFamily: fonts.display, fontSize: size.body + 1, lineHeight: 22, color: colors.white },
  stepTitle: { fontFamily: fonts.display, fontSize: size.lead + 2, color: colors.text },
  stepText: { color: colors.textSoft, fontSize: size.small + 1, lineHeight: 20 },
  input: {
    minHeight: TOUCH + 10,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: size.lead,
    paddingHorizontal: space.md,
  },
  choices: { gap: space.md },
  choice: { gap: space.sm },
  choiceTitle: { fontFamily: fonts.display, fontSize: size.title, color: colors.text },
});
