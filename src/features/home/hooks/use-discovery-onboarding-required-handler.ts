import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import {
  getDiscoveryOnboardingRequiredMessage,
  getStartupProfileRequiredMessage,
  isDiscoveryOnboardingRequiredError,
  isStartupProfileRequiredError,
} from '../services/discovery-contract';

export function useDiscoveryOnboardingRequiredHandler() {
  const router = useRouter();
  const isPresentingRef = React.useRef(false);

  return React.useCallback(
    (error: unknown) => {
      const isOnboardingRequired = isDiscoveryOnboardingRequiredError(error);
      const isStartupProfileRequired = isStartupProfileRequiredError(error);

      if (!isOnboardingRequired && !isStartupProfileRequired) {
        return false;
      }

      if (isPresentingRef.current) {
        return true;
      }

      isPresentingRef.current = true;
      Alert.alert(
        'Onboarding required',
        isStartupProfileRequired
          ? getStartupProfileRequiredMessage(error)
          : getDiscoveryOnboardingRequiredMessage(error),
        [
          {
            onPress: () => {
              isPresentingRef.current = false;
              router.push('/onboarding?mode=post_auth' as never);
            },
            text: 'OK',
          },
        ],
        { cancelable: false }
      );

      return true;
    },
    [router]
  );
}
