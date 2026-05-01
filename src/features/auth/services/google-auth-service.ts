import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as signOutFirebaseAuth,
} from '@react-native-firebase/auth';

import { isExpoDevModeEnabled } from '@shared/utils/env';

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
    console.log('[auth:google] GoogleSignin.signIn() response', response);

    if (response.type === 'cancelled') {
      throw new Error('Google Sign-In was cancelled.');
    }

    const tokens = await GoogleSignin.getTokens();
    console.log('[auth:google] GoogleSignin.getTokens() response', tokens);

    const googleAccessToken = tokens.accessToken?.trim() || null;
    const idToken = response.data.idToken?.trim() || tokens.idToken?.trim() || null;
    const email = response.data.user.email.trim().toLowerCase();
    const displayName = response.data.user.name?.trim() || email.split('@')[0] || 'ConnectX Member';
    const userId = response.data.user.id.trim();

    if (!idToken || !email || !userId) {
      throw new Error(
        'Google Sign-In succeeded, but the expected ID token payload was incomplete. Check the configured Google OAuth client IDs in the app build.'
      );
    }

    const googleCredential = GoogleAuthProvider.credential(
      idToken,
      googleAccessToken ?? undefined
    );
    const firebaseUserCredential = await signInWithCredential(getAuth(), googleCredential);
    const firebaseIdToken = await firebaseUserCredential.user.getIdToken();

    console.log('[auth:google] Firebase signInWithCredential() response', firebaseUserCredential);
    console.log('[auth:google] Firebase user ID token', firebaseIdToken);

    const googleAuthResult = {
      email,
      displayName,
      provider: 'google',
      accessToken: firebaseIdToken,
      firebaseIdToken,
      googleAccessToken,
      idToken,
      fcmToken: null,
      userId,
    } satisfies GoogleAuthResult;

    console.log('[auth:google] normalized auth result', googleAuthResult);

    return googleAuthResult;
  } catch (error) {
    throw normalizeGoogleSignInError(error);
  }
}

export async function signOutGoogle() {
  if (process.env.EXPO_OS === 'web') {
    return;
  }

  try {
    ensureGoogleSignInConfigured();
    await Promise.allSettled([
      GoogleSignin.signOut(),
      signOutFirebaseAuth(getAuth()),
    ]);
  } catch (error) {
    if (isExpoDevModeEnabled()) {
      console.warn('[auth] failed to clear native Google session', error);
    }
  }
}
