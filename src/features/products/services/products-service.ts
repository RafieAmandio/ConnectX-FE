import { apiFetch } from '@shared/services/api';

import type { ProductsResponse } from '../types/products.types';

export async function fetchProducts() {
  return apiFetch<ProductsResponse>('https://dummyjson.com/products');
}
