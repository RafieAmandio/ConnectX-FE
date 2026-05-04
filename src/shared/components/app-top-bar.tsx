import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { useRevenueCat } from '@features/revenuecat';

import { AppText } from './app-text';

const CONNECTX_LOGO = require('../../../assets/images/connectx-logo.png');

const ACCENT = '#FF9A3E';
const HEADER_BG = '#232323';

type AppTopBarProps = {
  rightAccessory?: React.ReactNode;
};

export function AppTopBar({ rightAccessory }: AppTopBarProps) {
  const { isConnectXProActive } = useRevenueCat();
  const badgeLabel = isConnectXProActive ? 'BETA VERSION' : 'BETA VERSION';

  return (
    <View
      className="flex-row items-center gap-2 px-5 pt-16 pb-5"
      style={{ backgroundColor: HEADER_BG }}>
      <View
        className="h-8 w-8 items-center justify-center overflow-hidden rounded-[9px] bg-white"
        style={{ borderCurve: 'continuous' }}>
        <Image
          source={CONNECTX_LOGO}
          style={{ width: 22, height: 22 }}
          contentFit="contain"
        />
      </View>
      <AppText variant="bodyStrong" className="text-[13px] text-white">
        ConnectX
      </AppText>
      <View
        className="rounded-full border px-2 py-[4px]"
        style={{ borderColor: ACCENT }}>
        <AppText
          variant="label"
          className="text-[9px]"
          style={{ color: ACCENT, letterSpacing: 0.5 }}>
          {badgeLabel}
        </AppText>
      </View>
      <View className="flex-1" />
      {rightAccessory}
    </View>
  );
}
