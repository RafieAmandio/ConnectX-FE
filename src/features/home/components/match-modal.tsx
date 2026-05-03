import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  ZoomIn,
  ZoomOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@shared/components';

import type { DiscoveryCard } from '../types/discovery.types';
import { isDiscoveryProfileCard } from '../types/discovery.types';

const connectxLogo = require('../../../../assets/images/connectx-logo.png');

type MatchModalProps = {
  card: DiscoveryCard | null;
  onChat: () => void;
  onClose: () => void;
};

const SPARK_ANGLES = [0, 60, 120, 180, 240, 300] as const;

type SignalDotProps = {
  color: string;
  delay?: number;
  maxOpacity?: number;
  midX: number;
  shadowColor?: string;
  size: number;
  startX: number;
};

function SignalDot({
  color,
  delay = 0,
  maxOpacity = 1,
  midX,
  shadowColor,
  size,
  startX,
}: SignalDotProps) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 700 }));
  }, [delay, progress]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, maxOpacity, 0]),
    transform: [
      { translateX: interpolate(progress.value, [0, 0.5, 1], [startX, midX, 0]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [0, 1, 0.3]) },
    ],
  }));

  return (
    <Animated.View
      className="absolute rounded-full"
      style={[
        {
          backgroundColor: color,
          height: size,
          width: size,
          ...(shadowColor ? { boxShadow: `0 0 14px ${shadowColor}` } : null),
        },
        dotStyle,
      ]}
    />
  );
}

function getMatchSubject(card: DiscoveryCard) {
  return card.name;
}

function getMatchCopy(card: DiscoveryCard) {
  if (!isDiscoveryProfileCard(card)) {
    return `You and ${card.name} are now connected for`;
  }

  const focus = card.interests[0]?.name || card.startupIdea || card.headline || 'startup';
  return `You and ${card.name} both want to build ${focus.toLowerCase()} startups.`;
}

function getStartupRole(card: DiscoveryCard) {
  if (isDiscoveryProfileCard(card)) {
    return null;
  }

  return card.openRoles[0]?.title ?? card.lookingFor[0] ?? 'Co-Founder';
}

export function MatchModal({ card, onChat, onClose }: MatchModalProps) {
  if (!card) {
    return null;
  }

  const isProfileMatch = isDiscoveryProfileCard(card);
  const startupRole = getStartupRole(card);

  return (
    <Animated.View
      className="absolute inset-0 z-50 items-center justify-center px-4"
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      pointerEvents="auto"
      style={{ backgroundColor: 'rgba(10, 10, 10, 0.72)' }}>
      <Pressable className="absolute inset-0" onPress={onClose} />

      <Animated.View
        entering={ZoomIn.duration(360).springify().damping(15).stiffness(140)}
        exiting={ZoomOut.duration(180)}
        className="relative w-full max-w-[374px] overflow-hidden rounded-[14px] border px-6 pb-8 pt-8"
        style={{
          backgroundColor: '#282725',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          boxShadow: '0 22px 54px rgba(0, 0, 0, 0.5)',
        }}>
        <View
          className="absolute inset-0"
          pointerEvents="none"
          style={{
            backgroundColor: 'rgba(255, 154, 62, 0.06)',
          }}
        />

        <Pressable
          accessibilityLabel="Close match modal"
          className="absolute right-3 top-3 z-20 h-10 w-10 items-center justify-center rounded-full"
          onPress={onClose}
          style={{ backgroundColor: 'transparent' }}>
          <Ionicons color="#9A9A9A" name="close" size={22} />
        </Pressable>

        <View className="relative h-[130px] items-center justify-center">
          <SignalDot
            color="#FF9A3E"
            midX={-30}
            shadowColor="rgba(255, 154, 62, 0.72)"
            size={20}
            startX={-70}
          />
          <SignalDot
            color="rgba(255, 154, 62, 0.42)"
            delay={80}
            maxOpacity={0.55}
            midX={-20}
            size={12}
            startX={-55}
          />
          <SignalDot
            color="#FFCD38"
            midX={30}
            shadowColor="rgba(255, 205, 56, 0.72)"
            size={20}
            startX={70}
          />
          <SignalDot
            color="rgba(255, 205, 56, 0.42)"
            delay={80}
            maxOpacity={0.55}
            midX={20}
            size={12}
            startX={55}
          />

          <Animated.View
            entering={ZoomIn.duration(340).delay(420)}
            className="absolute h-20 w-20 rounded-full"
            style={{
              backgroundColor: 'rgba(255, 154, 62, 0.16)',
              boxShadow: '0 0 30px rgba(255, 154, 62, 0.36)',
            }}
          />
          <Animated.View
            entering={ZoomIn.duration(420).delay(470)}
            className="absolute h-16 w-16 rounded-full border"
            style={{ borderColor: 'rgba(255, 205, 56, 0.32)' }}
          />

          <Animated.View
            entering={ZoomIn.duration(420).delay(520).springify()}
            className="relative z-10 h-[72px] w-[72px] items-center justify-center rounded-[16px]"
            style={{
              backgroundColor: '#FFFFFF',
              borderCurve: 'continuous',
              boxShadow: '0 0 34px rgba(255, 154, 62, 0.56)',
            }}>
            <Image
              accessibilityLabel="ConnectX"
              contentFit="contain"
              style={{ height: 54, width: 54 }}
              source={connectxLogo}
            />
          </Animated.View>

          {SPARK_ANGLES.map((angle, index) => {
            const radians = (angle * Math.PI) / 180;
            const distance = 42 + (index % 2) * 10;

            return (
              <Animated.View
                key={angle}
                entering={ZoomIn.duration(220).delay(640 + index * 35)}
                exiting={FadeOut.duration(80)}
                className="absolute h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: index % 2 === 0 ? '#FF9A3E' : '#FFCD38',
                  transform: [
                    { translateX: Math.cos(radians) * distance },
                    { translateY: Math.sin(radians) * distance },
                  ],
                }}
              />
            );
          })}
        </View>

        <Animated.View entering={FadeInUp.duration(280).delay(760)} className="items-center gap-2">
          {isProfileMatch ? (
            <>
              <AppText align="center" className="text-[24px] leading-[30px]" tone="signal" variant="hero">
                You&apos;re connected! 🎉
              </AppText>
              <AppText align="center" className="max-w-[300px] text-[14px] leading-5" tone="muted">
                {getMatchCopy(card)}
              </AppText>
            </>
          ) : (
            <>
              <AppText align="center" className="text-[24px] leading-[30px]" tone="signal" variant="hero">
                Connection started! 🚀
              </AppText>
              <AppText align="center" className="text-[15px] leading-5" variant="bodyStrong">
                {card.name}
              </AppText>
              <AppText align="center" className="text-[13px] leading-[18px]" tone="muted">
                Founded by {card.founder.name}
              </AppText>
              <AppText align="center" className="max-w-[310px] text-[13px] leading-[18px]" tone="muted">
                {getMatchCopy(card)}{' '}
                <AppText className="text-[13px] leading-[18px]" tone="signal" variant="bodyStrong">
                  {startupRole}
                </AppText>
              </AppText>
            </>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(260).delay(900)} className="mt-6 flex-row gap-3">
          {isProfileMatch ? (
            <>
              <Pressable
                accessibilityLabel={`Start chat with ${getMatchSubject(card)}`}
                className="min-h-10 flex-1 flex-row items-center justify-center gap-2 rounded-[10px]"
                onPress={onChat}
                style={{ backgroundColor: '#FF9836' }}>
                <Ionicons color="#1A120B" name="chatbubble-outline" size={16} />
                <AppText style={{ color: '#1A120B' }} variant="bodyStrong">
                  Start Chat
                </AppText>
              </Pressable>

              <Pressable
                accessibilityLabel={`View match report for ${getMatchSubject(card)}`}
                className="min-h-10 flex-1 flex-row items-center justify-center gap-2 rounded-[10px] border"
                onPress={() => { }}
                style={{ backgroundColor: '#22211F', borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                <Ionicons color="#E3E3E3" name="bar-chart-outline" size={16} />
                <AppText className="text-[#E3E3E3]" variant="bodyStrong">
                  View Report
                </AppText>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityLabel={`Chat with co-founder of ${getMatchSubject(card)}`}
              className="min-h-10 flex-1 flex-row items-center justify-center gap-2 rounded-[10px]"
              onPress={onChat}
              style={{ backgroundColor: '#FF9836' }}>
              <Ionicons color="#1A120B" name="chatbubble-outline" size={16} />
              <AppText style={{ color: '#1A120B' }} variant="bodyStrong">
                Chat with Co-Founder
              </AppText>
            </Pressable>
          )}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
