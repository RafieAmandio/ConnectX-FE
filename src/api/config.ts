const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export function getApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error(
      'Missing EXPO_PUBLIC_API_BASE_URL. Set it before making authenticated API requests.'
    );
  }

  return apiBaseUrl.replace(/\/+$/, '');
}

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
