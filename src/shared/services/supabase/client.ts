import 'expo-sqlite/localStorage/install';
import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { createClient, type Session } from '@supabase/supabase-js';

import { isExpoDevModeEnabled } from '@shared/utils/env';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const SUPABASE_TOKEN_KEY = 'connectx.supabase.access-token';

if (!supabaseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL. Set it before using Supabase-backed auth or chat.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Set it before using Supabase-backed auth or chat.'
  );
}

if (supabaseAnonKey.startsWith('sb_secret_')) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY must be the public anon/publishable key, not a secret service key.'
  );
}

type StoredSupabaseJwtPayload = {
  email?: unknown;
  sub?: unknown;
  user_metadata?: {
    full_name?: unknown;
    name?: unknown;
  } | null;
};

let storedSupabaseAccessToken: string | null | undefined;

function isMissingSupabaseAuthUserError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes('user from sub claim in jwt does not exist')
  );
}

function createRealtimeOptions() {
  return {
    heartbeatCallback: (status: string, latency?: number | null) => {
      if (!isExpoDevModeEnabled()) {
        return;
      }

      console.log('[supabase:realtime-heartbeat]', {
        latency: latency ?? null,
        status,
      });
    },
    logger: (kind: string, msg: string, data?: unknown) => {
      if (!isExpoDevModeEnabled()) {
        return;
      }

      const normalizedMessage = `${kind} ${msg}`.toLowerCase();
      const shouldLog =
        kind === 'error' ||
        normalizedMessage.includes('transport') ||
        normalizedMessage.includes('postgres_changes') ||
        normalizedMessage.includes('presence') ||
        normalizedMessage.includes('phx_reply');

      if (!shouldLog) {
        return;
      }

      console.log('[supabase:realtime-log]', {
        data: data ?? null,
        kind,
        msg,
      });
    },
  };
}

function normalizeSupabaseToken(token?: string | null) {
  return token?.trim() || null;
}

async function getStoredSupabaseAccessToken() {
  if (storedSupabaseAccessToken !== undefined) {
    return storedSupabaseAccessToken;
  }

  const token = await SecureStore.getItemAsync(SUPABASE_TOKEN_KEY);
  storedSupabaseAccessToken = normalizeSupabaseToken(token);

  return storedSupabaseAccessToken;
}

export async function setStoredSupabaseAccessToken(token?: string | null) {
  const normalizedToken = normalizeSupabaseToken(token);

  storedSupabaseAccessToken = normalizedToken;

  if (normalizedToken) {
    await SecureStore.setItemAsync(SUPABASE_TOKEN_KEY, normalizedToken);
    return;
  }

  await SecureStore.deleteItemAsync(SUPABASE_TOKEN_KEY);
}

async function resolveSupabaseAccessToken() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (!error && data.session?.access_token) {
      return data.session.access_token;
    }
  } catch {
    // Fall through to the manually persisted token for backend-issued JWTs.
  }

  return getStoredSupabaseAccessToken();
}

async function applyRealtimeAuthToken(token?: string | null) {
  const normalizedToken = normalizeSupabaseToken(token);

  await Promise.all([
    supabase.realtime.setAuth(normalizedToken),
    supabaseData.realtime.setAuth(normalizedToken),
  ]);
}

function decodeJwtPayloadSegment(segment: string) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const decodeBase64 = globalThis.atob;

  if (typeof decodeBase64 !== 'function') {
    return null;
  }

  const binary = decodeBase64(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function parseStoredSupabaseJwt(token: string): StoredSupabaseJwtPayload | null {
  const [, payloadSegment] = token.split('.');

  if (!payloadSegment) {
    return null;
  }

  try {
    const decodedPayload = decodeJwtPayloadSegment(payloadSegment);

    if (!decodedPayload) {
      return null;
    }

    const parsedPayload = JSON.parse(decodedPayload) as unknown;

    if (!parsedPayload || typeof parsedPayload !== 'object') {
      return null;
    }

    return parsedPayload as StoredSupabaseJwtPayload;
  } catch {
    return null;
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: createRealtimeOptions(),
});

export const supabaseData = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: resolveSupabaseAccessToken,
  realtime: createRealtimeOptions(),
});

export async function getSupabaseSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    if (isMissingSupabaseAuthUserError(error)) {
      await clearSupabaseSession();
      return null;
    }

    throw error;
  }

  return data.session;
}

export async function syncSupabaseRealtimeAuth(session?: Session | null) {
  await applyRealtimeAuthToken(session?.access_token ?? null);
}

export async function setSupabaseRealtimeToken(token?: string | null) {
  const normalizedToken = normalizeSupabaseToken(token);

  if (normalizedToken) {
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error && error.name.toLowerCase() !== 'authsessionmissingerror') {
      throw error;
    }
  }

  await setStoredSupabaseAccessToken(token);
  await applyRealtimeAuthToken(token);
}

export async function setSupabaseSession(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  if (error) {
    throw error;
  }

  await setStoredSupabaseAccessToken(data.session?.access_token ?? tokens.accessToken);
  await syncSupabaseRealtimeAuth(data.session ?? null);

  return data.session;
}

export async function signOutSupabase() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  await setStoredSupabaseAccessToken(null);
  await applyRealtimeAuthToken(null);
}

export async function clearSupabaseSession() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error) {
    throw error;
  }

  await setStoredSupabaseAccessToken(null);
  await applyRealtimeAuthToken(null);
}

export async function requireSupabaseUser() {
  const session = await getSupabaseSession();

  if (!session?.user) {
    throw new Error('A Supabase user session is required for this action.');
  }

  return session.user;
}

export async function getStoredSupabaseIdentity() {
  const token = await getStoredSupabaseAccessToken();

  if (!token) {
    return null;
  }

  const payload = parseStoredSupabaseJwt(token);

  if (!payload || typeof payload.sub !== 'string') {
    return null;
  }

  const normalizedEmail =
    typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
  const displayName =
    typeof payload.user_metadata?.full_name === 'string'
      ? payload.user_metadata.full_name.trim()
      : typeof payload.user_metadata?.name === 'string'
        ? payload.user_metadata.name.trim()
        : null;

  return {
    displayName: displayName || null,
    email: normalizedEmail,
    userId: payload.sub.trim(),
  };
}

export async function debugLogSupabaseUsersProbe() {
  if (!isExpoDevModeEnabled()) {
    return;
  }

  const { data, error } = await supabaseData.from('users').select('*');

  if (error) {
    console.log('[supabase:probe:users:error]', {
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
      message: error.message,
    });
    return;
  }

  console.log('[supabase:probe:users:success]', {
    data: data ?? [],
    rowCount: data?.length ?? 0,
  });
}
