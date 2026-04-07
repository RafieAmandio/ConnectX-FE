import { Redirect } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

import { canAccessProtectedRoutes, getRouteForAuthPhase, useAuth } from '@features/auth';

export default function TabLayout() {
  const { authPhase, isHydrated, session } = useAuth();

  if (!isHydrated) {
    return null;
  }

  if (!session || !canAccessProtectedRoutes(authPhase)) {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Overview</Label>
        <Icon sf="house.fill" drawable="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="matches">
        <Label>Pipeline</Label>
        <Icon sf="heart.fill" drawable="favorite" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="products">
        <Label>Market</Label>
        <Icon sf="bag.fill" drawable="shopping-bag" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <Label>Inbox</Label>
        <Icon sf="bubble.left.and.bubble.right.fill" drawable="chat" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger hidden={process.env.EXPO_OS === 'android'} name="team">
        <Label>Team</Label>
        <Icon sf="person.3.fill" drawable="groups" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Label>Account</Label>
        <Icon sf="person.crop.circle.fill" drawable="account-circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
