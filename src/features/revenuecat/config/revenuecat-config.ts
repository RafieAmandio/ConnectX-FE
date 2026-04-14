import { Platform } from 'react-native';

export const REVENUECAT_ENTITLEMENT_CONNECTX_PRO = 'getconnectx Pro';

export const REVENUECAT_PACKAGE_IDS = {
  lifetime: 'lifetime',
  monthly: 'monthly',
  yearly: 'yearly',
} as const;

export type RevenueCatPackageId = keyof typeof REVENUECAT_PACKAGE_IDS;

export const REVENUECAT_OFFERING_IDS = {
  discoveryBoosts: process.env.EXPO_PUBLIC_REVENUECAT_DISCOVERY_BOOSTS_OFFERING_ID?.trim() || 'discovery_boosts',
} as const;

const TEST_REVENUECAT_API_KEY = 'test_qygzknVEBmKBRnPRWUFvfgCvaCZ';

export const REVENUECAT_SUPPORTED_PLATFORM = Platform.OS === 'ios' || Platform.OS === 'android';

export function getRevenueCatApiKey() {
  const platformKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim()
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim()
        : undefined;
  const sharedKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();

  return platformKey || sharedKey || TEST_REVENUECAT_API_KEY;
}

export function getRevenueCatAppUserId(userId?: string | null) {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    return null;
  }

  return `connectx_${normalizedUserId}`;
}
