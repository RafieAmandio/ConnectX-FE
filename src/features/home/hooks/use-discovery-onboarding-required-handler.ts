import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import { ApiError } from '@shared/services/api';

import {
  getDiscoveryOnboardingRequiredMessage,
  getStartupProfileRequiredMessage,
  isDiscoveryOnboardingRequiredError,
  isStartupProfileRequiredError,
} from '../services/discovery-contract';

function summarizeOnboardingRequiredError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      payload: error.payload,
      status: error.status,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'Unknown error',
    payload: null,
    status: null,
  };
}

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
        console.log('[DiscoveryOnboardingRequired] alert already presenting', summarizeOnboardingRequiredError(error));
        return true;
      }

      isPresentingRef.current = true;
      console.log('[DiscoveryOnboardingRequired] presenting alert', {
        isOnboardingRequired,
        isStartupProfileRequired,
        error: summarizeOnboardingRequiredError(error),
      });
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
