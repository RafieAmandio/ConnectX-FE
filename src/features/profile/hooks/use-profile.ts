import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
        personalityAndHobbies: updateResponse.data.sections.personalityAndHobbies,
      },
      updatedAt: updateResponse.data.updatedAt,
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

      await queryClient.invalidateQueries({ queryKey: profileQueryKeys.me });
    },
  });
}

export function usePauseMyAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pauseMyAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileQueryKeys.me });
    },
  });
}

export function useActivateMyAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activateMyAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileQueryKeys.me });
    },
  });
}

export function useRequestMyAccountDeletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestMyAccountDeletion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileQueryKeys.me });
    },
  });
}
