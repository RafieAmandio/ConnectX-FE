import { Redirect } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { useMockAuth } from '@/src/auth/mock-auth';

export default function TabLayout() {
  const { isHydrated, session } = useMockAuth();

  if (!isHydrated) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf="house.fill" drawable="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="matches">
        <Label>Matches</Label>
        <Icon sf="heart.fill" drawable="favorite" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <Label>Chat</Label>
        <Icon sf="bubble.left.and.bubble.right.fill" drawable="chat" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="team">
        <Label>Team</Label>
        <Icon sf="person.3.fill" drawable="groups" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon sf="person.crop.circle.fill" drawable="account-circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}



