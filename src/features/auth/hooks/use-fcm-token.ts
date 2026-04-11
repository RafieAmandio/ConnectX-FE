import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

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

    const fetchFcmToken = async () => {
      try {
        const messagingModule = await import('@react-native-firebase/messaging');
        const messaging = messagingModule.default;
        const authStatus = await messaging().requestPermission();
        const hasPermission =
          authStatus === messagingModule.AuthorizationStatus.AUTHORIZED ||
          authStatus === messagingModule.AuthorizationStatus.PROVISIONAL;

        if (!hasPermission) {
          console.info('FCM permission was not granted.', { authStatus });
          return;
        }

        const token = await messaging().getToken();

        if (isMounted) {
          setFcmToken(token);
        }

        unsubscribeTokenRefresh = messaging().onTokenRefresh((nextToken) => {
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
