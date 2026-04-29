import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText } from '@shared/components';
import { Colors } from '@shared/theme';

const CONNECTX_LOGO = require('../../../../assets/images/connectx-logo.png');

type SplashScreenProps = {
  showLoader?: boolean;
};

export function SplashScreen({ showLoader = true }: SplashScreenProps) {
  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: Colors.dark.canvas }}>
      <Animated.View
        entering={FadeIn.duration(420)}
        className="items-center gap-6">
        <View
          className="h-24 w-24 items-center justify-center rounded-[28px]"
          style={{
            backgroundColor: Colors.dark.accentTint,
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
            Connectx
          </AppText>
        </Animated.View>
      </Animated.View>
      {showLoader ? (
        <View className="absolute bottom-16">
          <ActivityIndicator color={Colors.dark.accent} />
        </View>
      ) : null}
    </View>
  );
}
