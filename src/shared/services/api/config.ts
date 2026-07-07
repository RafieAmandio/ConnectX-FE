const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const profileApiFallbackBaseUrl = process.env.EXPO_PUBLIC_PROFILE_API_FALLBACK_BASE_URL?.trim();

export function getApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error(
      'Missing EXPO_PUBLIC_API_BASE_URL. Set it before making authenticated API requests.'
    );
  }

  return apiBaseUrl.replace(/\/+$/, '');
}

export function getProfileApiFallbackBaseUrl() {
  if (!profileApiFallbackBaseUrl) {
    return null;
  }

  return profileApiFallbackBaseUrl.replace(/\/+$/, '');
}

export function buildApiUrl(path: string, baseUrl = getApiBaseUrl()) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
}
