import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { BlackOpsOne_400Regular } from '@expo-google-fonts/black-ops-one';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useGame } from '@/features/game/store';
import { colors } from '@/theme/tokens';

// In-game screens must not be swiped away mid-deal or mid-verdict; they have explicit exits.
const NO_SWIPE = { gestureEnabled: false } as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    AbrilFatface_400Regular,
    BlackOpsOne_400Regular,
    SpecialElite_400Regular,
  });
  const [hydrated, setHydrated] = useState(useGame.persist.hasHydrated());
  useEffect(() => useGame.persist.onFinishHydration(() => setHydrated(true)), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {fontsLoaded && hydrated ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.desk },
            animation: 'fade',
          }}
        >
          {['deal', 'clues', 'eliminate', 'verdict', 'case-closed'].map((name) => (
            <Stack.Screen key={name} name={name} options={NO_SWIPE} />
          ))}
        </Stack>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.desk, justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brass} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
