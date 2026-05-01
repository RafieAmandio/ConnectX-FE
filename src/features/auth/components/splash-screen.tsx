import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Colors } from '@shared/theme';

const CONNECTX_LOGO = require('../../../../assets/images/logo_splash.png');

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
        <Image
          source={CONNECTX_LOGO}
          style={{ height: 74, width: 222 }}
          contentFit="contain"
        />
      </Animated.View>
      {showLoader ? (
        <View className="absolute bottom-16">
          <ActivityIndicator color={Colors.dark.accent} />
        </View>
      ) : null}
    </View>
  );
}
