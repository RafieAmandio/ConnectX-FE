import { AntDesign, Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@shared/components';

const CANVAS_BG = '#212121';

function getRedirectTarget(redirectTo?: string | string[]) {
  const target = Array.isArray(redirectTo) ? redirectTo[0] : redirectTo;

  if (target === '/login') {
    return '/login' as const;
  }

  return '/(tabs)' as const;
}

export default function OnboardingCompleteRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirectTo?: string }>();
  const insets = useSafeAreaInsets();
  const redirectTarget = getRedirectTarget(params.redirectTo);

  return (
    <View
      className="flex-1 items-center justify-center px-6"
      style={{
        backgroundColor: CANVAS_BG,
        paddingBottom: Math.max(insets.bottom, 24),
        paddingTop: Math.max(insets.top, 24),
      }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="w-full max-w-[360px] items-center">
        <View
          className="h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: '#3A2A1D' }}>
          <AntDesign color="#FF9A3E" name="check" size={36} />
        </View>

        <View className="mt-7 items-center gap-3">
          <AppText
            align="center"
            variant="title"
            className="text-[26px] leading-[32px] text-white">
            {"You're all set! 🎉"}
          </AppText>
          <AppText
            align="center"
            className="max-w-[320px] text-[15px] leading-[22px] text-text-muted">
            Your founder profile is ready. Start discovering the right people to build with.
          </AppText>
        </View>

        <Pressable
          className="mt-8 min-h-[48px] flex-row items-center justify-center gap-3 rounded-[10px] px-6"
          style={{ backgroundColor: '#FF9A3E' }}
          onPress={() => router.replace(redirectTarget)}>
          <Feather color="#1A1208" name="navigation" size={17} />
          <AppText variant="bodyStrong" className="text-[16px] text-[#1A1208]">
            Start Exploring
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
