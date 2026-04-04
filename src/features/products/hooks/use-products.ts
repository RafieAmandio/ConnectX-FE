import { useQuery } from '@tanstack/react-query';

import { createApiQueryOptions } from '@shared/services/api';

import { fetchProducts } from '../services/products-service';
import type { ProductsResponse } from '../types/products.types';

export function useProducts() {
  return useQuery({
    ...createApiQueryOptions<ProductsResponse>(['products'], 'https://dummyjson.com/products'),
    queryFn: fetchProducts,
  });
}
