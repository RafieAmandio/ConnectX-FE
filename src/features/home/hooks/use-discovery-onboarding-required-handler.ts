import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import {
  getDiscoveryOnboardingRequiredMessage,
  isDiscoveryOnboardingRequiredError,
} from '../services/discovery-contract';

export function useDiscoveryOnboardingRequiredHandler() {
  const router = useRouter();
  const isPresentingRef = React.useRef(false);

  return React.useCallback(
    (error: unknown) => {
      if (!isDiscoveryOnboardingRequiredError(error)) {
        return false;
      }

      if (isPresentingRef.current) {
        return true;
      }

      isPresentingRef.current = true;
      Alert.alert(
        'Onboarding required',
        getDiscoveryOnboardingRequiredMessage(error),
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
