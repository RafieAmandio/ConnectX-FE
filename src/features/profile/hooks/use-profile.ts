import { useQuery } from '@tanstack/react-query';

import { createApiQueryOptions } from '@shared/services/api';

import { fetchProfile, PROFILE_API } from '../services/profile-service';

export function useProfile(profileId: string) {
  return useQuery({
    ...createApiQueryOptions(['profile', profileId], PROFILE_API.DETAIL(profileId)),
    enabled: Boolean(profileId),
    queryFn: () => fetchProfile({ profileId }),
  });
}
