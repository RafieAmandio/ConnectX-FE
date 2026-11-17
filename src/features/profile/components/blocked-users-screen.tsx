import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@shared/components';
import { useTranslation } from '@shared/localization';
import { apiFetch } from '@shared/services/api';

import { blockedUsersQueryKey, useBlockUser } from './user-safety-sheet';

type BlockedUser = { user_id: string; name: string; avatar_url: string | null; blocked_at: string };

// Blocked people vanish from the deck and chat, so this list is the only way back to them.
export function BlockedUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const blockUser = useBlockUser();
  const blocksQuery = useQuery({
    queryFn: () => apiFetch<{ success: boolean; data: BlockedUser[] }>('/api/v1/me/blocks'),
    queryKey: blockedUsersQueryKey,
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-canvas">
        <View className="flex-row items-center gap-3 border-b border-border px-4 pb-3" style={{ paddingTop: insets.top + 10 }}>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-raised active:opacity-80"
            hitSlop={12}
            onPress={() => router.back()}>
            <Ionicons color="#FFFFFF" name="chevron-back" size={22} />
          </Pressable>
          <AppText className="text-[21px]" variant="title">
            {t('safety.blockedUsers')}
          </AppText>
        </View>

        {blocksQuery.isPending ? (
          <ActivityIndicator className="mt-10" color="#FF9A3E" />
        ) : (
          <FlatList
            contentContainerStyle={{ gap: 10, padding: 16, paddingBottom: insets.bottom + 24 }}
            data={blocksQuery.data?.data ?? []}
            keyExtractor={(item) => item.user_id}
            ListEmptyComponent={
              <AppText align="center" className="mt-10" tone="muted">
                {blocksQuery.error instanceof Error ? blocksQuery.error.message : t('safety.noBlockedUsers')}
              </AppText>
            }
            renderItem={({ item }) => (
              <View className="flex-row items-center gap-3 rounded-[18px] border border-border bg-surface-raised px-3 py-3">
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={{ borderRadius: 20, height: 40, width: 40 }} />
                ) : (
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-[#3B2A1C]">
                    <AppText className="text-[#FF9A3E]" variant="bodyStrong">
                      {item.name.trim().charAt(0).toUpperCase()}
                    </AppText>
                  </View>
                )}
                <AppText className="min-w-0 flex-1" numberOfLines={1} variant="bodyStrong">
                  {item.name}
                </AppText>
                <Pressable
                  className="rounded-full border border-border-strong px-4 py-2 active:opacity-80"
                  disabled={blockUser.isPending}
                  onPress={() =>
                    blockUser.mutate(
                      { block: false, userId: item.user_id },
                      { onError: (error) => Alert.alert(t('safety.errorTitle'), error.message) }
                    )
                  }>
                  <AppText className="text-[13px]" variant="bodyStrong">
                    {t('safety.unblock')}
                  </AppText>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}
