import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppPill, AppText } from '@shared/components';
import { Shadows } from '@shared/theme';

import type { SwipeMatch } from '../types/matches.types';

type SwipeDirection = 'left' | 'right';

type SwipeDeckProps = {
  items: readonly SwipeMatch[];
};

const SWIPE_THRESHOLD = 120;

function triggerSwipeHaptic(direction: SwipeDirection) {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.impactAsync(
      direction === 'right' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
  }
}

export function SwipeDeck({ items }: SwipeDeckProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const nextCardScale = useSharedValue(0.96);

  const currentItem = items[activeIndex];
  const nextItem = items[activeIndex + 1];

  const resetCardPosition = React.useCallback(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    nextCardScale.value = withSpring(0.96);
  }, [nextCardScale, translateX, translateY]);

  const commitSwipe = React.useCallback(
    (direction: SwipeDirection) => {
      triggerSwipeHaptic(direction);
      setActiveIndex((index) => Math.min(index + 1, items.length));
      translateX.value = 0;
      translateY.value = 0;
      nextCardScale.value = 0.96;
    },
    [items.length, nextCardScale, translateX, translateY]
  );

  const forceSwipe = React.useCallback(
    (direction: SwipeDirection) => {
      const destination = direction === 'right' ? width : -width;

      translateX.value = withTiming(destination * 1.25, { duration: 220 }, (finished) => {
        if (finished) {
          runOnJS(commitSwipe)(direction);
        }
      });
      translateY.value = withTiming(-18, { duration: 220 });
      nextCardScale.value = withTiming(1, { duration: 220 });
    },
    [commitSwipe, nextCardScale, translateX, translateY, width]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.18;
      nextCardScale.value = interpolate(
        Math.abs(event.translationX),
        [0, SWIPE_THRESHOLD * 1.6],
        [0.96, 1]
      );
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        const destination = width * 1.2;
        translateX.value = withTiming(destination, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(commitSwipe)('right');
          }
        });
        translateY.value = withTiming(event.translationY * 0.2, { duration: 220 });
        nextCardScale.value = withTiming(1, { duration: 220 });
        return;
      }

      if (event.translationX < -SWIPE_THRESHOLD) {
        const destination = width * -1.2;
        translateX.value = withTiming(destination, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(commitSwipe)('left');
          }
        });
        translateY.value = withTiming(event.translationY * 0.2, { duration: 220 });
        nextCardScale.value = withTiming(1, { duration: 220 });
        return;
      }

      runOnJS(resetCardPosition)();
    });

  const topCardStyle = useAnimatedStyle(() => {
    const rotate = `${interpolate(translateX.value, [-width, 0, width], [-14, 0, 14])}deg`;

    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { rotate }],
    };
  });

  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextCardScale.value }],
  }));

  const leftBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -36, 0], [1, 0.3, 0]),
    transform: [{ scale: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0.8]) }],
  }));

  const rightBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 36, SWIPE_THRESHOLD], [0, 0.3, 1]),
    transform: [{ scale: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.8, 1]) }],
  }));

  if (!currentItem) {
    return (
      <View className="gap-4">
        <View
          className="rounded-[32px] border border-border bg-surface-raised p-6"
          style={Shadows.card}>
          <AppText variant="hero">You cleared the deck.</AppText>
          <AppText className="mt-2" tone="muted">
            New mock profiles can drop here later from React Query once the backend is ready.
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <View className="min-h-[510px] justify-start">
        {nextItem ? (
          <Animated.View
            className="absolute inset-x-2 top-4 rounded-[32px] border border-border bg-surface p-6"
            style={[Shadows.card, nextCardStyle]}>
            <AppPill className="self-start" label="Up Next" tone="neutral" />
            <AppText className="mt-5" variant="title">
              {nextItem.name}
            </AppText>
            <AppText className="mt-1" tone="muted">
              {nextItem.role}
            </AppText>
            <AppText className="mt-5" tone="muted">
              {nextItem.bio}
            </AppText>
          </Animated.View>
        ) : null}

        <GestureDetector gesture={panGesture}>
          <Animated.View
            className="absolute inset-x-0 top-0 rounded-[36px] border border-border bg-surface-raised p-6"
            style={[Shadows.card, topCardStyle]}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <AppPill className="self-start" label={currentItem.status} tone="accent" />
                <AppText className="mt-4" variant="display">
                  {currentItem.name}
                </AppText>
                <AppText tone="muted" variant="subtitle">
                  {currentItem.role}
                </AppText>
              </View>
              <View className="rounded-[24px] bg-accent-tint px-4 py-3">
                <AppText tone="accent" variant="label">
                  Fit
                </AppText>
                <AppText tone="accent" variant="title">
                  {currentItem.score}
                </AppText>
              </View>
            </View>

            <View className="mt-8 gap-4">
              <View className="rounded-[28px] border border-border bg-canvas/70 p-4">
                <AppText variant="subtitle">Why this profile stands out</AppText>
                <AppText className="mt-2" tone="muted">
                  {currentItem.bio}
                </AppText>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 rounded-[24px] border border-border bg-background p-4">
                  <AppText tone="signal" variant="label">
                    Pass
                  </AppText>
                  <AppText className="mt-1" tone="muted">
                    Swipe left if this one is not the right fit today.
                  </AppText>
                </View>
                <View className="flex-1 rounded-[24px] border border-border bg-background p-4">
                  <AppText tone="accent" variant="label">
                    Like
                  </AppText>
                  <AppText className="mt-1" tone="muted">
                    Swipe right when you want to open the path forward.
                  </AppText>
                </View>
              </View>
            </View>

            <Animated.View
              className="absolute left-6 top-8 rounded-full border border-signal bg-signal-tint px-4 py-2"
              style={leftBadgeStyle}>
              <AppText tone="signal" variant="label">
                Pass
              </AppText>
            </Animated.View>

            <Animated.View
              className="absolute right-6 top-8 rounded-full border border-accent bg-accent-tint px-4 py-2"
              style={rightBadgeStyle}>
              <AppText tone="accent" variant="label">
                Like
              </AppText>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View className="flex-row items-center justify-center gap-5">
        <Pressable
          android_ripple={{ color: 'rgba(229,125,87,0.16)', borderless: false }}
          className="h-16 w-16 items-center justify-center rounded-full border border-signal bg-signal-tint"
          onPress={() => {
            forceSwipe('left');
          }}>
          <AppText tone="signal" variant="title">
            X
          </AppText>
        </Pressable>

        <Pressable
          android_ripple={{ color: 'rgba(18,126,116,0.16)', borderless: false }}
          className="h-20 w-20 items-center justify-center rounded-full bg-accent"
          onPress={() => {
            forceSwipe('right');
          }}
          style={Shadows.floating}>
          <AppText tone="inverse" variant="title">
            V
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
