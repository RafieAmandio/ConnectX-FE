import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AppTopBar } from '@shared/components';

import { DiscoveryDeck } from './discovery-deck';

export function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View className="flex-1 pb-24" style={{ backgroundColor: '#262626' }}>
        <AppTopBar />
        <View className="flex-1 px-4 pt-4">
          <DiscoveryDeck />
        </View>
      </View>
    </>
  );
}
