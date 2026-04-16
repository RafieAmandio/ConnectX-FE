import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText } from '@shared/components';

const CONNECTX_LOGO = require('../../../../assets/images/connectx-logo.png');

const CANVAS_BG = '#212121';
const ACCENT = '#FF9A3E';
const ACCENT_SOFT = '#2A2117';

export function SplashScreen() {
  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: CANVAS_BG }}>
      <Animated.View
        entering={FadeIn.duration(420)}
        className="items-center gap-6">
        <View
          className="h-24 w-24 items-center justify-center rounded-[28px]"
          style={{
            backgroundColor: ACCENT_SOFT,
            borderCurve: 'continuous',
          }}>
          <View
            className="h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] bg-white"
            style={{ borderCurve: 'continuous' }}>
            <Image
              source={CONNECTX_LOGO}
              style={{ width: 44, height: 44 }}
              contentFit="contain"
            />
          </View>
        </View>
        <Animated.View entering={FadeInDown.delay(120).duration(360)}>
          <AppText
            variant="hero"
            align="center"
            className="text-[32px] leading-[38px] text-white">
            ConnectX
          </AppText>
        </Animated.View>
      </Animated.View>
      <View className="absolute bottom-16">
        <ActivityIndicator color={ACCENT} />
      </View>
    </View>
  );
}
