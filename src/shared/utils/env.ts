export function parseBooleanEnv(value: string | undefined) {
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

export function isExpoDevModeEnabled() {
  return parseBooleanEnv(process.env.EXPO_PUBLIC_DEV_MODE) ?? __DEV__;
}
