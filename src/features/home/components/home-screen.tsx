import { Stack } from 'expo-router';
import { View } from 'react-native';

import { DiscoveryDeck } from './discovery-deck';

export function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <View className="flex-1 bg-canvas px-4 pt-4 pb-24">
        <DiscoveryDeck />
      </View>
    </>
  );
}
