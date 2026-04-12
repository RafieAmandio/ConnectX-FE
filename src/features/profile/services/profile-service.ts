import { apiFetch } from '@shared/services/api';

import type { GetProfileParams, GetProfileResponse } from '../types/profile.types';

export const PROFILE_API = {
  DETAIL: (profileId: string) => `/api/v1/profiles/${profileId}`,
} as const;

export async function fetchProfile({ profileId }: GetProfileParams) {
  return apiFetch<GetProfileResponse>(PROFILE_API.DETAIL(profileId));
}
