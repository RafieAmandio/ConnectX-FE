import { AntDesign } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';

import { AppText } from '@shared/components';
import {
  clearLinkedInSyncNotice,
  getLinkedInSyncNoticeState,
  subscribeLinkedInSyncNotice,
} from '@shared/services/linkedin-sync-notice-store';
import { DiscoveryDeck } from './discovery-deck';

function LinkedInSyncNoticeModal() {
  const notice = React.useSyncExternalStore(
    subscribeLinkedInSyncNotice,
    getLinkedInSyncNoticeState,
    getLinkedInSyncNoticeState
  );

  React.useEffect(() => {
    console.log('[home] linkedin sync notice state', notice);

    if (notice.isPending) {
      console.log('[home] presenting linkedin sync notice modal', notice);
    }
  }, [notice]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={clearLinkedInSyncNotice}
      transparent
      visible={notice.isPending}>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.58)' }}>
        <View
          className="w-full max-w-[330px] rounded-[24px] border px-6 pb-6 pt-5"
          style={{
            backgroundColor: '#262626',
            borderColor: '#3A3A3A',
            borderCurve: 'continuous',
          }}>
          <View className="items-end">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close LinkedIn data notice"
              className="h-9 w-9 items-center justify-center rounded-full"
              onPress={clearLinkedInSyncNotice}
              hitSlop={8}>
              <AntDesign color="#A3A3A3" name="close" size={18} />
            </Pressable>
          </View>

          <View className="items-center">
            <View
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: '#3A2812' }}>
              <ActivityIndicator color="#FF9A3E" />
            </View>

            <AppText
              align="center"
              variant="subtitle"
              className="mt-5 text-[20px] leading-[26px] text-white">
              Getting your LinkedIn data
            </AppText>
            <AppText
              align="center"
              className="mt-2 text-[14px] leading-[20px] text-text-muted">
              This may take a few minutes. You can keep exploring while we prepare it.
            </AppText>

            <Pressable
              className="mt-6 h-12 w-full items-center justify-center rounded-[16px]"
              style={{ backgroundColor: '#FF9A3E', borderCurve: 'continuous' }}
              onPress={clearLinkedInSyncNotice}>
              <AppText variant="subtitle" className="text-[15px] text-[#1A1208]">
                Got it
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View className="flex-1 pb-2" style={{ backgroundColor: '#262626' }}>
        <View className="flex-1">
          <DiscoveryDeck />
        </View>
      </View>
      <LinkedInSyncNoticeModal />
    </>
  );
}
