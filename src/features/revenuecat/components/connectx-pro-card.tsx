import React from 'react';
import { View } from 'react-native';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { AppButton, AppCard, AppPill, AppText, showAlert } from '@shared/components';

import { REVENUECAT_ENTITLEMENT_CONNECTX_PRO, type RevenueCatPackageId } from '../config/revenuecat-config';
import { useRevenueCat } from '../hooks/use-revenuecat';

type PackagePresentation = {
  detail: string;
  id: RevenueCatPackageId;
  title: string;
};

const packagePresentation: PackagePresentation[] = [
  {
    detail: 'Permanent unlock',
    id: 'lifetime',
    title: 'Lifetime',
  },
  {
    detail: 'Best long-term value',
    id: 'yearly',
    title: 'Yearly',
  },
  {
    detail: 'Most flexible option',
    id: 'monthly',
    title: 'Monthly',
  },
];

function getPurchaseErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error &&
    'userCancelled' in error &&
    error.userCancelled === true
  ) {
    return null;
  }

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

  return 'The purchase could not be completed.';
}

function getPaywallMessage(result: PAYWALL_RESULT | null) {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return 'ConnectX Pro is now active on this account.';
    case PAYWALL_RESULT.RESTORED:
      return 'Your previous purchase was restored successfully.';
    case PAYWALL_RESULT.NOT_PRESENTED:
      return 'You already have ConnectX Pro, so the paywall was skipped.';
    case PAYWALL_RESULT.CANCELLED:
      return null;
    default:
      return null;
  }
}

function getEntitlementDetail(expirationDate: string | null | undefined) {
  if (!expirationDate) {
    return 'No renewal date. This usually means lifetime access.';
  }

  const nextDate = new Date(expirationDate);

  if (Number.isNaN(nextDate.getTime())) {
    return 'Renewal date available in RevenueCat customer info.';
  }

  return `Renews or expires on ${nextDate.toLocaleDateString()}.`;
}

export function ConnectXProCard() {
  const {
    appUserId,
    connectXProEntitlement,
    currentOffering,
    customerInfo,
    error,
    isConfigured,
    isConnectXProActive,
    isLoading,
    managementUrl,
    packages,
    presentCustomerCenter,
    presentPaywall,
    presentPaywallIfNeeded,
    purchasePackageById,
    refresh,
    restorePurchases,
    supported,
  } = useRevenueCat();
  const [activeAction, setActiveAction] = React.useState<string | null>(null);

  const handleRevenueCatError = React.useCallback((nextError: unknown) => {
    const message = getPurchaseErrorMessage(nextError);

    if (!message) {
      return;
    }

    showAlert('RevenueCat', message);
  }, []);

  const runAction = React.useCallback(
    async (actionKey: string, handler: () => Promise<void>) => {
      setActiveAction(actionKey);

      try {
        await handler();
      } catch (nextError) {
        handleRevenueCatError(nextError);
      } finally {
        setActiveAction(null);
      }
    },
    [handleRevenueCatError]
  );

  if (!supported) {
    return (
      <AppCard tone="muted" className="gap-2">
        <AppText variant="subtitle">ConnectX Pro</AppText>
        <AppText tone="muted">
          RevenueCat purchases are available in the iOS and Android native builds. Web keeps the
          rest of the account UI available, but does not initialize the purchase SDK.
        </AppText>
      </AppCard>
    );
  }

  return (
    <AppCard tone={isConnectXProActive ? 'success' : 'accent'} className="gap-4">
      <View className="gap-3">
        <AppPill
          className="self-start"
          label={isConnectXProActive ? 'ConnectX Pro Active' : 'Upgrade Available'}
          tone={isConnectXProActive ? 'success' : 'accent'}
        />
        <View className="gap-1">
          <AppText variant="subtitle">ConnectX Pro</AppText>
          <AppText tone="muted">
            RevenueCat manages the paywall, offerings, purchases, restores, and the
            `{REVENUECAT_ENTITLEMENT_CONNECTX_PRO}` entitlement check for this account.
          </AppText>
        </View>
      </View>

      <View className="gap-3">
        <View className="rounded-[18px] border border-border bg-surface px-4 py-3">
          <AppText variant="bodyStrong">Entitlement</AppText>
          <AppText tone={isConnectXProActive ? 'success' : 'muted'}>
            {isConnectXProActive ? 'Active' : 'Inactive'}
          </AppText>
          <AppText tone="soft" variant="code">
            {getEntitlementDetail(connectXProEntitlement?.expirationDate)}
          </AppText>
        </View>

        <View className="rounded-[18px] border border-border bg-surface px-4 py-3">
          <AppText variant="bodyStrong">RevenueCat customer</AppText>
          <AppText tone="muted">{appUserId ?? 'Anonymous customer'}</AppText>
          <AppText tone="soft" variant="code">
            {customerInfo?.originalAppUserId ?? 'No customer info loaded yet'}
          </AppText>
        </View>

        <View className="rounded-[18px] border border-border bg-surface px-4 py-3">
          <AppText variant="bodyStrong">Current offering</AppText>
          <AppText tone="muted">{currentOffering?.identifier ?? 'No offering returned'}</AppText>
          <AppText tone="soft" variant="code">
            {managementUrl ?? 'Customer Center can manage plans even when the store URL is absent.'}
          </AppText>
        </View>
      </View>

      {error ? (
        <View className="rounded-[18px] border border-signal/25 bg-signal-tint px-4 py-3">
          <AppText variant="bodyStrong">RevenueCat error</AppText>
          <AppText tone="muted">{error}</AppText>
        </View>
      ) : null}

      <View className="gap-3">
        <AppButton
          detail={
            isConnectXProActive
              ? 'Open RevenueCat Customer Center'
              : 'Present the current RevenueCat paywall'
          }
          disabled={isLoading || activeAction !== null || !isConfigured}
          label={
            activeAction === 'paywall'
              ? 'Working...'
              : isConnectXProActive
                ? 'Manage Subscription'
                : 'Show Paywall'
          }
          onPress={() => {
            void runAction('paywall', async () => {
              const result = isConnectXProActive
                ? await presentCustomerCenter().then(() => null)
                : await presentPaywallIfNeeded();
              const message = getPaywallMessage(result);

              if (message) {
                showAlert('RevenueCat', message);
              }
            });
          }}
        />

        <AppButton
          detail="Force-refresh customer info and offerings"
          disabled={isLoading || activeAction !== null || !isConfigured}
          label={activeAction === 'refresh' ? 'Refreshing...' : 'Refresh Subscription State'}
          onPress={() => {
            void runAction('refresh', async () => {
              await refresh();
            });
          }}
          variant="secondary"
        />

        <AppButton
          detail="Restore previous purchases for this customer"
          disabled={isLoading || activeAction !== null || !isConfigured}
          label={activeAction === 'restore' ? 'Restoring...' : 'Restore Purchases'}
          onPress={() => {
            void runAction('restore', async () => {
              const restoredInfo = await restorePurchases();

              if (restoredInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_CONNECTX_PRO]) {
                showAlert('RevenueCat', 'ConnectX Pro was restored successfully.');
              }
            });
          }}
          variant="secondary"
        />

        {!isConnectXProActive ? (
          <AppButton
            detail="Present the paywall without entitlement gating"
            disabled={isLoading || activeAction !== null || !isConfigured}
            label={activeAction === 'paywall-direct' ? 'Opening...' : 'Open Paywall Directly'}
            onPress={() => {
              void runAction('paywall-direct', async () => {
                const result = await presentPaywall();
                const message = getPaywallMessage(result);

                if (message) {
                  showAlert('RevenueCat', message);
                }
              });
            }}
            variant="ghost"
          />
        ) : null}
      </View>

      <View className="gap-3">
        <AppText variant="bodyStrong">Available packages</AppText>
        {packagePresentation.map((item) => {
          const revenueCatPackage = packages[item.id];

          return (
            <View
              key={item.id}
              className="gap-3 rounded-[18px] border border-border bg-surface px-4 py-4">
              <View className="gap-1">
                <AppText variant="subtitle">{item.title}</AppText>
                <AppText tone="muted">
                  {revenueCatPackage?.product.priceString ?? 'Not configured in the current offering'}
                </AppText>
                <AppText tone="soft" variant="code">
                  {revenueCatPackage
                    ? `${revenueCatPackage.identifier} -> ${revenueCatPackage.product.identifier}`
                    : `Add the ${item.id} package to the current RevenueCat offering.`}
                </AppText>
              </View>

              <AppText tone="muted">
                {revenueCatPackage?.product.description || item.detail}
              </AppText>

              <AppButton
                detail={item.detail}
                disabled={
                  !revenueCatPackage || isLoading || activeAction !== null || !isConfigured
                }
                label={
                  activeAction === `purchase-${item.id}`
                    ? 'Processing...'
                    : `Buy ${item.title}`
                }
                onPress={() => {
                  void runAction(`purchase-${item.id}`, async () => {
                    const nextCustomerInfo = await purchasePackageById(item.id);

                    if (nextCustomerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_CONNECTX_PRO]) {
                      showAlert('RevenueCat', `${item.title} unlocked ConnectX Pro.`);
                    }
                  });
                }}
                variant="secondary"
              />
            </View>
          );
        })}
      </View>
    </AppCard>
  );
}
