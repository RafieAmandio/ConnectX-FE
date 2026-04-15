import { Stack } from 'expo-router';
import { View } from 'react-native';

import { DiscoveryDeck } from './discovery-deck';

export function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View className="flex-1 pb-2" style={{ backgroundColor: '#262626' }}>
        <View className="flex-1">
          <DiscoveryDeck />
        </View>
      </View>
    </>
  );
}
