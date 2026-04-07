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

function getRequiredEnv(name: string, description: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}. Set it before attempting ${description}.`);
  }

  return value;
}

export function isAuthBypassEnabled() {
  const envValue = parseBooleanEnv(process.env.EXPO_PUBLIC_AUTH_BYPASS);

  if (envValue !== null) {
    return envValue;
  }

  return __DEV__;
}

export function getGoogleAuthConfig() {
  return {
    iosClientId: getRequiredEnv(
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
      'Google Sign-In on iOS'
    ),
    iosUrlScheme: getRequiredEnv(
      'EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME',
      'the native Google Sign-In configuration'
    ),
    webClientId: getRequiredEnv(
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
      'Google Sign-In token exchange'
    ),
  };
}
