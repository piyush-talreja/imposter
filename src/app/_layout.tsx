import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useGame } from '@/features/game/store';
import { colors } from '@/theme/tokens';

// Screens inside a round must not be swiped away mid-deal/vote; they have explicit exits.
const NO_SWIPE = { gestureEnabled: false } as const;

export default function RootLayout() {
  const [hydrated, setHydrated] = useState(useGame.persist.hasHydrated());
  useEffect(() => useGame.persist.onFinishHydration(() => setHydrated(true)), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {hydrated ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="deal" options={NO_SWIPE} />
          <Stack.Screen name="clues" options={NO_SWIPE} />
          <Stack.Screen name="vote" options={NO_SWIPE} />
          <Stack.Screen name="reveal" options={NO_SWIPE} />
        </Stack>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
