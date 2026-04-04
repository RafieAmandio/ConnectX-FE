# ConnectX Boilerplate

Expo Router boilerplate organized with a feature-based, vertical-slice architecture.

## Why This Pattern

The project is structured so each feature owns its UI, hooks, services, and types in one place.
That keeps routes thin, makes features easier to delete or move, and gives new engineers a clear
place to start.

## Folder Structure

```txt
app/                         # Expo Router files only
  (auth)/                    # route wrappers for auth flows
  (tabs)/                    # authenticated shell route wrappers
  _layout.tsx                # app providers + root stack
  index.tsx                  # redirect only
  modal.tsx                  # imports one feature screen

src/
  features/                  # vertical slices
    auth/
    home/
    matches/
    products/
    chat/
    team/
    profile/
    design-system/
  shared/                    # reusable cross-feature code
    components/              # design-system primitives
    hooks/                   # generic hooks
    services/api/            # shared fetch + react-query helpers
    theme/                   # shared tokens and navigation theme
    utils/                   # generic helpers
```

## Golden Rules

1. `app/` should only compose route wrappers and import from feature barrels.
2. Features expose a public API through `index.ts` and hide internal details.
3. Shared code must stay feature-agnostic.
4. Cross-feature data fetching goes through the shared API layer, then feature hooks.
5. If a feature can be deleted by removing one folder, the structure is healthy.

## Public Import Style

Use feature barrels:

```tsx
import { LoginScreen } from '@features/auth';
import { ProductsScreen } from '@features/products';
```

Use shared primitives through shared entry points:

```tsx
import { AppCard, AppText } from '@shared/components';
import { apiFetch, createApiQueryOptions } from '@shared/services/api';
```

Avoid deep imports from another feature's internal files.

## Current Aliases

Defined in [tsconfig.json](/Users/dwiki/Development/connectx/tsconfig.json):

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
```

## Data Fetching Pattern

The shared API layer lives in [src/shared/services/api](/Users/dwiki/Development/connectx/src/shared/services/api).

- `apiFetch<T>()` handles requests and authorization headers.
- `createApiQueryOptions()` gives a consistent base for React Query.
- Feature services define endpoint-specific functions.
- Feature hooks call `useQuery` / `useMutation`.
- Feature screens render state.

Example flow from the Products feature:

```ts
// src/features/products/services/products-service.ts
export async function fetchProducts() {
  return apiFetch<ProductsResponse>('https://dummyjson.com/products');
}
```

```ts
// src/features/products/hooks/use-products.ts
export function useProducts() {
  return useQuery({
    ...createApiQueryOptions<ProductsResponse>(['products'], 'https://dummyjson.com/products'),
    queryFn: fetchProducts,
  });
}
```

```tsx
// app/(tabs)/products.tsx
import { ProductsScreen } from '@features/products';

export default function ProductsRoute() {
  return <ProductsScreen />;
}
```

## Products Demo Feature

For presentation purposes, the app now includes a `Products` tab that fetches:

- `https://dummyjson.com/products`

The response is rendered through the current design pattern:

- route wrapper in [app/(tabs)/products.tsx](/Users/dwiki/Development/connectx/app/(tabs)/products.tsx)
- feature screen in [src/features/products/components/products-screen.tsx](/Users/dwiki/Development/connectx/src/features/products/components/products-screen.tsx)
- feature hook in [src/features/products/hooks/use-products.ts](/Users/dwiki/Development/connectx/src/features/products/hooks/use-products.ts)
- feature service in [src/features/products/services/products-service.ts](/Users/dwiki/Development/connectx/src/features/products/services/products-service.ts)

## Running The App

1. Install dependencies

```bash
npm install
```

2. Start Expo

```bash
npx expo start
```

3. Open the authenticated shell and visit the `Products` tab to see the React Query example.

## Notes

- The shared API layer already supports bearer-token injection when auth exists.
- The Products demo uses the exact same shared fetch/query foundation as future real endpoints.
- The current app uses Expo Router, React Query, SecureStore, NativeWind, and feature barrels together.
