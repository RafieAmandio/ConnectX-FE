import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { getGoogleAuthConfig } from '../config/auth-config';
import type { GoogleAuthResult } from '../types/auth.types';

let isGoogleConfigured = false;

function ensureGoogleSignInConfigured() {
  if (isGoogleConfigured) {
    return;
  }

  const { iosClientId, webClientId } = getGoogleAuthConfig();

  GoogleSignin.configure({
    iosClientId,
    webClientId,
  });

  isGoogleConfigured = true;
}

function normalizeGoogleSignInError(error: unknown) {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return new Error('Google Sign-In was cancelled.');
      case statusCodes.IN_PROGRESS:
        return new Error('Google Sign-In is already in progress.');
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return new Error(
          'Google Play Services is unavailable or needs an update on this device.'
        );
      default:
        if (error.message.includes('DEVELOPER_ERROR')) {
          return new Error(
            'Google Sign-In is not configured correctly. Check the Google client IDs and iOS URL scheme.'
          );
        }

        return new Error(error.message);
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('iosClientId') || error.message.includes('webClientId')) {
      return new Error(
        'Google Sign-In is missing a required client ID. Set the Google OAuth env variables and rebuild the app.'
      );
    }

    return error;
  }

  return new Error('Google Sign-In failed. Please try again.');
}

export async function signInWithGoogleToken(): Promise<GoogleAuthResult> {
  if (process.env.EXPO_OS === 'web') {
    throw new Error('Google Sign-In is only enabled in the native iOS and Android builds.');
  }

  try {
    ensureGoogleSignInConfigured();

    if (process.env.EXPO_OS === 'android') {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }

    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      throw new Error('Google Sign-In was cancelled.');
    }

    const providerToken = response.data.idToken?.trim();

    if (!providerToken) {
      throw new Error(
        'Google Sign-In succeeded, but no ID token was returned. Check the configured Google OAuth client IDs.'
      );
    }

    return {
      provider: 'google',
      providerToken,
      fcmToken: null,
    };
  } catch (error) {
    throw normalizeGoogleSignInError(error);
  }
}
