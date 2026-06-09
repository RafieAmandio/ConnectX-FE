import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@shared/components';
import { useTranslation } from '@shared/localization';

export type DiscoveryOnboardingRequiredSheetProps = {
  message: string | null;
  onContinue: () => void;
  visible: boolean;
};

export function DiscoveryOnboardingRequiredSheet({
  message,
  onContinue,
  visible,
}: DiscoveryOnboardingRequiredSheetProps) {
  const insets = useSafeAreaInsets();
  const t = useTranslation();

  return (
    <Modal animationType="slide" onRequestClose={() => {}} transparent visible={visible}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(10, 10, 14, 0.42)' }}>
        <View className="flex-1" />
        <View
          className="rounded-t-[28px] border border-white/10 bg-[#2C2C2C] px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom + 12, 24) }}>
          <View className="items-center pb-5">
            <View className="h-[5px] w-10 rounded-full bg-[#555]" />
          </View>

          <View className="gap-1 px-1 pb-4">
            <AppText className="text-white" variant="title">
              {t('home.onboarding.title')}
            </AppText>
            <AppText className="text-[#AFA9A2]">
              {t('home.onboarding.description')}
            </AppText>
          </View>

          <View className="gap-3">
            <View className="min-h-16 flex-row items-center gap-4 rounded-[18px] bg-[#373534] px-4 py-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#493A2A]">
                <Ionicons color="#F7B05B" name="person-circle-outline" size={24} />
              </View>
              <AppText className="flex-1 text-[#F3F0EB]">{message}</AppText>
            </View>

            <Pressable
              accessibilityRole="button"
              className="min-h-12 items-center justify-center rounded-[18px] bg-[#FF9D3D] active:opacity-80"
              onPress={onContinue}>
              <AppText className="text-[#1F160C]" variant="bodyStrong">
                {t('home.onboarding.continue')}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
