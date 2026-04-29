import { Image } from 'expo-image';
import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppText } from '@shared/components';
import { Colors } from '@shared/theme';

import { useAuth } from '../hooks/use-auth';
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { SplashScreen } from './splash-screen';

const ACCENT = '#FF9A3E';
const ONBOARDING_IMAGE = require('../../../../assets/images/onboarding.png');
let hasShownManualWelcomeSplash = false;

export function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { authPhase, isHydrated, session } = useAuth();
  const [isManualSplashVisible, setIsManualSplashVisible] = React.useState(
    () => !hasShownManualWelcomeSplash
  );

  React.useEffect(() => {
    if (!isManualSplashVisible) {
      return;
    }

    const timer = setTimeout(() => {
      hasShownManualWelcomeSplash = true;
      setIsManualSplashVisible(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [isManualSplashVisible]);

  if (!isHydrated) {
    return <SplashScreen />;
  }

  if (isManualSplashVisible) {
    return <SplashScreen showLoader={false} />;
  }

  if (session || authPhase !== 'signed_out') {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.dark.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          paddingBottom: Math.max(insets.bottom + 24, 40),
          paddingHorizontal: 24,
          paddingTop: Math.max(insets.top + 48, 88),
        }}>

        <Animated.View
          entering={FadeInDown.delay(90).duration(420)}
          className="items-center gap-8 py-10">
          <Image
            source={ONBOARDING_IMAGE}
            style={{
              width: '100%',
              maxWidth: 320,
              maxHeight: 320,
              aspectRatio: 1,
            }}
            contentFit="contain"
          />

          <View className="items-center gap-3">
            <AppText
              align="center"
              variant="hero"
              className="text-[34px] leading-[40px] text-white">
              Welcome to Connectx
            </AppText>
            <AppText
              align="center"
              className="max-w-[330px] text-[17px] leading-[26px]"
              style={{ color: Colors.dark.textMuted }}>
              Build your startup with co-founders, early teams, and driven builders all in one place.
            </AppText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).duration(420)} className="gap-3">
          <AppButton
            label="Next"
            size="lg"
            onPress={() => router.replace('/get-started')}
            style={{ backgroundColor: ACCENT }}
          />
          <AppText
            align="center"
            className="px-4 text-[13px] leading-[19px]"
            style={{ color: Colors.dark.textSoft }}>
            Mentors, investors, and partners coming soon.
          </AppText>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
