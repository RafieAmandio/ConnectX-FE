import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import type { AppleAuthResult } from '../types/auth.types';

export class AppleSignInCanceledError extends Error {
  constructor() {
    super('Apple Sign-In was cancelled.');
    this.name = 'AppleSignInCanceledError';
  }
}

function hasErrorCode(error: unknown, code: string) {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  return (error as { code?: unknown }).code === code;
}

export function isAppleSignInCanceled(error: unknown) {
  return error instanceof AppleSignInCanceledError || hasErrorCode(error, 'ERR_REQUEST_CANCELED');
}

export async function isAppleSignInAvailable() {
  if (process.env.EXPO_OS !== 'ios') {
    return false;
  }

  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithAppleToken(): Promise<AppleAuthResult> {
  if (process.env.EXPO_OS !== 'ios') {
    throw new Error('Apple Sign-In is only enabled in the iOS build.');
  }

  if (!(await isAppleSignInAvailable())) {
    throw new Error('Apple Sign-In is unavailable on this device.');
  }

  const nonce = Crypto.randomUUID();

  try {
    const credential = await AppleAuthentication.signInAsync({
      nonce,
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const identityToken = credential.identityToken?.trim() || null;

    if (!identityToken) {
      throw new Error('Apple Sign-In completed, but no identity token was returned.');
    }

    const displayName = credential.fullName
      ? AppleAuthentication.formatFullName(credential.fullName).trim() || null
      : null;

    return {
      authorizationCode: credential.authorizationCode?.trim() || null,
      displayName,
      email: credential.email?.trim().toLowerCase() || null,
      familyName: credential.fullName?.familyName?.trim() || null,
      givenName: credential.fullName?.givenName?.trim() || null,
      identityToken,
      middleName: credential.fullName?.middleName?.trim() || null,
      nonce,
      provider: 'apple',
      userId: credential.user,
    };
  } catch (error) {
    if (isAppleSignInCanceled(error)) {
      throw new AppleSignInCanceledError();
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Apple Sign-In failed. Please try again.');
  }
}
