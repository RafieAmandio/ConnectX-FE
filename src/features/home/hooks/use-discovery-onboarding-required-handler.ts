import { useRouter } from 'expo-router';
import React from 'react';

import { ApiError } from '@shared/services/api';

import type { DiscoveryOnboardingRequiredSheetProps } from '../components/discovery-onboarding-required-sheet';
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
  const [message, setMessage] = React.useState<string | null>(null);

  const handleOnboardingRequired = React.useCallback(
    (error: unknown) => {
      const isOnboardingRequired = isDiscoveryOnboardingRequiredError(error);
      const isStartupProfileRequired = isStartupProfileRequiredError(error);

      if (!isOnboardingRequired && !isStartupProfileRequired) {
        return false;
      }

      if (isPresentingRef.current) {
        console.log('[DiscoveryOnboardingRequired] sheet already presenting', summarizeOnboardingRequiredError(error));
        return true;
      }

      isPresentingRef.current = true;
      console.log('[DiscoveryOnboardingRequired] presenting sheet', {
        isOnboardingRequired,
        isStartupProfileRequired,
        error: summarizeOnboardingRequiredError(error),
      });
      setMessage(
        isStartupProfileRequired
          ? getStartupProfileRequiredMessage(error)
          : getDiscoveryOnboardingRequiredMessage(error)
      );

      return true;
    },
    []
  );

  const handleContinue = React.useCallback(() => {
    isPresentingRef.current = false;
    setMessage(null);
    router.push('/onboarding?mode=post_auth' as never);
  }, [router]);

  const onboardingRequiredSheetProps: DiscoveryOnboardingRequiredSheetProps = {
    message,
    onContinue: handleContinue,
    visible: Boolean(message),
  };

  return {
    handleOnboardingRequired,
    onboardingRequiredSheetProps,
  };
}
