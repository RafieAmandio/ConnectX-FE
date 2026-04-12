import { apiFetch } from '@shared/services/api';

import type {
  MyProfileResponse,
  ProfileOptionsResponse,
  UpdateMyProfileRequest,
  UpdateMyProfileResponse,
} from '../types/profile.types';

export const PROFILE_API = {
  ME: '/api/v1/me/profile',
  OPTIONS: '/api/v1/profile-options',
  PUBLIC_DETAIL: (profileId: string) => `/api/v1/profiles/${profileId}`,
} as const;

export async function fetchMyProfile() {
  return apiFetch<MyProfileResponse>(PROFILE_API.ME);
}

export async function fetchProfileOptions() {
  return apiFetch<ProfileOptionsResponse>(PROFILE_API.OPTIONS);
}

export async function updateMyProfile(payload: UpdateMyProfileRequest) {
  console.log('updateMyProfile payload', payload);

  return apiFetch<UpdateMyProfileResponse>(PROFILE_API.ME, {
    body: payload as unknown as BodyInit,
    method: 'PATCH',
  });
}
