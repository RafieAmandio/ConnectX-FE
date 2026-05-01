import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { isExpoDevModeEnabled } from '@shared/utils/env';

import type { LinkedInAuthResult, LinkedInCallbackNextStep } from '../types/auth.types';

const LINKEDIN_CALLBACK_HOST = 'auth';
const LINKEDIN_CALLBACK_ROUTE = 'linkedin-callback';
const LINKEDIN_CALLBACK_PATH = `${LINKEDIN_CALLBACK_HOST}/${LINKEDIN_CALLBACK_ROUTE}`;

type LinkedInCallbackPayload =
  | { type: 'error'; message: string }
  | { type: 'missing_next_step' }
  | { type: 'missing_token' }
  | {
    isOnboarded: boolean | null;
    type: 'success';
    token: string;
    nextStep: LinkedInCallbackNextStep;
    supabaseToken: string | null;
  }
  | { type: 'unexpected' };

function normalizeLinkedInCallbackPath(path?: string | null) {
  return (path ?? '').replace(/^\/+/, '').replace(/\/+$/, '');
}

function getNormalizedLinkedInCallbackParam(value: unknown) {
  if (Array.isArray(value)) {
    return getNormalizedLinkedInCallbackParam(value[0]);
  }

  return typeof value === 'string' ? value.trim() || null : null;
}

function isLinkedInCallbackNextStep(value: string | null): value is LinkedInCallbackNextStep {
  return (
    value === 'LOGIN_SUCCESS' ||
    value === 'NEED_ONBOARDING' ||
    value === 'NEED_WHATSAPP_VERIFICATION'
  );
}

function parseLinkedInIsOnboardedParam(value: string | null) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function getLinkedInCallbackPayload(url: string): LinkedInCallbackPayload {
  const parsedUrl = Linking.parse(url);
  const normalizedPath = normalizeLinkedInCallbackPath(parsedUrl.path);
  const normalizedHost = parsedUrl.hostname?.trim().toLowerCase() ?? '';
  const matchesCallbackRoute =
    normalizedPath === LINKEDIN_CALLBACK_PATH ||
    (normalizedHost === LINKEDIN_CALLBACK_HOST && normalizedPath === LINKEDIN_CALLBACK_ROUTE);

  if (!matchesCallbackRoute) {
    return { type: 'unexpected' };
  }

  const token = getNormalizedLinkedInCallbackParam(parsedUrl.queryParams?.token);
  const nextStep = getNormalizedLinkedInCallbackParam(parsedUrl.queryParams?.next_step);
  const supabaseToken = getNormalizedLinkedInCallbackParam(parsedUrl.queryParams?.supabase_token);
  const isOnboarded = parseLinkedInIsOnboardedParam(
    getNormalizedLinkedInCallbackParam(parsedUrl.queryParams?.is_onboarded)
  );
  const errorMessage = getNormalizedLinkedInCallbackParam(parsedUrl.queryParams?.message);
  const errorCode = getNormalizedLinkedInCallbackParam(parsedUrl.queryParams?.error);

  if (errorCode || errorMessage) {
    return {
      type: 'error',
      message: errorMessage ?? 'LinkedIn sign-in failed. Please try again.',
    };
  }

  if (!token) {
    return { type: 'missing_token' };
  }

  if (!isLinkedInCallbackNextStep(nextStep)) {
    return { type: 'missing_next_step' };
  }

  return {
    isOnboarded,
    type: 'success',
    token,
    nextStep,
    supabaseToken,
  };
}

export async function signInWithLinkedInToken(): Promise<LinkedInAuthResult> {
  if (process.env.EXPO_OS === 'web') {
    throw new Error('LinkedIn Sign-In is only enabled in the native iOS and Android builds.');
  }

  const authUrl = 'https://getconnectxapp.vercel.app/api/v1/auth/oauth/linkedin';
  const callbackUrl = Linking.createURL(LINKEDIN_CALLBACK_PATH);
  const result = await WebBrowser.openAuthSessionAsync(authUrl, callbackUrl);

  if (isExpoDevModeEnabled()) {
    console.log('[linkedin] auth session result', result);
  }

  if (result.type !== 'success') {
    throw new Error('LinkedIn sign-in was cancelled.');
  }

  const parsedUrl = Linking.parse(result.url);
  const callbackPayload = getLinkedInCallbackPayload(result.url);

  if (isExpoDevModeEnabled()) {
    console.log('[linkedin] callback url', result.url);
    console.log('[linkedin] parsed callback', {
      hostname: parsedUrl.hostname ?? null,
      path: parsedUrl.path ?? null,
      queryParams: parsedUrl.queryParams ?? null,
    });
    console.log('[linkedin] extracted callback payload', callbackPayload);
  }

  if (callbackPayload.type === 'unexpected') {
    throw new Error('LinkedIn sign-in returned an unexpected callback URL.');
  }

  if (callbackPayload.type === 'error') {
    throw new Error(callbackPayload.message);
  }

  if (callbackPayload.type === 'missing_token') {
    throw new Error('LinkedIn sign-in completed, but no callback token was returned.');
  }

  if (callbackPayload.type === 'missing_next_step') {
    throw new Error('LinkedIn sign-in completed, but no callback next step was returned.');
  }

  return {
    provider: 'linkedin',
    token: callbackPayload.token,
    nextStep: callbackPayload.nextStep,
    isOnboarded: callbackPayload.isOnboarded,
    supabaseToken: callbackPayload.supabaseToken,
  };
}
