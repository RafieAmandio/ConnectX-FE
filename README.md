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

2. Set the required environment variables

```bash
EXPO_PUBLIC_API_BASE_URL=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_MOCK_SUPERLIKE_NO_BOOST=false
EXPO_PUBLIC_MOCK_SPOTLIGHT_ACTIVATION_RESPONSE=off
EXPO_PUBLIC_REVENUECAT_DISCOVERY_BOOSTS_OFFERING_ID=discovery_boosts
EXPO_PUBLIC_REVENUECAT_DISCOVERY_SPOTLIGHT_OFFERING_ID=discovery_spotlight
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SUPABASE_URL=...
```

Set `EXPO_PUBLIC_MOCK_SUPERLIKE_NO_BOOST=true` in development to force `super_like` to throw the
same `409 DISCOVERY_SUPER_LIKE_REQUIRES_BOOST` payload as the backend denial flow and open the
RevenueCat paywall.

Set `EXPO_PUBLIC_REVENUECAT_DISCOVERY_BOOSTS_OFFERING_ID` if your boost paywall offering uses a
different identifier than `discovery_boosts`.

Set `EXPO_PUBLIC_REVENUECAT_DISCOVERY_SPOTLIGHT_OFFERING_ID` if your spotlight paywall offering
uses a different identifier than `discovery_spotlight`.

Set `EXPO_PUBLIC_MOCK_SPOTLIGHT_ACTIVATION_RESPONSE` to `success`, `no_credit`, or
`already_active` in development to mock the spotlight activation API path on the Matches screen.

3. Start Expo

```bash
npx expo start
```

4. Open the authenticated shell and visit the `Products` tab to see the React Query example.

## Supabase Chat Experiment

The Google login path now creates a Supabase session directly and bypasses the email/WhatsApp
verification screens. Email/password login still uses the existing backend verification flow.

Set up Supabase first:

1. In Supabase Auth, enable Google and use the same Google project/client family as the app.
2. Run [supabase/chat-experiment-setup.sql](/Users/dwiki/Development/connectx/supabase/chat-experiment-setup.sql) in the Supabase SQL editor.
3. Make sure `messages` and `conversation_summaries` are included in the `supabase_realtime` publication.
4. If you use channel Presence/Broadcast, keep the `realtime.messages` policies from the setup script in place so room members can join `room:<uuid>` topics.

The inbox list now reads from `conversation_summaries`, a per-user summary table maintained by
Postgres triggers. Message history still comes from `messages`, and the active room still subscribes
at `room:<conversationId>` for message inserts, typing, and presence.

For the planned Figma-style chat UI database changes, see
[supabase/chat-figma-db-spec.md](/Users/dwiki/Development/connectx/supabase/chat-figma-db-spec.md).

If your backend already uses `public.users` as the profile table, use
[supabase/chat-figma-backend-handoff.md](/Users/dwiki/Development/connectx/supabase/chat-figma-backend-handoff.md)
as the handoff spec and do not add a duplicate `profiles` table.

To apply the first concrete schema step for that design, run
[supabase/chat-figma-schema.sql](/Users/dwiki/Development/connectx/supabase/chat-figma-schema.sql)
after the base chat setup script.

To extend chat from text-only messages to image/video/file messages, run
[supabase/chat-media-message-support.sql](/Users/dwiki/Development/connectx/supabase/chat-media-message-support.sql).

### Two-emulator test flow

1. Run the app on an iPhone simulator and an Android emulator.
2. Sign in with a different Google account on each device.
3. In Supabase SQL editor, run:

```sql
select id, email, created_at
from auth.users
order by created_at desc;
```

4. Copy the two user IDs and replace `USER_ID_ACCOUNT_A` / `USER_ID_ACCOUNT_B` in the seed block
   inside [supabase/chat-experiment-setup.sql](/Users/dwiki/Development/connectx/supabase/chat-experiment-setup.sql).
5. Open `Google Test Room` on both devices.
6. Send a message from device A and confirm device B receives it in realtime.
7. Send a message from device B and confirm device A receives it in realtime.
8. Start typing on one device and confirm the other device sees the typing indicator.
9. Background one device and confirm presence changes on the other device.
10. Restart the app and confirm chat history still loads from Supabase.

## Notes

- The shared API layer already supports bearer-token injection when auth exists.
- The Products demo uses the exact same shared fetch/query foundation as future real endpoints.
- The current app uses Expo Router, React Query, SecureStore, NativeWind, and feature barrels together.
- The discovery consumables contract for `CON-60` is documented in
  [docs/discovery-consumables-contract.md](/Users/dwiki/Development/connectx/docs/discovery-consumables-contract.md).
