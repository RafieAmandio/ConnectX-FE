import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { SplashScreen, getRouteForAuthPhase, useAuth } from '@features/auth';

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return getSingleParam(value[0]);
  }

  return typeof value === 'string' ? value.trim() || null : null;
}

function parseBooleanParam(value: string | null) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

export default function LinkedInCallbackRoute() {
  const router = useRouter();
  const { authPhase, bootstrapLinkedInCallback, isHydrated, session } = useAuth();
  const params = useLocalSearchParams<{
    error?: string | string[];
    message?: string | string[];
    next_step?: string | string[];
    is_onboarded?: string | string[];
    supabase_token?: string | string[];
    token?: string | string[];
  }>();
  const hasHandledCallback = React.useRef(false);
  const callbackError = getSingleParam(params.error);
  const callbackMessage = getSingleParam(params.message);
  const callbackNextStep = getSingleParam(params.next_step);
  const callbackIsOnboarded = getSingleParam(params.is_onboarded);
  const callbackSupabaseToken = getSingleParam(params.supabase_token);
  const callbackToken = getSingleParam(params.token);

  React.useEffect(() => {
    if (!isHydrated || hasHandledCallback.current) {
      return;
    }

    if (session) {
      hasHandledCallback.current = true;
      router.replace(getRouteForAuthPhase(authPhase));
      return;
    }

    if (callbackError || callbackMessage) {
      hasHandledCallback.current = true;
      router.replace({
        pathname: '/login',
        params: {
          linkedin_error: callbackError ?? 'oauth_failed',
          linkedin_message: callbackMessage ?? 'LinkedIn sign-in failed. Please try again.',
        },
      });
      return;
    }

    if (
      callbackToken &&
      (callbackNextStep === 'LOGIN_SUCCESS' || callbackNextStep === 'NEED_WHATSAPP_VERIFICATION')
    ) {
      hasHandledCallback.current = true;

      void bootstrapLinkedInCallback({
        provider: 'linkedin',
        token: callbackToken,
        nextStep: callbackNextStep,
        isOnboarded: parseBooleanParam(callbackIsOnboarded),
        supabaseToken: callbackSupabaseToken,
      })
        .then((result) => {
          router.replace(getRouteForAuthPhase(result.session.authPhase));
        })
        .catch((error) => {
          router.replace({
            pathname: '/login',
            params: {
              linkedin_error: 'oauth_failed',
              linkedin_message:
                error instanceof Error
                  ? error.message
                  : 'LinkedIn sign-in failed. Please try again.',
            },
          });
        });

      return;
    }

    hasHandledCallback.current = true;
    router.replace({
      pathname: '/login',
      params: {
        linkedin_message: 'LinkedIn sign-in returned an unexpected callback.',
      },
    });
  }, [
    authPhase,
    bootstrapLinkedInCallback,
    callbackError,
    callbackIsOnboarded,
    callbackMessage,
    callbackNextStep,
    callbackSupabaseToken,
    callbackToken,
    isHydrated,
    router,
    session,
  ]);

  if (isHydrated && session) {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SplashScreen />
    </>
  );
}
