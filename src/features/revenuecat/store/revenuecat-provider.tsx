import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesEntitlementInfo,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { useAuth } from '@features/auth';

import {
  getRevenueCatApiKey,
  getRevenueCatAppUserId,
  REVENUECAT_ENTITLEMENT_CONNECTX_PRO,
  REVENUECAT_PACKAGE_IDS,
  REVENUECAT_SUPPORTED_PLATFORM,
  type RevenueCatPackageId,
} from '../config/revenuecat-config';

type RevenueCatPackageMap = Record<RevenueCatPackageId, PurchasesPackage | null>;

type RevenueCatContextValue = {
  appUserId: string | null;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  error: string | null;
  isConfigured: boolean;
  isConnectXProActive: boolean;
  isLoading: boolean;
  managementUrl: string | null;
  offerings: PurchasesOfferings | null;
  packages: RevenueCatPackageMap;
  presentPaywall: () => Promise<PAYWALL_RESULT | null>;
  presentPaywallForOffering: (offeringId: string) => Promise<PAYWALL_RESULT | null>;
  presentPaywallIfNeeded: () => Promise<PAYWALL_RESULT | null>;
  presentCustomerCenter: () => Promise<void>;
  purchasePackageById: (packageId: RevenueCatPackageId) => Promise<CustomerInfo | null>;
  refresh: () => Promise<CustomerInfo | null>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  supported: boolean;
  connectXProEntitlement: PurchasesEntitlementInfo | null;
};

const RevenueCatContext = React.createContext<RevenueCatContextValue | null>(null);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'Something went wrong while talking to RevenueCat.';
}

function getOfferPackages(offering: PurchasesOffering | null): RevenueCatPackageMap {
  const availablePackages = offering?.availablePackages ?? [];

  return {
    lifetime:
      availablePackages.find((item) => item.identifier === REVENUECAT_PACKAGE_IDS.lifetime) ??
      offering?.lifetime ??
      null,
    yearly:
      availablePackages.find((item) => item.identifier === REVENUECAT_PACKAGE_IDS.yearly) ??
      offering?.annual ??
      null,
    monthly:
      availablePackages.find((item) => item.identifier === REVENUECAT_PACKAGE_IDS.monthly) ??
      offering?.monthly ??
      null,
  };
}

function getOfferingById(offerings: PurchasesOfferings | null, offeringId: string) {
  const normalizedOfferingId = offeringId.trim();

  if (!normalizedOfferingId) {
    return null;
  }

  return offerings?.all[normalizedOfferingId] ?? null;
}

async function fetchBootstrapState() {
  const [offerings, customerInfo, appUserId] = await Promise.all([
    Purchases.getOfferings(),
    Purchases.getCustomerInfo(),
    Purchases.getAppUserID(),
  ]);

  return {
    appUserId,
    customerInfo,
    offerings,
  };
}

export function RevenueCatProvider({ children }: React.PropsWithChildren) {
  const { session } = useAuth();
  const [isConfigured, setIsConfigured] = React.useState(!REVENUECAT_SUPPORTED_PLATFORM);
  const [isLoading, setIsLoading] = React.useState(REVENUECAT_SUPPORTED_PLATFORM);
  const [error, setError] = React.useState<string | null>(null);
  const [offerings, setOfferings] = React.useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = React.useState<CustomerInfo | null>(null);
  const [appUserId, setAppUserId] = React.useState<string | null>(null);
  const configuredRef = React.useRef(false);

  React.useEffect(() => {
    if (!REVENUECAT_SUPPORTED_PLATFORM || configuredRef.current) {
      return;
    }

    configuredRef.current = true;

    if (__DEV__) {
      void Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG).catch(() => {
        return undefined;
      });
    }

    const configuredAppUserId = getRevenueCatAppUserId(session?.user?.id);
    const customerInfoListener: CustomerInfoUpdateListener = (nextCustomerInfo) => {
      React.startTransition(() => {
        setCustomerInfo(nextCustomerInfo);
      });
    };

    try {
      Purchases.configure({
        apiKey: getRevenueCatApiKey(),
        appUserID: configuredAppUserId ?? undefined,
      });
      Purchases.addCustomerInfoUpdateListener(customerInfoListener);
      setIsConfigured(true);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      setIsLoading(false);
    }

    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [session?.user?.id]);

  const refresh = React.useCallback(async () => {
    if (!REVENUECAT_SUPPORTED_PLATFORM || !configuredRef.current) {
      return null;
    }

    setIsLoading(true);

    try {
      const nextState = await fetchBootstrapState();

      React.startTransition(() => {
        setOfferings(nextState.offerings);
        setCustomerInfo(nextState.customerInfo);
        setAppUserId(nextState.appUserId);
        setError(null);
      });

      return nextState.customerInfo;
    } catch (nextError) {
      const message = getErrorMessage(nextError);
      setError(message);
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!REVENUECAT_SUPPORTED_PLATFORM || !isConfigured) {
      return;
    }

    let isActive = true;

    const syncRevenueCatIdentity = async () => {
      setIsLoading(true);

      try {
        const desiredAppUserId = getRevenueCatAppUserId(session?.user?.id);

        if (desiredAppUserId) {
          const currentAppUserId = await Purchases.getAppUserID();

          if (currentAppUserId !== desiredAppUserId) {
            const result = await Purchases.logIn(desiredAppUserId);

            if (isActive) {
              React.startTransition(() => {
                setCustomerInfo(result.customerInfo);
              });
            }
          }
        } else if (!(await Purchases.isAnonymous())) {
          const anonymousCustomerInfo = await Purchases.logOut();

          if (isActive) {
            React.startTransition(() => {
              setCustomerInfo(anonymousCustomerInfo);
            });
          }
        }

        const nextState = await fetchBootstrapState();

        if (!isActive) {
          return;
        }

        React.startTransition(() => {
          setOfferings(nextState.offerings);
          setCustomerInfo(nextState.customerInfo);
          setAppUserId(nextState.appUserId);
          setError(null);
        });
      } catch (nextError) {
        if (!isActive) {
          return;
        }

        setError(getErrorMessage(nextError));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void syncRevenueCatIdentity();

    return () => {
      isActive = false;
    };
  }, [isConfigured, session?.user?.id]);

  React.useEffect(() => {
    if (!REVENUECAT_SUPPORTED_PLATFORM || !isConfigured) {
      return;
    }

    const handleAppStateChange = (nextStatus: AppStateStatus) => {
      if (nextStatus === 'active') {
        void refresh().catch(() => {
          return undefined;
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isConfigured, refresh]);

  const currentOffering = offerings?.current ?? null;
  const packages = React.useMemo(() => getOfferPackages(currentOffering), [currentOffering]);
  const connectXProEntitlement =
    customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_CONNECTX_PRO] ?? null;
  console.log('connectXProEntitlement', customerInfo);

  const restorePurchases = React.useCallback(async () => {
    if (!REVENUECAT_SUPPORTED_PLATFORM || !configuredRef.current) {
      return null;
    }

    setIsLoading(true);

    try {
      const nextCustomerInfo = await Purchases.restorePurchases();

      React.startTransition(() => {
        setCustomerInfo(nextCustomerInfo);
        setError(null);
      });

      return nextCustomerInfo;
    } catch (nextError) {
      const message = getErrorMessage(nextError);
      setError(message);
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const purchasePackageById = React.useCallback(
    async (packageId: RevenueCatPackageId) => {
      if (!REVENUECAT_SUPPORTED_PLATFORM || !configuredRef.current) {
        return null;
      }

      const nextPackage = getOfferPackages(offerings?.current ?? null)[packageId];

      if (!nextPackage) {
        const missingPackageError = new Error(
          `The ${packageId} package is missing from the current RevenueCat offering.`
        );
        setError(missingPackageError.message);
        throw missingPackageError;
      }

      setIsLoading(true);

      try {
        const result = await Purchases.purchasePackage(nextPackage);

        React.startTransition(() => {
          setCustomerInfo(result.customerInfo);
          setError(null);
        });

        return result.customerInfo;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw nextError;
      } finally {
        setIsLoading(false);
      }
    },
    [offerings]
  );

  const presentPaywall = React.useCallback(async () => {
    if (!REVENUECAT_SUPPORTED_PLATFORM || !configuredRef.current) {
      return null;
    }

    try {
      const result = await RevenueCatUI.presentPaywall({
        offering: currentOffering ?? undefined,
        displayCloseButton: true,
      });

      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        await refresh();
      }

      setError(null);
      return result;
    } catch (nextError) {
      const message = getErrorMessage(nextError);
      setError(message);
      throw nextError;
    }
  }, [currentOffering, refresh]);

  const presentPaywallForOffering = React.useCallback(
    async (offeringId: string) => {
      if (!REVENUECAT_SUPPORTED_PLATFORM || !configuredRef.current) {
        return null;
      }

      const offering = getOfferingById(offerings, offeringId);

      if (!offering) {
        const missingOfferingError = new Error(
          `The ${offeringId} offering is missing from RevenueCat.`
        );
        setError(missingOfferingError.message);
        throw missingOfferingError;
      }

      try {
        const result = await RevenueCatUI.presentPaywall({
          offering,
          displayCloseButton: true,
        });

        if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
          await refresh();
        }

        setError(null);
        return result;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw nextError;
      }
    },
    [offerings, refresh]
  );

  const presentPaywallIfNeeded = React.useCallback(async () => {
    if (!REVENUECAT_SUPPORTED_PLATFORM || !configuredRef.current) {
      return null;
    }

    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_CONNECTX_PRO,
        offering: currentOffering ?? undefined,
        displayCloseButton: true,
      });

      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        await refresh();
      }

      setError(null);
      return result;
    } catch (nextError) {
      const message = getErrorMessage(nextError);
      setError(message);
      throw nextError;
    }
  }, [currentOffering, refresh]);

  const presentCustomerCenter = React.useCallback(async () => {
    if (!REVENUECAT_SUPPORTED_PLATFORM || !configuredRef.current) {
      return;
    }

    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onRestoreCompleted: ({ customerInfo: nextCustomerInfo }) => {
            React.startTransition(() => {
              setCustomerInfo(nextCustomerInfo);
            });
          },
          onRestoreFailed: ({ error: nextError }) => {
            setError(getErrorMessage(nextError));
          },
        },
      });

      await refresh();
      setError(null);
    } catch (nextError) {
      const message = getErrorMessage(nextError);
      setError(message);
      throw nextError;
    }
  }, [refresh]);

  const value = React.useMemo<RevenueCatContextValue>(
    () => ({
      appUserId,
      connectXProEntitlement,
      currentOffering,
      customerInfo,
      error,
      isConfigured,
      isConnectXProActive: Boolean(connectXProEntitlement?.isActive),
      isLoading,
      managementUrl: customerInfo?.managementURL ?? null,
      offerings,
      packages,
      presentCustomerCenter,
      presentPaywall,
      presentPaywallForOffering,
      presentPaywallIfNeeded,
      purchasePackageById,
      refresh,
      restorePurchases,
      supported: REVENUECAT_SUPPORTED_PLATFORM,
    }),
    [
      appUserId,
      connectXProEntitlement,
      currentOffering,
      customerInfo,
      error,
      isConfigured,
      isLoading,
      offerings,
      packages,
      presentCustomerCenter,
      presentPaywall,
      presentPaywallForOffering,
      presentPaywallIfNeeded,
      purchasePackageById,
      refresh,
      restorePurchases,
    ]
  );

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

export function useRevenueCatContext() {
  const value = React.useContext(RevenueCatContext);

  if (!value) {
    throw new Error('useRevenueCat must be used inside RevenueCatProvider');
  }

  return value;
}
