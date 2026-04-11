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

import { AppButton, AppCard, AppPill, AppText } from '@shared/components';
import { Shadows } from '@shared/theme';
import { useRevenueCat } from '@features/revenuecat';

import type { SwipeMatch } from '../types/matches.types';

type SwipeDirection = 'left' | 'right';

type SwipeDeckProps = {
  items: readonly SwipeMatch[];
};

const SWIPE_THRESHOLD = 120;
const FREE_SWIPE_LIMIT = 5;

function triggerSwipeHaptic(direction: SwipeDirection) {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.impactAsync(
      direction === 'right' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
  }
}

export function SwipeDeck({ items }: SwipeDeckProps) {
  const { isConnectXProActive, presentPaywallIfNeeded } = useRevenueCat();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isOpeningPaywall, setIsOpeningPaywall] = React.useState(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const nextCardScale = useSharedValue(0.96);

  const currentItem = items[activeIndex];
  const nextItem = items[activeIndex + 1];
  const swipeLimitReached = !isConnectXProActive && activeIndex >= FREE_SWIPE_LIMIT;
  const freeSwipesRemaining = isConnectXProActive
    ? null
    : Math.max(FREE_SWIPE_LIMIT - activeIndex, 0);

  const resetCardPosition = React.useCallback(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    nextCardScale.value = withSpring(0.96);
  }, [nextCardScale, translateX, translateY]);

  const resetDeck = React.useCallback(() => {
    setActiveIndex(0);
    translateX.value = 0;
    translateY.value = 0;
    nextCardScale.value = 0.96;
  }, [nextCardScale, translateX, translateY]);

  const openUpgrade = React.useCallback(async () => {
    if (isConnectXProActive || isOpeningPaywall) {
      return;
    }

    setIsOpeningPaywall(true);

    try {
      await presentPaywallIfNeeded();
    } finally {
      setIsOpeningPaywall(false);
      resetCardPosition();
    }
  }, [isConnectXProActive, isOpeningPaywall, presentPaywallIfNeeded, resetCardPosition]);

  const commitSwipe = React.useCallback(
    (direction: SwipeDirection) => {
      if (swipeLimitReached) {
        void openUpgrade();
        resetCardPosition();
        return;
      }

      triggerSwipeHaptic(direction);
      setActiveIndex((index) => Math.min(index + 1, items.length));
      translateX.value = 0;
      translateY.value = 0;
      nextCardScale.value = 0.96;
    },
    [items.length, nextCardScale, openUpgrade, resetCardPosition, swipeLimitReached, translateX, translateY]
  );

  const forceSwipe = React.useCallback(
    (direction: SwipeDirection) => {
      if (swipeLimitReached) {
        void openUpgrade();
        resetCardPosition();
        return;
      }

      const destination = direction === 'right' ? width : -width;

      translateX.value = withTiming(destination * 1.25, { duration: 220 }, (finished) => {
        if (finished) {
          runOnJS(commitSwipe)(direction);
        }
      });
      translateY.value = withTiming(-18, { duration: 220 });
      nextCardScale.value = withTiming(1, { duration: 220 });
    },
    [commitSwipe, nextCardScale, openUpgrade, resetCardPosition, swipeLimitReached, translateX, translateY, width]
  );

  const panGesture = Gesture.Pan()
    .enabled(!swipeLimitReached)
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
        <View className="gap-2">
          <AppPill
            className="self-start"
            label={isConnectXProActive ? 'Pro Active' : 'Free Mode'}
            tone={isConnectXProActive ? 'success' : 'neutral'}
          />
          <AppText tone="muted">
            {isConnectXProActive
              ? 'Unlimited swipes enabled.'
              : `Free swipe cap: ${FREE_SWIPE_LIMIT} per reset.`}
          </AppText>
        </View>

        <View
          className="rounded-[24px] border border-border bg-surface p-5"
          style={Shadows.card}>
          <AppText variant="title">You cleared the pipeline.</AppText>
          <AppText className="mt-2" tone="muted">
            Fresh candidates can repopulate this queue as new high-fit profiles arrive.
          </AppText>
        </View>

        <AppButton
          detail="Rewind the mock stack and swipe again"
          label="Reset Cards"
          onPress={resetDeck}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <View className="gap-5">
      <AppCard tone={isConnectXProActive ? 'success' : swipeLimitReached ? 'signal' : 'muted'} className="gap-2">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-1">
            <AppText variant="subtitle">
              {isConnectXProActive ? 'ConnectX Pro active' : 'Free swipe mode'}
            </AppText>
            <AppText tone="muted">
              {isConnectXProActive
                ? 'Unlimited swipes are unlocked for this account.'
                : swipeLimitReached
                  ? 'You hit the 5-swipe free limit. Upgrade for unlimited access or reset the demo deck.'
                  : `${freeSwipesRemaining} of ${FREE_SWIPE_LIMIT} free swipes remaining.`}
            </AppText>
          </View>

          <AppPill
            label={isConnectXProActive ? 'Unlimited' : swipeLimitReached ? 'Locked' : 'Limited'}
            tone={isConnectXProActive ? 'success' : swipeLimitReached ? 'signal' : 'neutral'}
          />
        </View>
      </AppCard>

      <View className="min-h-[510px] justify-start">
        {nextItem ? (
          <Animated.View
            className="absolute inset-x-3 top-4 rounded-[24px] border border-border bg-background p-5"
            style={[Shadows.card, nextCardStyle]}>
            <AppPill className="self-start" label="Up Next" tone="neutral" />
            <AppText className="mt-4" variant="title">
              {nextItem.name}
            </AppText>
            <AppText className="mt-1" tone="muted">
              {nextItem.role}
            </AppText>
            <AppText className="mt-4" tone="muted">
              {nextItem.bio}
            </AppText>
          </Animated.View>
        ) : null}

        <GestureDetector gesture={panGesture}>
          <Animated.View
            className="absolute inset-x-0 top-0 rounded-[28px] border border-border bg-surface p-5"
            style={[Shadows.card, topCardStyle]}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-2">
                <AppPill
                  className="self-start"
                  label={currentItem.status}
                  tone={
                    currentItem.status === 'Ready to chat'
                      ? 'success'
                      : currentItem.status === 'Needs review'
                        ? 'signal'
                        : 'accent'
                  }
                />
                <AppText className="mt-2" variant="hero">
                  {currentItem.name}
                </AppText>
                <AppText tone="muted" variant="subtitle">
                  {currentItem.role}
                </AppText>
              </View>
              <View className="items-end rounded-[18px] border border-accent/20 bg-accent-tint px-4 py-3">
                <AppText tone="muted" variant="label">
                  Fit Score
                </AppText>
                <AppText variant="title">
                  {currentItem.score}
                </AppText>
              </View>
            </View>

            <View className="mt-6 gap-4">
              <View className="rounded-[20px] border border-border bg-background p-4">
                <AppText tone="muted" variant="label">
                  Assessment
                </AppText>
                <AppText className="mt-2" tone="muted">
                  {currentItem.bio}
                </AppText>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 rounded-[20px] border border-border bg-background p-4">
                  <AppText tone="muted" variant="label">
                    Status
                  </AppText>
                  <AppText className="mt-1" tone="muted">
                    {currentItem.status}
                  </AppText>
                </View>
                <View className="flex-1 rounded-[20px] border border-border bg-background p-4">
                  <AppText tone="muted" variant="label">
                    Next Move
                  </AppText>
                  <AppText className="mt-1" tone="muted">
                    Advance when the fit is strong and timing is right.
                  </AppText>
                </View>
              </View>
            </View>

            <Animated.View
              className="absolute left-5 top-6 rounded-full border border-signal bg-signal-tint px-4 py-2"
              style={leftBadgeStyle}>
              <AppText tone="signal" variant="label">
                Pass
              </AppText>
            </Animated.View>

            <Animated.View
              className="absolute right-5 top-6 rounded-full border border-accent bg-accent-tint px-4 py-2"
              style={rightBadgeStyle}>
              <AppText tone="accent" variant="label">
                Advance
              </AppText>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View className="flex-row items-center justify-center gap-3">
        <Pressable
          android_ripple={{ color: 'rgba(229,125,87,0.16)', borderless: false }}
          className="h-14 flex-1 items-center justify-center rounded-[16px] border border-border-strong bg-background"
          disabled={swipeLimitReached}
          onPress={() => {
            forceSwipe('left');
          }}>
          <AppText tone="muted" variant="bodyStrong">
            Pass
          </AppText>
        </Pressable>

        <Pressable
          android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: false }}
          className="h-14 flex-1 items-center justify-center rounded-[16px] bg-accent"
          disabled={swipeLimitReached}
          onPress={() => {
            forceSwipe('right');
          }}
          style={Shadows.floating}>
          <AppText tone="inverse" variant="bodyStrong">
            Advance
          </AppText>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-center gap-3">
        <AppButton
          className="flex-1"
          detail="Reset the mock deck and swipe counter"
          label="Reset Cards"
          onPress={resetDeck}
          variant="secondary"
        />

        {!isConnectXProActive ? (
          <AppButton
            className="flex-1"
            detail="Open the Pro paywall for unlimited swipes"
            label={isOpeningPaywall ? 'Opening...' : 'Unlock Pro'}
            onPress={() => {
              void openUpgrade();
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
