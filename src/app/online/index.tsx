import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Character } from '@/components/Character';
import { Body, Button, Card, Label, Screen } from '@/components/ui';
import { useGame } from '@/features/game/store';
import { OUTLINE, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

// Online hub: your name (remembered on this device), then host or join.
export default function OnlineHub() {
  const { onlineName, setOnlineName } = useGame();
  const [name, setName] = useState(onlineName);
  const ready = name.trim().length > 0;
  const go = (path: '/online/host' | '/online/join') => {
    setOnlineName(name);
    router.push(path);
  };

  return (
    <Screen kicker="ONLINE" title="Play online">
      <Card style={styles.intro}>
        <View style={styles.cast}>
          {['#6E62A8', '#8C80C9', '#6E62A8'].map((c, i) => (
            <Character key={i} color={c} size={40} />
          ))}
        </View>
        <Body style={styles.center}>Everyone plays on their own phone, together or apart.</Body>
      </Card>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', gap: space.sm },
  cast: { flexDirection: 'row', gap: space.xs },
  center: { textAlign: 'center', color: colors.textSoft },
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
