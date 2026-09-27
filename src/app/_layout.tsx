import { BagelFatOne_400Regular } from '@expo-google-fonts/bagel-fat-one';
import { Fredoka_500Medium, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useGame } from '@/features/game/store';
import { colors } from '@/theme/tokens';

// In-game screens must not be swiped away mid-deal or mid-reveal; they have explicit exits.
const NO_SWIPE = { gestureEnabled: false } as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BagelFatOne_400Regular, Fredoka_500Medium, Fredoka_700Bold });
  const [hydrated, setHydrated] = useState(useGame.persist.hasHydrated());
  useEffect(() => useGame.persist.onFinishHydration(() => setHydrated(true)), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {fontsLoaded && hydrated ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}
        >
          {['deal', 'clues', 'vote-out', 'reveal', 'results'].map((name) => (
            <Stack.Screen key={name} name={name} options={NO_SWIPE} />
          ))}
        </Stack>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
          <ActivityIndicator color={colors.pink} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
