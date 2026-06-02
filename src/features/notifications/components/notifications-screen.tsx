import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppCard, AppText } from '@shared/components';

import { useMarkNotificationsRead, useNotifications } from '../hooks/use-notifications';
import type { NotificationType, UserNotification } from '../types/notifications.types';

const HEADER_BG = '#232323';
const SCREEN_BG = '#262626';
const ACCENT = '#FF9A3E';

function getNotificationIcon(type: NotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'match':
      return 'heart-outline';
    case 'message':
      return 'chatbubble-outline';
    case 'team_invitation':
      return 'people-outline';
    case 'system':
      return 'sparkles-outline';
    default:
      return 'notifications-outline';
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const elapsedMs = Date.now() - date.getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

  if (elapsedMinutes < 1) {
    return 'Just now';
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedDays < 7) {
    return `${elapsedDays}d ago`;
  }

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  });
}

function NotificationAvatar({ notification }: { notification: UserNotification }) {
  if (notification.actor?.avatarUrl) {
    return (
      <Image
        contentFit="cover"
        source={{ uri: notification.actor.avatarUrl }}
        style={{ borderRadius: 24, height: 48, width: 48 }}
      />
    );
  }

  return (
    <View
      className="h-12 w-12 items-center justify-center rounded-full"
      style={{ backgroundColor: '#30261C' }}>
      <Ionicons color={ACCENT} name={getNotificationIcon(notification.type)} size={22} />
    </View>
  );
}

function getNotificationRoute(notification: UserNotification) {
  const deepLink = notification.target.deepLink?.trim();
  const targetId = notification.target.id ? encodeURIComponent(notification.target.id) : null;

  switch (notification.target.kind) {
    case 'conversation':
      return deepLink?.startsWith('/chat_demo/') ? deepLink : targetId ? `/chat_demo/${targetId}` : null;
    case 'match':
      return deepLink?.startsWith('/match-analysis/') ? deepLink : targetId ? `/match-analysis/${targetId}` : null;
    case 'startup_invitation':
      return '/(tabs)/team';
    default:
      return null;
  }
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: UserNotification;
  onPress?: () => void;
}) {
  const isUnread = notification.readAt === null;
  const card = (
    <AppCard
      className="rounded-[20px] border px-4 py-4"
      style={{
        backgroundColor: isUnread ? '#302A24' : '#2C2C2C',
        borderColor: isUnread ? 'rgba(255, 154, 62, 0.32)' : 'rgba(255, 255, 255, 0.08)',
        shadowColor: 'transparent',
      }}>
      <View className="flex-row gap-3">
        <NotificationAvatar notification={notification} />

        <View className="flex-1 gap-1">
          <View className="flex-row items-start gap-2">
            <AppText className="flex-1 text-[16px] leading-[22px]" variant="bodyStrong">
              {notification.title}
            </AppText>
            {isUnread ? (
              <View className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCENT }} />
            ) : null}
          </View>

          <AppText className="text-[13px] leading-[19px]" tone="muted">
            {notification.body}
          </AppText>

          <View className="mt-1 flex-row items-center gap-1.5">
            <Ionicons color="#98A2B3" name={getNotificationIcon(notification.type)} size={13} />
            <AppText className="text-[12px]" tone="soft" variant="code">
              {formatRelativeTime(notification.createdAt)}
            </AppText>
          </View>
        </View>
      </View>
    </AppCard>
  );

  if (!onPress) {
    return card;
  }

  return (
    <Pressable
      accessibilityLabel={`Open notification: ${notification.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
      {card}
    </Pressable>
  );
}

function NotificationsEmptyState() {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-16">
      <View
        className="h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: '#30261C' }}>
        <Ionicons color={ACCENT} name="notifications-outline" size={28} />
      </View>
      <AppText align="center" className="text-[20px]" variant="title">
        No notifications yet
      </AppText>
      <AppText align="center" tone="muted">
        Matches, messages, team invites, and product updates will appear here.
      </AppText>
    </View>
  );
}

export function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const notificationsQuery = useNotifications();
  const markNotificationsReadMutation = useMarkNotificationsRead();
  const notifications = notificationsQuery.data?.data.notifications ?? [];
  const unreadCount = notificationsQuery.data?.data.unreadCount ?? 0;
  const lastReadAttemptDataUpdatedAtRef = React.useRef(0);

  React.useEffect(() => {
    if (
      notificationsQuery.isLoading ||
      !notificationsQuery.data ||
      unreadCount <= 0 ||
      markNotificationsReadMutation.isPending ||
      lastReadAttemptDataUpdatedAtRef.current === notificationsQuery.dataUpdatedAt
    ) {
      return;
    }

    lastReadAttemptDataUpdatedAtRef.current = notificationsQuery.dataUpdatedAt;
    markNotificationsReadMutation.mutate();
  }, [
    markNotificationsReadMutation,
    notificationsQuery.data,
    notificationsQuery.dataUpdatedAt,
    notificationsQuery.isLoading,
    unreadCount,
  ]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View className="flex-1" style={{ backgroundColor: SCREEN_BG }}>
        <View
          className="flex-row items-center gap-3 px-5 pb-5"
          style={{ backgroundColor: HEADER_BG, paddingTop: insets.top + 14 }}>
          <Pressable
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full border"
            onPress={() => router.back()}
            style={{ borderColor: 'rgba(152, 162, 179, 0.18)' }}>
            <Ionicons color="#D0D5DD" name="chevron-back" size={22} />
          </Pressable>

          <View className="flex-1">
            <AppText className="text-[22px] leading-[28px]" variant="title">
              Notifications
            </AppText>
            <AppText className="text-[12px]" tone="muted">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </AppText>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow gap-3 px-4 py-4"
          refreshControl={
            <RefreshControl
              onRefresh={notificationsQuery.refetch}
              refreshing={notificationsQuery.isRefetching}
              tintColor={ACCENT}
            />
          }>
          {notificationsQuery.isLoading ? (
            <View className="flex-1 items-center justify-center gap-3 py-16">
              <Ionicons color={ACCENT} name="notifications-outline" size={28} />
              <AppText tone="muted">Loading notifications...</AppText>
            </View>
          ) : notificationsQuery.error ? (
            <View className="flex-1 items-center justify-center gap-4 px-6 py-16">
              <Ionicons color="#F97066" name="warning-outline" size={30} />
              <View className="gap-1">
                <AppText align="center" className="text-[20px]" variant="title">
                  Unable to load notifications
                </AppText>
                <AppText align="center" tone="muted">
                  Pull to refresh or try again in a moment.
                </AppText>
              </View>
              <Pressable
                className="rounded-full px-4 py-2"
                onPress={() => notificationsQuery.refetch()}
                style={{ backgroundColor: ACCENT }}>
                <AppText className="text-[#1A120B]" variant="bodyStrong">
                  Try again
                </AppText>
              </Pressable>
            </View>
          ) : notifications.length === 0 ? (
            <NotificationsEmptyState />
          ) : (
            notifications.map((notification) => {
              const route = getNotificationRoute(notification);

              return (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onPress={route ? () => router.push(route as never) : undefined}
                />
              );
            })
          )}
        </ScrollView>
      </View>
    </>
  );
}
