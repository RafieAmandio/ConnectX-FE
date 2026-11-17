import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OnboardingAnswerValue, OnboardingQuestion } from '@features/onboarding_test/types/onboarding.types';
import { apiFetch } from '@shared/services/api';

import { useMyProfile } from './use-profile';

export type OnboardingAnswersStep = {
  id: string;
  section: string;
  title: string;
  subtitle?: string | null;
  questions: OnboardingQuestion[];
};

export type OnboardingAnswersData = {
  steps: OnboardingAnswersStep[];
  completeness: { complete: boolean; missing: { key: string; label: string }[] };
};

type OnboardingAnswersResponse = { success: boolean; message: string; data: OnboardingAnswersData };

const ONBOARDING_ANSWERS_PATH = '/api/v1/me/onboarding-answers';

export const onboardingAnswersQueryKey = ['profile', 'onboarding-answers'] as const;

export function useOnboardingAnswers(enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => apiFetch<OnboardingAnswersResponse>(ONBOARDING_ANSWERS_PATH),
    queryKey: onboardingAnswersQueryKey,
  });
}

export function useUpdateOnboardingAnswers() {
  const queryClient = useQueryClient();

  return useMutation({
    // Send only the answers that changed: the backend ignores re-sent ones anyway.
    mutationFn: (answers: Record<string, OnboardingAnswerValue>) =>
      apiFetch<OnboardingAnswersResponse>(ONBOARDING_ANSWERS_PATH, {
        body: { answers } as unknown as BodyInit,
        method: 'PATCH',
      }),
    onSuccess: async (response) => {
      queryClient.setQueryData(onboardingAnswersQueryKey, response);
      // Answers feed the profile, the cards and the session's completeness.
      await queryClient.invalidateQueries();
    },
  });
}

// "Complete your profile" data for the notice cards: /me/profile has the count,
// onboarding-answers has the labels (only fetched when something is missing).
export function useProfileCompleteness() {
  const myProfileQuery = useMyProfile();
  const profile = myProfileQuery.data?.data;
  const incomplete = profile?.profileCompleteness?.complete === false;
  const answersQuery = useOnboardingAnswers(incomplete);

  return {
    missing: answersQuery.data?.data.completeness.missing ?? [],
    missingCount: incomplete ? profile?.profileCompleteness?.missingCount ?? 0 : 0,
    photoMissing: Boolean(profile) && !profile?.talent?.photoUrl,
  };
}
