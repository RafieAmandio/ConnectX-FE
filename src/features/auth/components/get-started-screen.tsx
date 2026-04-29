import { Image } from 'expo-image';
import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@shared/components';
import { Colors } from '@shared/theme';

import { useAuth } from '../hooks/use-auth';
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { SplashScreen } from './splash-screen';

const ACCENT = '#FF9A3E';
const HOME_BACKGROUND = '#262626';
const CONNECTX_LOGO = require('../../../../assets/images/connectx-logo.png');

export function GetStartedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { authPhase, isHydrated, session } = useAuth();

  if (!isHydrated) {
    return <SplashScreen />;
  }

  if (session || authPhase !== 'signed_out') {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: HOME_BACKGROUND }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingBottom: Math.max(insets.bottom + 48, 72),
          paddingHorizontal: 18,
          paddingTop: Math.max(insets.top + 48, 72),
        }}>
        <View className="items-center">
          <Animated.View
            entering={FadeInDown.delay(80).duration(420)}
            className="items-center justify-center"
            style={{
              backgroundColor: 'rgba(255, 154, 62, 0.16)',
              borderCurve: 'continuous',
              borderRadius: 24,
              height: 80,
              width: 80,
            }}>
            <View
              className="items-center justify-center overflow-hidden bg-white"
              style={{
                borderCurve: 'continuous',
                borderRadius: 12,
                height: 48,
                width: 48,
              }}>
              <Image
                source={CONNECTX_LOGO}
                style={{ height: 34, width: 34 }}
                contentFit="contain"
              />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(160).duration(420)}
            className="mt-7 items-center gap-4">
            <AppText
              align="center"
              variant="title"
              className="max-w-[270px] text-[24px] leading-[32px] text-white">
              Find the right people to build with
            </AppText>
            <AppText
              align="center"
              className="max-w-[315px] text-[15px] leading-[22px]"
              style={{ color: Colors.dark.textMuted }}>
              ConnectX matches you with co-founders, teammates, and startups based on skills,
              goals, and compatibility.
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(240).duration(420)} className="mt-9">
            <Pressable
              android_ripple={{ color: 'rgba(0, 0, 0, 0.12)' }}
              className="flex-row items-center justify-center gap-4 rounded-[10px] px-5"
              onPress={() => router.replace('/login')}
              style={{
                backgroundColor: ACCENT,
                borderCurve: 'continuous',
                height: 48,
                minWidth: 151,
              }}>
              <AppText className="text-[16px] font-bold leading-[20px] text-[#111111]">
                Get Started
              </AppText>
              <AppText className="text-[22px] font-semibold leading-[24px] text-[#111111]">
                →
              </AppText>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
