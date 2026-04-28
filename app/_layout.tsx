import '@/global.css';

import { ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider } from '@features/auth';
import { RevenueCatProvider } from '@features/revenuecat';
import { useColorScheme } from '@shared/hooks/use-color-scheme';
import { createQueryClient } from '@shared/services/api';
import { NavigationThemes } from '@shared/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = (useColorScheme() ?? 'dark') as keyof typeof NavigationThemes;
  const [queryClient] = React.useState(() => createQueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RevenueCatProvider>
            <ThemeProvider value={NavigationThemes[colorScheme]}>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen
                  name="(auth)"
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen
                  name="(tabs)"
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: 'modal', title: 'Design Principles' }}
                />
                <Stack.Screen name="conversation" options={{ headerShown: false }} />
                <Stack.Screen name="chat_demo" options={{ headerShown: false }} />
                <Stack.Screen name="match-analysis" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="light" />
            </ThemeProvider>
          </RevenueCatProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
