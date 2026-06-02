import { getApp } from '@react-native-firebase/app';
import {
  getInitialNotification,
  getMessaging,
  onNotificationOpenedApp,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useNavigationContainerRef, useRouter } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { canAccessProtectedRoutes, useAuth } from '@features/auth';

import { getNotificationRouteFromPushData } from '../services/notification-routing';

const ROUTER_READY_RETRY_DELAY_MS = 50;

export function PushNotificationTapHandler() {
  const { authPhase, isHydrated } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const router = useRouter();
  const [pendingRoute, setPendingRoute] = React.useState<string | null>(null);
  const [routerReadyRetry, setRouterReadyRetry] = React.useState(0);

  React.useEffect(() => {
    if (
      Platform.OS === 'web' ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ) {
      return;
    }

    let isActive = true;
    const handleNotificationOpen = (message: RemoteMessage | null) => {
      console.log('[push-notification] OS notification tapped', message);

      const route = getNotificationRouteFromPushData(message?.data);

      if (isActive && route) {
        setPendingRoute(route);
      }
    };
    let unsubscribe: (() => void) | undefined;

    try {
      const messaging = getMessaging(getApp());
      unsubscribe = onNotificationOpenedApp(messaging, handleNotificationOpen);

      void getInitialNotification(messaging)
        .then(handleNotificationOpen)
        .catch((error) => {
          console.warn('Unable to read the initial push notification.', error);
        });
    } catch (error) {
      console.warn('Unable to register the push notification tap handler.', error);
    }

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, []);

  React.useEffect(() => {
    if (!pendingRoute || !isHydrated || !canAccessProtectedRoutes(authPhase)) {
      return;
    }

    if (navigationRef.current?.isReady()) {
      router.navigate(pendingRoute as never);
      setPendingRoute(null);
      return;
    }

    const retryTimeout = setTimeout(() => {
      setRouterReadyRetry((current) => current + 1);
    }, ROUTER_READY_RETRY_DELAY_MS);

    return () => {
      clearTimeout(retryTimeout);
    };
  }, [authPhase, isHydrated, navigationRef, pendingRoute, router, routerReadyRetry]);

  return null;
}
