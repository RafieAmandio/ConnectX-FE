import * as SecureStore from 'expo-secure-store';

import type { AuthSession } from '../types/auth.types';

const TOKEN_KEY = 'connectx.auth.token';
const SESSION_KEY = 'connectx.auth.session';

type PersistedAuthState = {
  session: AuthSession | null;
  token: string | null;
};

export async function getStoredToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredSession() {
  const rawSession = await SecureStore.getItemAsync(SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function getPersistedAuthState(): Promise<PersistedAuthState> {
  const [token, session] = await Promise.all([getStoredToken(), getStoredSession()]);

  return { session, token };
}

export async function persistAuthSession(session: AuthSession, token: string) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)),
  ]);
}

export async function clearPersistedAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(SESSION_KEY),
  ]);
}

export async function signInWithMockGoogle() {
  const session: AuthSession = {
    displayName: 'Alya Hartono',
    method: 'google',
  };
  const token = `mock-google-token-${Date.now()}`;

  await persistAuthSession(session, token);

  return session;
}

export async function signInWithMockPhone(phoneNumber: string) {
  const session: AuthSession = {
    displayName: 'Phone Member',
    method: 'phone',
    phoneNumber,
  };
  const token = `mock-phone-token-${Date.now()}`;

  await persistAuthSession(session, token);

  return session;
}
