import { apiFetch } from '@shared/services/api';

import type {
  ActivateAccountResponse,
  MyProfileResponse,
  PauseAccountResponse,
  ProfileOptionsResponse,
  RequestAccountDeletionResponse,
  UpdateMyLinkedInProfileRequest,
  UpdateMyProfileRequest,
  UpdateMyProfileResponse,
  UpdateProfileLocationRequest,
  UpdateProfileLocationResponse,
} from '../types/profile.types';

export const PROFILE_API = {
  ACCOUNT_ACTIVATE: '/api/v1/me/account/activate',
  ACCOUNT_DELETION_REQUESTS: '/api/v1/me/account/deletion-requests',
  ACCOUNT_PAUSE: '/api/v1/me/account/pause',
  LOCATION: '/api/v1/profile/location',
  ME: '/api/v1/me/profile',
  OPTIONS: '/api/v1/profile-options',
  PUBLIC_DETAIL: (profileId: string) => `/api/v1/profiles/${profileId}`,
} as const;

export async function fetchMyProfile() {
  const response = await apiFetch<MyProfileResponse>(PROFILE_API.ME);
  console.log('fetch profile response', response);

  return response;
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

export async function updateMyLinkedInProfile(payload: UpdateMyLinkedInProfileRequest) {
  return apiFetch<UpdateMyProfileResponse>(PROFILE_API.ME, {
    body: payload as unknown as BodyInit,
    method: 'PATCH',
  });
}

export async function updateProfileLocation(payload: UpdateProfileLocationRequest) {
  return apiFetch<UpdateProfileLocationResponse>(PROFILE_API.LOCATION, {
    body: payload as unknown as BodyInit,
    method: 'PUT',
  });
}

export async function pauseMyAccount() {
  return apiFetch<PauseAccountResponse>(PROFILE_API.ACCOUNT_PAUSE, {
    body: {} as unknown as BodyInit,
    method: 'POST',
  });
}

export async function activateMyAccount() {
  return apiFetch<ActivateAccountResponse>(PROFILE_API.ACCOUNT_ACTIVATE, {
    body: {} as unknown as BodyInit,
    method: 'POST',
  });
}

export async function requestMyAccountDeletion() {
  return apiFetch<RequestAccountDeletionResponse>(PROFILE_API.ACCOUNT_DELETION_REQUESTS, {
    body: {} as unknown as BodyInit,
    method: 'POST',
  });
}
