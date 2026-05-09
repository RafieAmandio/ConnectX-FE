import { useState, useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getApp } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  getAPNSToken,
  getMessaging,
  getToken,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging';

const APNS_TOKEN_RETRY_COUNT = 10;
const APNS_TOKEN_RETRY_DELAY_MS = 500;

const wait = (delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs));

export function useFcmToken() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      console.info('Skipping FCM token fetch in Expo Go. Use a dev build or release build instead.');
      return;
    }

    let isMounted = true;
    let unsubscribeTokenRefresh: (() => void) | undefined;

    const requestAndroidNotificationPermission = async () => {
      if (Platform.OS !== 'android' || Platform.Version < 33) {
        return true;
      }

      const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      const isGranted = await PermissionsAndroid.check(permission);

      if (isGranted) {
        return true;
      }

      const result = await PermissionsAndroid.request(permission);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    };

    const waitForApnsToken = async (messaging: ReturnType<typeof getMessaging>) => {
      for (let attempt = 0; attempt < APNS_TOKEN_RETRY_COUNT; attempt += 1) {
        const apnsToken = await getAPNSToken(messaging);

        if (apnsToken) {
          return apnsToken;
        }

        await wait(APNS_TOKEN_RETRY_DELAY_MS);
      }

      return null;
    };

    const fetchFcmToken = async () => {
      try {
        const hasAndroidPermission = await requestAndroidNotificationPermission();

        if (!hasAndroidPermission) {
          console.info('Android notification permission was not granted.');
          return;
        }

        const messaging = getMessaging(getApp());
        const authStatus = await requestPermission(messaging);
        const hasPermission =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;

        if (!hasPermission) {
          console.info('FCM permission was not granted.', { authStatus });
          return;
        }

        if (Platform.OS === 'ios') {
          await registerDeviceForRemoteMessages(messaging);

          const apnsToken = await waitForApnsToken(messaging);

          if (!apnsToken) {
            console.info('APNs token was not available yet. Reopen the app after rebuilding with Push Notifications enabled.');
            return;
          }
        }

        const token = await getToken(messaging);

        if (isMounted) {
          setFcmToken(token);
        }

        unsubscribeTokenRefresh = onTokenRefresh(messaging, (nextToken) => {
          if (isMounted) {
            setFcmToken(nextToken);
          }
        });
      } catch (error) {
        console.warn('Unable to fetch FCM token.', error);
      }
    };

    void fetchFcmToken();

    return () => {
      isMounted = false;
      unsubscribeTokenRefresh?.();
    };
  }, []);

  return fcmToken;
}
