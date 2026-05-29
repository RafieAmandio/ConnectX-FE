import React from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppCard } from '@shared/components';

const SURFACE_COLOR = '#2C2C2C';
const SURFACE_MUTED = '#252525';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';

function SkeletonCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AppCard
      className={className ?? 'gap-4 rounded-[24px] px-4 py-4'}
      style={{ backgroundColor: SURFACE_COLOR, borderColor: BORDER_COLOR }}
    >
      {children}
    </AppCard>
  );
}

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.ComponentProps<typeof Animated.View>['style'];
}) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 920 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.38, 0.82]),
  }));

  return (
    <Animated.View
      className={className}
      style={[{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }, animatedStyle, style]}
    />
  );
}

function SkeletonSectionHeader() {
  return (
    <View className="gap-3">
      <SkeletonBlock
        className="h-3 w-20 rounded-full"
        style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
      />
      <View className="flex-row items-center gap-3">
        <SkeletonBlock
          className="h-8 w-8 rounded-full"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.18)' }}
        />
        <View className="flex-1 gap-2">
          <SkeletonBlock className="h-5 w-[62%] rounded-full" />
          <SkeletonBlock className="h-3.5 w-[84%] rounded-full" />
        </View>
      </View>
    </View>
  );
}

function SkeletonPills() {
  return (
    <View className="flex-row flex-wrap gap-2">
      <SkeletonBlock className="h-8 w-28 rounded-full" />
      <SkeletonBlock className="h-8 w-24 rounded-full" />
      <SkeletonBlock className="h-8 w-32 rounded-full" />
    </View>
  );
}

export function ProfileSkeleton({
  refreshControl,
  shouldStackPanels,
}: {
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  shouldStackPanels: boolean;
}) {
  return (
    <ScrollView
      accessibilityLabel="Loading profile"
      className="flex-1"
      contentContainerClassName="gap-5 px-3.5 pt-3 pb-20"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={refreshControl}
    >
      <AppCard
        className="gap-4 rounded-[28px] px-4 py-4"
        style={{
          backgroundColor: '#2B2A28',
          borderColor: 'rgba(245, 158, 11, 0.18)',
        }}
      >
        <View className="flex-row items-center gap-4">
          <SkeletonBlock
            className="h-[76px] w-[76px] rounded-full"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.24)' }}
          />

          <View className="min-w-0 flex-1 gap-3">
            <View className="flex-row items-start gap-3">
              <View className="min-w-0 flex-1 gap-2">
                <SkeletonBlock className="h-7 w-[78%] rounded-full" />
                <SkeletonBlock className="h-4 w-[92%] rounded-full" />
              </View>
              <SkeletonBlock className="h-10 w-[74px] rounded-full" />
            </View>

            <View className="flex-row flex-wrap gap-2">
              <SkeletonBlock className="h-8 w-36 rounded-full" />
              <SkeletonBlock className="h-8 w-28 rounded-full" />
            </View>
          </View>
        </View>
      </AppCard>

      <SkeletonCard className="gap-4 rounded-[24px] px-4 py-4">
        <SkeletonSectionHeader />
        <View
          className="flex-row rounded-[20px] border"
          style={{ backgroundColor: SURFACE_MUTED, borderColor: BORDER_COLOR }}
        >
          {[0, 1, 2].map((item) => (
            <View key={item} className="flex-1 items-center gap-2 px-2 py-4">
              <SkeletonBlock className="h-8 w-12 rounded-full" />
              <SkeletonBlock className="h-3 w-20 rounded-full" />
            </View>
          ))}
        </View>
      </SkeletonCard>

      <SkeletonCard className="gap-5 rounded-[24px] px-4 py-4">
        <View className="flex-row items-start gap-3">
          <SkeletonBlock
            className="h-10 w-10 rounded-full"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.18)' }}
          />
          <View className="flex-1 gap-2">
            <View className="flex-row items-center gap-2">
              <SkeletonBlock className="h-3 w-16 rounded-full" />
              <SkeletonBlock
                className="h-6 w-20 rounded-full"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.18)' }}
              />
            </View>
            <SkeletonBlock className="h-5 w-[58%] rounded-full" />
            <SkeletonBlock className="h-4 w-[88%] rounded-full" />
          </View>
        </View>
        <View className="gap-2.5">
          <SkeletonBlock className="h-3 w-24 rounded-full" />
          <SkeletonPills />
        </View>
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonSectionHeader />
        <View className="gap-3">
          <SkeletonBlock className="h-4 w-full rounded-full" />
          <SkeletonBlock className="h-4 w-[94%] rounded-full" />
          <SkeletonBlock className="h-4 w-[72%] rounded-full" />
        </View>
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonSectionHeader />
        <SkeletonPills />
      </SkeletonCard>

      <View className={shouldStackPanels ? 'gap-3' : 'flex-row gap-3'}>
        {[0, 1].map((item) => (
          <SkeletonCard
            key={item}
            className="min-h-[170px] flex-1 gap-4 rounded-[24px] px-4 py-4"
          >
            <SkeletonSectionHeader />
            <View className="flex-row flex-wrap gap-2">
              <SkeletonBlock className="h-8 w-20 rounded-full" />
              <SkeletonBlock className="h-8 w-24 rounded-full" />
              <SkeletonBlock className="h-8 w-16 rounded-full" />
            </View>
          </SkeletonCard>
        ))}
      </View>

      <SkeletonCard>
        <SkeletonSectionHeader />
        <View className="gap-3">
          {[0, 1, 2].map((item) => (
            <View
              key={item}
              className="flex-row items-center gap-3 rounded-[18px] border px-3.5 py-3"
              style={{ backgroundColor: SURFACE_MUTED, borderColor: BORDER_COLOR }}
            >
              <SkeletonBlock
                className="h-9 w-9 rounded-full"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.18)' }}
              />
              <SkeletonBlock className="h-4 flex-1 rounded-full" />
            </View>
          ))}
        </View>
      </SkeletonCard>

      <View className="gap-3 px-1 pt-2">
        <SkeletonBlock className="h-3 w-16 rounded-full" />
        <SkeletonBlock className="h-[54px] rounded-[18px]" />
      </View>
    </ScrollView>
  );
}
