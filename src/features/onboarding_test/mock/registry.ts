import {
  availabilityStep,
  builderIdentityDetailsStep,
  businessModelStep,
  cashEquityStep,
  cofounderTypeStep,
  credibilityStep,
  dataDiriStep,
  experienceStep,
  founderGoalStep,
  founderSetupStep,
  industriesInterestStep,
  onlinePresenceStep,
  openToRemoteStep,
  ownCofounderTypeStep,
  primaryRoleStep,
  problemSolutionStep,
  rolesNeededStep,
  skillsNeededStep,
  skillsStep,
  startupIdentityDetailsStep,
  startupIndustriesStep,
  teamPresenceStep,
  tractionStep,
  useConnectxStep,
  welcomeStep,
  willingToRelocateStep,
} from './common-steps';
import type {
  LocalizedOnboardingOption,
  LocalizedOnboardingQuestion,
  LocalizedOnboardingStepTemplate,
  LocalizedText,
  OnboardingAnswerValue,
  OnboardingAnswers,
  OnboardingFlowKey,
  OnboardingLocale,
  OnboardingQuestion,
  OnboardingStep,
  OnboardingStepId,
} from '../types/onboarding.types';

export const ONBOARDING_STEP_ORDER: OnboardingStepId[] = [
  'step_welcome',
  'step_data_diri',
  'step_use_connectx',
  'step_identity_details',
  'step_problem_solution',
  'step_startup_industries',
  'step_business_model',
  'step_traction',
  'step_online_presence',
  'step_founder_setup',
  'step_team_presence',
  'step_primary_role',
  'step_experience',
  'step_founder_goal',
  'step_industries_interest',
  'step_own_cofounder_type',
  'step_skills',
  'step_cofounder_type',
  'step_roles_needed',
  'step_skills_needed',
  'step_availability',
  'step_cash_equity',
  'step_open_to_remote',
  'step_willing_to_relocate',
  'step_credibility',
];

export function getEffectiveStepOrder(answers: OnboardingAnswers): OnboardingStepId[] {
  const isBuilderPath = answers.q_use_connectx === 'builder';
  const isStartupPath = answers.q_use_connectx === 'startup';
  const isFounderPath = isBuilderPath && answers.q_builder_type === 'founder';
  const founderGoal = answers.q_founder_goal;
  const wantsCofounder = founderGoal === 'cofounder' || founderGoal === 'both';
  const wantsTeamMembers =
    founderGoal === 'team_members' || founderGoal === 'both';
  const needsCofounderType =
    (isFounderPath && wantsCofounder) || (isStartupPath && wantsCofounder);
  const needsTeamRoles = isFounderPath && wantsTeamMembers;
  const isJoiningCofounderPath =
    isBuilderPath && answers.q_builder_type === 'cofounder';
  const isJoiningTeamPath =
    isBuilderPath && answers.q_builder_type === 'team_member';

  return ONBOARDING_STEP_ORDER.filter((stepId) => {
    if (stepId === 'step_problem_solution') {
      return isStartupPath;
    }
    if (stepId === 'step_startup_industries') {
      return isStartupPath;
    }
    if (stepId === 'step_business_model') {
      return isStartupPath;
    }
    if (stepId === 'step_traction') {
      return isStartupPath;
    }
    if (stepId === 'step_online_presence') {
      return isStartupPath;
    }
    if (stepId === 'step_founder_setup') {
      return isStartupPath;
    }
    if (stepId === 'step_team_presence') {
      return isStartupPath;
    }
    if (stepId === 'step_skills_needed') {
      return isStartupPath;
    }
    if (stepId === 'step_founder_goal') {
      return isFounderPath || isStartupPath;
    }
    if (stepId === 'step_cofounder_type') {
      return needsCofounderType;
    }
    if (stepId === 'step_roles_needed') {
      return needsTeamRoles;
    }
    if (stepId === 'step_own_cofounder_type') {
      return isJoiningCofounderPath;
    }
    if (stepId === 'step_skills') {
      return isJoiningTeamPath;
    }
    if (stepId === 'step_cash_equity') {
      return isJoiningCofounderPath || isJoiningTeamPath;
    }
    if (stepId === 'step_industries_interest') {
      return !isStartupPath;
    }
    if (stepId === 'step_availability') {
      return isBuilderPath;
    }
    if (stepId === 'step_open_to_remote') {
      return isBuilderPath;
    }
    if (stepId === 'step_willing_to_relocate') {
      return isBuilderPath;
    }
    if (stepId === 'step_credibility') {
      return isBuilderPath;
    }
    if (stepId === 'step_primary_role' || stepId === 'step_experience') {
      return isBuilderPath;
    }
    return true;
  });
}

function localizeText(value: LocalizedText | null | undefined, locale: OnboardingLocale) {
  if (!value) {
    return null;
  }

  return value[locale];
}

function localizeOption(option: LocalizedOnboardingOption, locale: OnboardingLocale) {
  return {
    group: localizeText(option.group ?? null, locale),
    icon: option.icon ?? null,
    id: option.id,
    label: option.label[locale],
    sub_label: localizeText(option.sub_label ?? null, locale),
    value: option.value,
  };
}

function localizeQuestion(
  question: LocalizedOnboardingQuestion,
  locale: OnboardingLocale
): OnboardingQuestion {
  return {
    depends_on: question.depends_on,
    helper_text: localizeText(question.helper_text ?? null, locale),
    id: question.id,
    label: question.label[locale],
    meta: question.meta,
    options: question.options?.map((option) => localizeOption(option, locale)),
    placeholder: localizeText(question.placeholder ?? null, locale),
    required: question.required,
    sub_label: localizeText(question.sub_label ?? null, locale),
    type: question.type,
    validation: question.validation,
  };
}

export function resolveFlowKey(answers: OnboardingAnswers): OnboardingFlowKey | null {
  const useConnectx = answers.q_use_connectx;

  if (useConnectx === 'startup') {
    return 'startup_representative';
  }

  const builderType = answers.q_builder_type;

  if (builderType === 'cofounder') {
    return 'builder_cofounder';
  }

  if (builderType === 'team_member') {
    return 'builder_team_member';
  }

  if (builderType !== 'founder') {
    return null;
  }

  const founderGoal = answers.q_founder_goal;

  if (founderGoal === 'cofounder') {
    return 'builder_founder_cofounder';
  }

  if (founderGoal === 'team_members') {
    return 'builder_founder_team_members';
  }

  if (founderGoal === 'both') {
    return 'builder_founder_both';
  }

  return null;
}

export function getStepTemplate(
  stepId: OnboardingStepId,
  answers: OnboardingAnswers
): LocalizedOnboardingStepTemplate {
  switch (stepId) {
    case 'step_welcome':
      return welcomeStep;
    case 'step_data_diri':
      return dataDiriStep;
    case 'step_use_connectx':
      return useConnectxStep;
    case 'step_identity_details':
      return answers.q_use_connectx === 'startup'
        ? startupIdentityDetailsStep
        : builderIdentityDetailsStep;
    case 'step_founder_goal':
      return founderGoalStep;
    case 'step_cofounder_type':
      return cofounderTypeStep;
    case 'step_own_cofounder_type':
      return ownCofounderTypeStep;
    case 'step_roles_needed':
      return rolesNeededStep;
    case 'step_open_to_remote':
      return openToRemoteStep;
    case 'step_willing_to_relocate':
      return willingToRelocateStep;
    case 'step_experience':
      return experienceStep;
    case 'step_industries_interest':
      return industriesInterestStep;
    case 'step_availability':
      return availabilityStep;
    case 'step_primary_role':
      return primaryRoleStep;
    case 'step_skills':
      return skillsStep;
    case 'step_skills_needed':
      return skillsNeededStep;
    case 'step_problem_solution':
      return problemSolutionStep;
    case 'step_startup_industries':
      return startupIndustriesStep;
    case 'step_business_model':
      return businessModelStep;
    case 'step_traction':
      return tractionStep;
    case 'step_online_presence':
      return onlinePresenceStep;
    case 'step_founder_setup':
      return founderSetupStep;
    case 'step_team_presence':
      return teamPresenceStep;
    case 'step_cash_equity':
      return cashEquityStep;
    case 'step_credibility':
      return credibilityStep;
    default:
      return welcomeStep;
  }
}

export function materializeStep(
  stepId: OnboardingStepId,
  answers: OnboardingAnswers,
  locale: OnboardingLocale
): OnboardingStep {
  const template = getStepTemplate(stepId, answers);
  const flowKey = resolveFlowKey(answers) ?? 'common_data_diri';
  const effectiveOrder = getEffectiveStepOrder(answers);
  const effectiveIndex = effectiveOrder.indexOf(stepId);
  const total = effectiveOrder.length;
  const current = effectiveIndex >= 0 ? effectiveIndex + 1 : template.overall_progress.current;

  return {
    can_go_back: template.can_go_back,
    cta: {
      enabled_when: template.cta.enabled_when,
      label: template.cta.label[locale],
    },
    flow_key: flowKey,
    id: template.id,
    overall_progress: { current, total },
    questions: template.questions.map((question) => localizeQuestion(question, locale)),
    section: template.section[locale],
    section_progress: template.section_progress,
    subtitle: localizeText(template.subtitle ?? null, locale),
    title: template.title[locale],
  };
}

export function getStepIndex(stepId: OnboardingStepId, answers: OnboardingAnswers) {
  return getEffectiveStepOrder(answers).indexOf(stepId);
}

export function getNextStepId(stepId: OnboardingStepId, answers: OnboardingAnswers) {
  const order = getEffectiveStepOrder(answers);
  const currentIndex = order.indexOf(stepId);

  if (currentIndex < 0 || currentIndex >= order.length - 1) {
    return null;
  }

  return order[currentIndex + 1];
}

export function getPreviousStepId(stepId: OnboardingStepId, answers: OnboardingAnswers) {
  const order = getEffectiveStepOrder(answers);
  const currentIndex = order.indexOf(stepId);

  if (currentIndex <= 0) {
    return null;
  }

  return order[currentIndex - 1];
}

function asArray(value: OnboardingAnswerValue | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }

  return [];
}

export function evaluateCondition(
  questionValue: OnboardingAnswerValue | undefined,
  operator: string,
  expectedValue?: OnboardingAnswerValue
) {
  switch (operator) {
    case 'equals':
      return questionValue === expectedValue;
    case 'not_equals':
      return questionValue !== expectedValue;
    case 'in':
      return Array.isArray(expectedValue) ? expectedValue.includes(questionValue as never) : false;
    case 'not_in':
      return Array.isArray(expectedValue) ? !expectedValue.includes(questionValue as never) : true;
    case 'contains':
      return asArray(questionValue).includes(expectedValue as string);
    case 'exists':
      return questionValue !== null && questionValue !== undefined && questionValue !== '';
    default:
      return false;
  }
}

export function getVisibleQuestions(step: OnboardingStep, answers: OnboardingAnswers) {
  return step.questions.filter((question) => {
    if (!question.depends_on) {
      return true;
    }

    return evaluateCondition(
      answers[question.depends_on.question_id],
      question.depends_on.operator,
      question.depends_on.value
    );
  });
}

