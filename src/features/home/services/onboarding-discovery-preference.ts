import 'expo-sqlite/localStorage/install';

import type { DiscoveryMode } from '../types/discovery.types';

const ONBOARDING_DISCOVERY_PREFERENCE_KEY = 'connectx.discovery.onboarding-preference.v1';

type OnboardingDiscoveryAnswerKey =
  | 'q_use_connectx'
  | 'q_bld_type'
  | 'q_builder_type'
  | 'q_fdr_looking'
  | 'q_founder_goal'
  | 'q_su_need';

export type OnboardingDiscoveryPreference = {
  answers: Partial<Record<OnboardingDiscoveryAnswerKey, string>>;
  mode: DiscoveryMode | null;
  updatedAt: string;
};

const ONBOARDING_DISCOVERY_ANSWER_KEYS: OnboardingDiscoveryAnswerKey[] = [
  'q_use_connectx',
  'q_bld_type',
  'q_builder_type',
  'q_fdr_looking',
  'q_founder_goal',
  'q_su_need',
];

function pickOnboardingDiscoveryAnswers(answers: Record<string, unknown>) {
  return ONBOARDING_DISCOVERY_ANSWER_KEYS.reduce<OnboardingDiscoveryPreference['answers']>(
    (result, key) => {
      const value = answers[key];

      if (typeof value === 'string') {
        result[key] = value;
      }

      return result;
    },
    {}
  );
}

export function deriveOnboardingDiscoveryMode(
  answers: Partial<Record<OnboardingDiscoveryAnswerKey, string>>
): DiscoveryMode | null {
  const builderType = answers.q_bld_type ?? answers.q_builder_type;
  const builderGoal = answers.q_fdr_looking ?? answers.q_founder_goal;
  const startupGoal = answers.q_su_need ?? answers.q_founder_goal;
  const useConnectx =
    answers.q_use_connectx ??
    (builderType || answers.q_fdr_looking ? 'builder' : answers.q_su_need ? 'startup' : undefined);

  if (useConnectx === 'startup') {
    switch (startupGoal) {
      case 'cofounder':
      case 'both':
        return 'finding_cofounder';
      case 'team':
      case 'team_members':
        return 'building_team';
      default:
        return null;
    }
  }

  if (useConnectx === 'builder') {
    switch (builderType) {
      case 'founder':
        switch (builderGoal) {
          case 'cofounder':
          case 'both':
            return 'finding_cofounder';
          case 'team':
          case 'team_members':
            return 'building_team';
          default:
            return null;
        }
      case 'cofounder':
      case 'team':
      case 'team_member':
        return 'joining_startups';
      default:
        return null;
    }
  }

  return null;
}

export function saveOnboardingDiscoveryPreference(answers: Record<string, unknown>) {
  try {
    const discoveryAnswers = pickOnboardingDiscoveryAnswers(answers);

    if (Object.keys(discoveryAnswers).length === 0) {
      return;
    }

    const preference: OnboardingDiscoveryPreference = {
      answers: discoveryAnswers,
      mode: deriveOnboardingDiscoveryMode(discoveryAnswers),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(ONBOARDING_DISCOVERY_PREFERENCE_KEY, JSON.stringify(preference));
  } catch (error) {
    console.warn('[onboarding_discovery_preference] save failed', error);
  }
}

export function loadOnboardingDiscoveryPreference(): OnboardingDiscoveryPreference | null {
  try {
    const rawPreference = localStorage.getItem(ONBOARDING_DISCOVERY_PREFERENCE_KEY);

    if (!rawPreference) {
      return null;
    }

    const parsedPreference = JSON.parse(rawPreference) as Partial<OnboardingDiscoveryPreference>;

    if (!parsedPreference.answers || typeof parsedPreference.answers !== 'object') {
      return null;
    }

    const answers = pickOnboardingDiscoveryAnswers(parsedPreference.answers);

    if (Object.keys(answers).length === 0) {
      return null;
    }

    return {
      answers,
      mode: deriveOnboardingDiscoveryMode(answers),
      updatedAt:
        typeof parsedPreference.updatedAt === 'string'
          ? parsedPreference.updatedAt
          : new Date().toISOString(),
    };
  } catch (error) {
    console.warn('[onboarding_discovery_preference] load failed', error);
    return null;
  }
}
