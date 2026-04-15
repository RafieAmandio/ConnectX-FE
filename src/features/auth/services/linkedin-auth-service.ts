import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { LinkedInAuthResult } from '../types/auth.types';

const LINKEDIN_CALLBACK_HOST = 'auth';
const LINKEDIN_CALLBACK_ROUTE = 'linkedin-callback';
const LINKEDIN_CALLBACK_PATH = `${LINKEDIN_CALLBACK_HOST}/${LINKEDIN_CALLBACK_ROUTE}`;

function normalizeLinkedInCallbackPath(path?: string | null) {
  return (path ?? '').replace(/^\/+/, '').replace(/\/+$/, '');
}

function getLinkedInCallbackToken(url: string) {
  const parsedUrl = Linking.parse(url);
  const normalizedPath = normalizeLinkedInCallbackPath(parsedUrl.path);
  const normalizedHost = parsedUrl.hostname?.trim().toLowerCase() ?? '';
  const matchesCallbackRoute =
    normalizedPath === LINKEDIN_CALLBACK_PATH ||
    (normalizedHost === LINKEDIN_CALLBACK_HOST && normalizedPath === LINKEDIN_CALLBACK_ROUTE);

  if (!matchesCallbackRoute) {
    return undefined;
  }

  const token = parsedUrl.queryParams?.token;

  return typeof token === 'string' ? token.trim() || null : null;
}

export async function signInWithLinkedInToken(): Promise<LinkedInAuthResult> {
  if (process.env.EXPO_OS === 'web') {
    throw new Error('LinkedIn Sign-In is only enabled in the native iOS and Android builds.');
  }

  const authUrl = 'https://easytrip-backend-nhud.onrender.com/auth/linkedin';
  const callbackUrl = Linking.createURL(LINKEDIN_CALLBACK_PATH);
  const result = await WebBrowser.openAuthSessionAsync(authUrl, callbackUrl);

  if (__DEV__) {
    console.log('[linkedin] auth session result', result);
  }

  if (result.type !== 'success') {
    throw new Error('LinkedIn sign-in was cancelled.');
  }

  const parsedUrl = Linking.parse(result.url);
  const token = getLinkedInCallbackToken(result.url);

  if (__DEV__) {
    console.log('[linkedin] callback url', result.url);
    console.log('[linkedin] parsed callback', {
      hostname: parsedUrl.hostname ?? null,
      path: parsedUrl.path ?? null,
      queryParams: parsedUrl.queryParams ?? null,
    });
    console.log('[linkedin] extracted provider token', token);
  }

  if (token === undefined) {
    throw new Error('LinkedIn sign-in returned an unexpected callback URL.');
  }

  if (!token) {
    throw new Error('LinkedIn sign-in completed, but no callback token was returned.');
  }

  return {
    providerToken: token,
    provider: 'linkedin',
  };
}
