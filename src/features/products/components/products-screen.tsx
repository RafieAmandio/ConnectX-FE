import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppCard, AppPill, AppText } from '@shared/components';

import { useProducts } from '../hooks/use-products';
import { ProductCard } from './product-card';

export function ProductsScreen() {
  const { data, error, isLoading, refetch } = useProducts();

  return (
    <>
      <Stack.Screen options={{ title: 'Products' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-4 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <AppCard className="gap-4">
          <AppPill className="self-start" label="React Query Demo" tone="accent" />
          <AppText variant="hero">Feature-based fetching with products.</AppText>
          <AppText tone="muted">
            This screen fetches the DummyJSON products list through the shared API client, a
            feature-local service, and a `useQuery` hook inside the `products` slice.
          </AppText>
        </AppCard>

        {isLoading ? (
          <AppCard tone="muted" className="gap-2">
            <AppText variant="subtitle">Loading products...</AppText>
            <AppText tone="muted">
              React Query is fetching and caching the products response for this feature.
            </AppText>
          </AppCard>
        ) : null}

        {error ? (
          <AppCard tone="signal" className="gap-3">
            <AppText variant="subtitle">Could not load products</AppText>
            <AppText tone="muted">
              {error instanceof Error ? error.message : 'Unknown request error'}
            </AppText>
            <AppText tone="signal" variant="code" onPress={() => void refetch()}>
              Tap here to retry
            </AppText>
          </AppCard>
        ) : null}

        {data ? (
          <>
            <View className="flex-row gap-3">
              <AppCard className="flex-1 gap-2">
                <AppText tone="accent" variant="label">
                  Total
                </AppText>
                <AppText variant="title">{data.total}</AppText>
              </AppCard>
              <AppCard className="flex-1 gap-2">
                <AppText tone="accent" variant="label">
                  Categories
                </AppText>
                <AppText variant="title">
                  {new Set(data.products.map((item) => item.category)).size}
                </AppText>
              </AppCard>
            </View>

            <View className="gap-4">
              {data.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
