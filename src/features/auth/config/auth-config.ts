function parseBooleanEnv(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
}

function getRequiredEnv(value: string | undefined, name: string, description: string) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(`Missing ${name}. Set it before attempting ${description}.`);
  }

  return normalizedValue;
}

export type MockAuthFlowMode = 'pending_onboarding' | 'authenticated';

export function isAuthBypassEnabled() {
  const envValue = parseBooleanEnv(process.env.EXPO_PUBLIC_AUTH_BYPASS);

  if (envValue !== null) {
    return envValue;
  }

  return __DEV__;
}

export function getMockAuthFlowMode(): MockAuthFlowMode | null {
  if (!__DEV__) {
    return null;
  }

  const normalized = process.env.EXPO_PUBLIC_MOCK_AUTH_FLOW?.trim().toLowerCase();

  if (normalized === 'pending_onboarding') {
    return 'pending_onboarding';
  }

  if (normalized === 'authenticated') {
    return 'authenticated';
  }

  return null;
}

export function getGoogleAuthConfig() {
  return {
    iosClientId: getRequiredEnv(
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
      'Google Sign-In on iOS'
    ),
    iosUrlScheme: getRequiredEnv(
      process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME,
      'EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME',
      'the native Google Sign-In configuration'
    ),
    webClientId: getRequiredEnv(
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
      'Google Sign-In token exchange'
    ),
  };
}

export function getSupabaseConfig() {
  return {
    anonKey: getRequiredEnv(
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'Supabase-backed auth or chat'
    ),
    url: getRequiredEnv(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      'EXPO_PUBLIC_SUPABASE_URL',
      'Supabase-backed auth or chat'
    ),
  };
}
