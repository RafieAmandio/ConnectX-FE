import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppCard, AppPill, AppText } from '@shared/components';

import type { ProductItem } from '../types/products.types';

type ProductCardProps = {
  product: ProductItem;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <AppCard className="gap-4 overflow-hidden p-0">
      <Image
        contentFit="cover"
        source={{ uri: product.thumbnail }}
        style={{ height: 220, width: '100%' }}
      />

      <View className="gap-4 px-5 pb-5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-2">
            <AppPill className="self-start" label={product.category} tone="accent" />
            <AppText variant="title">{product.title}</AppText>
            <AppText tone="muted">
              {product.brand ? `${product.brand} · ${product.sku}` : product.sku}
            </AppText>
          </View>
          <View className="items-end gap-1">
            <AppText tone="accent" variant="label">
              Price
            </AppText>
            <AppText variant="title">${product.price.toFixed(2)}</AppText>
          </View>
        </View>

        <AppText tone="muted">{product.description}</AppText>

        <View className="flex-row flex-wrap gap-2">
          <AppPill label={`${product.rating.toFixed(1)} rating`} tone="neutral" />
          <AppPill label={`${product.stock} in stock`} tone="signal" />
          <AppPill label={`${product.discountPercentage.toFixed(0)}% off`} tone="accent" />
        </View>

        <View className="rounded-[24px] border border-border bg-background p-4">
          <AppText variant="subtitle">Shipping & availability</AppText>
          <AppText className="mt-2" tone="muted">
            {product.availabilityStatus} · {product.shippingInformation}
          </AppText>
        </View>
      </View>
    </AppCard>
  );
}
