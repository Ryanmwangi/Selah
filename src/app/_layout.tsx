import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';
import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LockGate } from '../components/LockGate';
import { DbProvider } from '../db/DbProvider';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000 } },
});

function Shell() {
  const t = useTheme();
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <LockGate>
      <StatusBar style={t.name === 'dawn' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="verse-picker" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pin-setup" options={{ presentation: 'modal' }} />
      </Stack>
    </LockGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_500Medium,
    Lora_600SemiBold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#F5F3FA' }} />;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <DbProvider fallback={<View style={{ flex: 1, backgroundColor: '#F5F3FA' }} />}>
          <ThemeProvider>
            <Shell />
          </ThemeProvider>
        </DbProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
