import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppCard, AppPill, AppText } from '@shared/components';

const teamMembers = [
  {
    name: 'Alya Hartono',
    role: 'Product lead',
    availability: 'online',
  },
  {
    name: 'Dimas Prasetyo',
    role: 'Community manager',
    availability: 'reviewing',
  },
  {
    name: 'Sarah Malik',
    role: 'Design systems',
    availability: 'available',
  },
] as const;

export function TeamScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Team' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-4 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <AppCard className="gap-4">
          <AppPill className="self-start" label="Internal Workspace" tone="accent" />
          <AppText variant="hero">Keep roles, coverage, and collaboration visible.</AppText>
          <AppText tone="muted">
            This mock tab can evolve into team management, workspace permissions, or shared project
            planning once the authenticated shell grows.
          </AppText>
        </AppCard>

        <View className="gap-3">
          {teamMembers.map((member) => (
            <AppCard key={member.name} className="gap-3">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1 gap-1">
                  <AppText variant="subtitle">{member.name}</AppText>
                  <AppText tone="muted">{member.role}</AppText>
                </View>
                <AppPill
                  label={member.availability}
                  tone={member.availability === 'reviewing' ? 'signal' : 'accent'}
                />
              </View>
            </AppCard>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
