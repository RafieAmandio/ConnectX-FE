import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { createApiQueryOptions } from '@shared/services/api';

import { mockMyProfileResponse } from '../mock/profile.mock';
import {
  activateMyAccount,
  fetchMyProfile,
  fetchProfileOptions,
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
    ...updateResponse,
    message: updateResponse.message,
    success: updateResponse.success,
    data: {
      ...baseResponse.data,
      ...updateResponse.data,
      talent: {
        ...baseResponse.data.talent,
        ...updateResponse.data.talent,
        sections: {
          ...baseResponse.data.talent.sections,
          ...updateResponse.data.talent.sections,
          about: updateResponse.data.talent.sections.about,
          education: updateResponse.data.talent.sections.education ?? baseResponse.data.talent.sections.education,
          experience: updateResponse.data.talent.sections.experience ?? baseResponse.data.talent.sections.experience,
          personalityAndHobbies:
            updateResponse.data.talent.sections.personalityAndHobbies ??
            baseResponse.data.talent.sections.personalityAndHobbies,
        },
      },
    },
  };
}

export function useMyProfile() {
  return useQuery({
    ...createApiQueryOptions<MyProfileResponse>(profileQueryKeys.me, PROFILE_API.ME),
    queryFn: fetchMyProfile,
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

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async (response) => {
      queryClient.setQueryData<MyProfileResponse>(profileQueryKeys.me, (current) => {
        const baseResponse = current ?? mockMyProfileResponse;
        return mergeProfileResponse(baseResponse, response);
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKeys.me }),
        queryClient.invalidateQueries({ queryKey: ['team'] }),
      ]);
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
