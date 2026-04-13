import * as ExpoLinking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@shared/services/supabase/client';

import type { LinkedInAuthResult } from '../types/auth.types';

const LINKEDIN_CALLBACK_PATH = 'auth/linkedin';

function logLinkedInDebug(step: string, payload?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  console.log(`[auth:linkedin] ${step}`, payload ?? {});
}

function summarizeUrl(value: string) {
  try {
    const url = new URL(value);

    return {
      host: url.host,
      origin: url.origin,
      pathname: url.pathname,
      queryKeys: [...url.searchParams.keys()],
    };
  } catch {
    const [base, queryString = ''] = value.split('?');

    return {
      base,
      queryKeys: queryString
        .split('&')
        .map((part) => part.split('=')[0])
        .filter(Boolean),
    };
  }
}

function normalizeLinkedInSignInError(error: unknown) {
  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes('cancel')) {
      return new Error('LinkedIn Sign-In was cancelled.');
    }

    if (normalizedMessage.includes('provider is not enabled')) {
      return new Error('LinkedIn Sign-In is not enabled in Supabase Auth.');
    }

    if (normalizedMessage.includes('invalid redirect')) {
      return new Error(
        'LinkedIn Sign-In redirect is not allowed. Add connectx://auth/linkedin to Supabase Auth Redirect URLs.'
      );
    }

    if (normalizedMessage.includes('code verifier')) {
      return new Error('LinkedIn Sign-In could not complete securely. Please try again.');
    }

    return error;
  }

  return new Error('LinkedIn Sign-In failed. Please try again.');
}

function getLinkedInRedirectUri() {
  return makeRedirectUri({
    scheme: 'connectx',
    path: LINKEDIN_CALLBACK_PATH,
  });
}

export async function signInWithLinkedIn(): Promise<LinkedInAuthResult> {
  if (process.env.EXPO_OS === 'web') {
    throw new Error('LinkedIn Sign-In is only enabled in the native iOS and Android builds.');
  }

  try {
    const redirectTo = getLinkedInRedirectUri();
    logLinkedInDebug('sending signInWithOAuth request', {
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
      provider: 'linkedin_oidc',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    logLinkedInDebug('received signInWithOAuth response', {
      hasError: Boolean(error),
      hasUrl: Boolean(data?.url),
      url: data?.url ? summarizeUrl(data.url) : null,
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error(
        'LinkedIn Sign-In could not start. Check the LinkedIn provider configuration in Supabase.'
      );
    }

    logLinkedInDebug('opening auth session', {
      authUrl: summarizeUrl(data.url),
      redirectTo,
    });

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    logLinkedInDebug('received browser callback', {
      callbackUrl: result.type === 'success' && result.url ? summarizeUrl(result.url) : null,
      type: result.type,
    });

    if (result.type !== 'success' || !result.url) {
      throw new Error('LinkedIn Sign-In was cancelled.');
    }

    const { queryParams } = ExpoLinking.parse(result.url);
    const params = queryParams ?? {};
    logLinkedInDebug('parsed callback params', {
      codeReceived: typeof params.code === 'string' && params.code.length > 0,
      error: typeof params.error === 'string' ? params.error : null,
      errorDescription:
        typeof params.error_description === 'string' ? params.error_description : null,
      paramKeys: Object.keys(params),
    });

    const callbackError =
      typeof params.error_description === 'string'
        ? params.error_description
        : typeof params.error === 'string'
          ? params.error
          : null;

    if (callbackError) {
      throw new Error(callbackError);
    }

    const code = typeof params.code === 'string' ? params.code : null;

    if (!code) {
      throw new Error('LinkedIn Sign-In did not return an authorization code.');
    }

    logLinkedInDebug('sending exchangeCodeForSession request', {
      codeLength: code.length,
      codePreview: `${code.slice(0, 6)}...`,
    });

    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      code
    );

    logLinkedInDebug('received exchangeCodeForSession response', {
      hasError: Boolean(exchangeError),
      providerRefreshTokenPresent: Boolean(exchangeData.session?.provider_refresh_token),
      providerTokenLength: exchangeData.session?.provider_token?.length ?? 0,
      providerTokenPresent: Boolean(exchangeData.session?.provider_token),
      supabaseAccessTokenPresent: Boolean(exchangeData.session?.access_token),
    });

    if (exchangeError) {
      throw exchangeError;
    }

    logLinkedInDebug('linkedin sign-in completed', {
      provider: 'linkedin',
    });

    return {
      provider: 'linkedin',
    };
  } catch (error) {
    logLinkedInDebug('linkedin sign-in failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw normalizeLinkedInSignInError(error);
  }
}
