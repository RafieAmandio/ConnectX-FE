import { apiFetch } from '@shared/services/api';

import type {
  ActivateAccountResponse,
  MyProfileResponse,
  PauseAccountResponse,
  ProfileImageUploadAsset,
  ProfileImageUploadResponse,
  ProfileOptionsResponse,
  RequestAccountDeletionResponse,
  SyncLinkedInProfileRequest,
  SyncLinkedInProfileResponse,
  UpdateMyLinkedInProfileRequest,
  UpdateMyProfileRequest,
  UpdateMyProfileResponse,
  UpdateProfileLocationRequest,
  UpdateProfileLocationResponse,
  UpdateStartupProfileRequest,
  UpdateStartupProfileResponse,
} from '../types/profile.types';

export const PROFILE_API = {
  ACCOUNT_ACTIVATE: '/api/v1/me/account/activate',
  ACCOUNT_DELETION_REQUESTS: '/api/v1/me/account/deletion-requests',
  ACCOUNT_PAUSE: '/api/v1/me/account/pause',
  LOCATION: '/api/v1/profile/location',
  LINKEDIN_SYNC: '/api/v1/auth/linkedin-sync',
  STARTUP: '/api/v1/me/startup',
  ME: '/api/v1/me/profile',
  OPTIONS: '/api/v1/profile-options',
  PUBLIC_DETAIL: (profileId: string) => `/api/v1/profiles/${profileId}`,
  UPLOAD: '/api/v1/upload',
} as const;

function getRecordProperty(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || !(key in value)) {
    return null;
  }

  return (value as Record<string, unknown>)[key];
}

function getUploadUrl(payload: unknown) {
  const directUrl = getRecordProperty(payload, 'url');

  if (typeof directUrl === 'string' && directUrl.trim()) {
    return directUrl.trim();
  }

  const data = getRecordProperty(payload, 'data');
  const dataUrl = getRecordProperty(data, 'url');

  if (typeof dataUrl === 'string' && dataUrl.trim()) {
    return dataUrl.trim();
  }

  const media = getRecordProperty(payload, 'media');
  const mediaUrl = getRecordProperty(media, 'url');

  if (typeof mediaUrl === 'string' && mediaUrl.trim()) {
    return mediaUrl.trim();
  }

  return null;
}

function extractProfileImageFileName(asset: ProfileImageUploadAsset) {
  const fileName = asset.fileName?.trim();

  if (fileName) {
    return fileName;
  }

  const uriFileName = asset.uri.split('/').pop()?.split('?')[0]?.trim();

  return uriFileName || `profile-photo-${Date.now()}.jpg`;
}

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

  const response = await apiFetch<UpdateMyProfileResponse>(PROFILE_API.ME, {
    body: payload as unknown as BodyInit,
    method: 'PATCH',
  });
  console.log('updateMyProfile response:', JSON.stringify(response, null, 2));
  return response;
}

export async function uploadProfileImage(asset: ProfileImageUploadAsset) {
  const formData = new FormData();

  formData.append(
    'file',
    {
      name: extractProfileImageFileName(asset),
      type: asset.mimeType?.trim() || 'image/jpeg',
      uri: asset.uri,
    } as any
  );

  const response = await apiFetch<unknown>(PROFILE_API.UPLOAD, {
    body: formData,
    method: 'POST',
  });
  const url = getUploadUrl(response);

  if (!url) {
    throw new Error('Upload succeeded but did not return an image URL.');
  }

  return { url } satisfies ProfileImageUploadResponse;
}

export async function updateMyLinkedInProfile(payload: UpdateMyLinkedInProfileRequest) {
  const response = await apiFetch<UpdateMyProfileResponse>(PROFILE_API.ME, {
    body: payload as unknown as BodyInit,
    method: 'PATCH',
  });
  console.log('updateMyLinkedInProfile response:', JSON.stringify(response, null, 2));
  return response;
}

export async function syncLinkedInProfile(payload: SyncLinkedInProfileRequest) {
  return apiFetch<SyncLinkedInProfileResponse>(PROFILE_API.LINKEDIN_SYNC, {
    body: payload as unknown as BodyInit,
    method: 'POST',
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

export async function updateStartupProfile(payload: UpdateStartupProfileRequest) {
  return apiFetch<UpdateStartupProfileResponse>(PROFILE_API.STARTUP, {
    body: payload as unknown as BodyInit,
    method: 'PATCH',
  });
}

export async function requestMyAccountDeletion() {
  return apiFetch<RequestAccountDeletionResponse>(PROFILE_API.ACCOUNT_DELETION_REQUESTS, {
    body: {} as unknown as BodyInit,
    method: 'POST',
  });
}
