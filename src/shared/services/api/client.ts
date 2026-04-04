import { buildApiUrl } from './config';

export class ApiError extends Error {
  payload?: unknown;
  status: number;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type ApiClientAuthConfig = {
  getAccessToken?: () => Promise<string | null>;
  onUnauthorized?: () => Promise<void> | void;
};

let apiClientAuthConfig: ApiClientAuthConfig = {};

export function configureApiClient(config: ApiClientAuthConfig) {
  apiClientAuthConfig = {
    ...apiClientAuthConfig,
    ...config,
  };
}

function isPlainJsonBody(value: unknown): value is Record<string, unknown> | unknown[] {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (value instanceof FormData || value instanceof URLSearchParams || value instanceof ArrayBuffer) {
    return false;
  }

  return true;
}

async function parseResponsePayload(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(responseText);
    } catch {
      return responseText;
    }
  }

  return responseText;
}

function getErrorMessage(payload: unknown, fallbackMessage: string) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = payload.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallbackMessage;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await apiClientAuthConfig.getAccessToken?.();
  const headers = new Headers(init.headers);

  headers.set('Accept', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let body = init.body;

  if (isPlainJsonBody(body)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(buildApiUrl(path), {
      ...init,
      body,
      headers,
    });
    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      const message = getErrorMessage(payload, `Request failed with status ${response.status}`);

      if (response.status === 401) {
        await apiClientAuthConfig.onUnauthorized?.();
      }

      throw new ApiError(message, response.status, payload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('Network request failed', 0);
  }
}
