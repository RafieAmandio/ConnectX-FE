import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { useViewerContext } from '@features/home/hooks/use-viewer-context';
import type { ViewerContext } from '@features/home/services/discovery-viewer-context';
import { createApiQueryOptions } from '@shared/services/api';

import { mockMyProfileResponse } from '../mock/profile.mock';
import {
  activateMyAccount,
  fetchMyProfile,
  fetchProfileOptions,
  getMyProfilePath,
  pauseMyAccount,
  PROFILE_API,
  requestMyAccountDeletion,
  updateMyProfile,
  updateProfileLocation,
  updateStartupProfile,
  uploadProfileImage,
} from '../services/profile-service';
import type {
  MyProfileResponse,
  ProfileOptionsResponse,
  UpdateMyProfileResponse,
} from '../types/profile.types';

export const profileQueryKeys = {
  me: ['profile', 'me'] as const,
  meByViewerContext: (viewerContext: ViewerContext) => ['profile', 'me', viewerContext] as const,
  options: ['profile', 'options'] as const,
};

async function invalidateAccountStatusQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: profileQueryKeys.me }),
    queryClient.invalidateQueries({ queryKey: ['discovery'] }),
    queryClient.invalidateQueries({ queryKey: ['matches'] }),
    queryClient.invalidateQueries({ queryKey: ['team'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  ]);
}

function mergeProfileResponse(
  baseResponse: MyProfileResponse,
  updateResponse: UpdateMyProfileResponse
): MyProfileResponse {
  return {
    ...baseResponse,
    message: updateResponse.message,
    success: updateResponse.success,
    data: {
      ...baseResponse.data,
      id: updateResponse.data.id,
      name: updateResponse.data.name,
      headline: updateResponse.data.headline,
      photoUrl: updateResponse.data.photoUrl,
      location: updateResponse.data.location,
      sections: {
        ...baseResponse.data.sections,
        about: updateResponse.data.sections.about,
        education: updateResponse.data.sections.education ?? baseResponse.data.sections.education,
        experience: updateResponse.data.sections.experience ?? baseResponse.data.sections.experience,
        personalityAndHobbies:
          updateResponse.data.sections.personalityAndHobbies ?? baseResponse.data.sections.personalityAndHobbies,
      },
      updatedAt: updateResponse.data.updatedAt,
    },
  };
}

export function useMyProfile() {
  const viewerContext = useViewerContext();

  return useQuery({
    ...createApiQueryOptions<MyProfileResponse>(
      profileQueryKeys.meByViewerContext(viewerContext),
      getMyProfilePath(viewerContext)
    ),
    queryFn: () => fetchMyProfile(viewerContext),
  });
}

export function useProfileOptions(enabled = true) {
  return useQuery({
    ...createApiQueryOptions<ProfileOptionsResponse>(profileQueryKeys.options, PROFILE_API.OPTIONS),
    enabled,
    queryFn: fetchProfileOptions,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const viewerContext = useViewerContext();

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async (response) => {
      queryClient.setQueryData<MyProfileResponse>(
        profileQueryKeys.meByViewerContext(viewerContext),
        (current) => {
          const baseResponse = current ?? mockMyProfileResponse;
          return mergeProfileResponse(baseResponse, response);
        }
      );

      await queryClient.invalidateQueries({ queryKey: profileQueryKeys.me });
    },
  });
}

export function useUploadProfileImage() {
  return useMutation({
    mutationFn: uploadProfileImage,
  });
}

export function useUpdateProfileLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfileLocation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileQueryKeys.me });
    },
  });
}

export function useUpdateStartupProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStartupProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileQueryKeys.me });
    },
  });
}

export function usePauseMyAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pauseMyAccount,
    onSuccess: async () => {
      await invalidateAccountStatusQueries(queryClient);
    },
  });
}

export function useActivateMyAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activateMyAccount,
    onSuccess: async () => {
      await invalidateAccountStatusQueries(queryClient);
    },
  });
}

export function useRequestMyAccountDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestMyAccountDeletion,
    onSuccess: async () => {
      await invalidateAccountStatusQueries(queryClient);
    },
  });
}
