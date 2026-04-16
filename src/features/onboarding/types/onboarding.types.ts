export type OnboardingLocale = 'en' | 'id';

export type OnboardingMode = 'preview' | 'post_auth';

export type OnboardingStatus = 'in_progress' | 'completed';

export type OnboardingFlowKey =
  | 'common_data_diri'
  | 'builder_founder_cofounder'
  | 'builder_founder_team_members'
  | 'builder_founder_both'
  | 'builder_cofounder'
  | 'builder_team_member'
  | 'startup_representative';

export type OnboardingStepId =
  | 'step_welcome'
  | 'step_data_diri'
  | 'step_use_connectx'
  | 'step_identity_details'
  | 'step_problem_solution'
  | 'step_startup_industries'
  | 'step_business_model'
  | 'step_traction'
  | 'step_online_presence'
  | 'step_founder_setup'
  | 'step_team_presence'
  | 'step_primary_role'
  | 'step_experience'
  | 'step_founder_goal'
  | 'step_industries_interest'
  | 'step_cofounder_type'
  | 'step_roles_needed'
  | 'step_own_cofounder_type'
  | 'step_skills'
  | 'step_skills_needed'
  | 'step_availability'
  | 'step_cash_equity'
  | 'step_open_to_remote'
  | 'step_willing_to_relocate'
  | 'step_credibility';

export type LocalizedText = {
  en: string;
  id: string;
};

export type OnboardingQuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'email'
  | 'url'
  | 'phone'
  | 'single_select_card'
  | 'single_select_chip'
  | 'single_select_radio'
  | 'multi_select_card'
  | 'multi_select_chip'
  | 'searchable_multi_select'
  | 'searchable_single_select'
  | 'dropdown'
  | 'searchable_dropdown'
  | 'grouped_list'
  | 'currency_amount'
  | 'segmented';

export type OnboardingConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'exists';

export type CurrencyAmountValue = {
  amount: string;
  currency: string;
};

export type OnboardingAnswerValue = string | number | string[] | CurrencyAmountValue | null;

export type OnboardingAnswers = Record<string, OnboardingAnswerValue | undefined>;

export type OnboardingValidation = {
  max?: number;
  max_length?: number;
  max_selections?: number;
  min?: number;
  min_length?: number;
  min_selections?: number;
};

export type OnboardingDependsOn = {
  operator: OnboardingConditionOperator;
  question_id: string;
  value?: OnboardingAnswerValue;
};

export type OnboardingQuestionMeta = {
  amount_label?: string;
  amount_placeholder?: string;
  auto_advance?: boolean;
  currency_label?: string;
  layout?: 'grid_2' | 'list';
  searchable?: boolean;
};

export type OnboardingOption = {
  group?: string | null;
  icon?: string | null;
  id: string;
  label: string;
  sub_label?: string | null;
  value: string;
};

export type OnboardingQuestion = {
  depends_on?: OnboardingDependsOn;
  helper_text?: string | null;
  id: string;
  label: string;
  meta?: OnboardingQuestionMeta;
  options?: OnboardingOption[];
  placeholder?: string | null;
  required: boolean;
  sub_label?: string | null;
  type: OnboardingQuestionType;
  validation?: OnboardingValidation;
};

export type OnboardingStep = {
  can_go_back: boolean;
  cta: {
    enabled_when: 'always' | 'valid';
    label: string;
  };
  flow_key: OnboardingFlowKey;
  id: OnboardingStepId;
  overall_progress: {
    current: number;
    total: number;
  };
  questions: OnboardingQuestion[];
  section: string;
  section_progress: string;
  subtitle: string | null;
  title: string;
};

export type OnboardingStartParams = {
  actorKey: string;
  locale: OnboardingLocale;
  mode: OnboardingMode;
};

export type OnboardingStartResponse = {
  current_step: OnboardingStep;
  session_id: string;
  status: 'in_progress';
};

export type OnboardingAnswerPayload = {
  answers: OnboardingAnswers;
  step_id: OnboardingStepId;
};

export type OnboardingNextStepResponse = {
  can_go_back: boolean;
  completed?: boolean;
  next_step: OnboardingStep | null;
  profile_id?: string;
  progress?: {
    current: number;
    total: number;
  };
  redirect_to?: string;
};

export type OnboardingValidationErrorResponse = {
  error: 'validation_failed';
  errors: Record<string, string>;
};

export type OnboardingSessionState = {
  actorKey: string;
  answers: OnboardingAnswers;
  completedAt: string | null;
  currentStepId: OnboardingStepId | null;
  flowKey: OnboardingFlowKey | null;
  id: string;
  locale: OnboardingLocale;
  mode: OnboardingMode;
  profileId: string | null;
  redirectTo: string | null;
  startedAt: string;
  status: OnboardingStatus;
  stepHistory: OnboardingStepId[];
  updatedAt: string;
};

export type OnboardingSessionResponse = {
  current_step: OnboardingStep | null;
  session: OnboardingSessionState;
};

export type LocalizedOnboardingOption = Omit<OnboardingOption, 'group' | 'label' | 'sub_label'> & {
  group?: LocalizedText | null;
  label: LocalizedText;
  sub_label?: LocalizedText | null;
};

export type LocalizedOnboardingQuestion = Omit<
  OnboardingQuestion,
  'helper_text' | 'label' | 'options' | 'placeholder' | 'sub_label'
> & {
  helper_text?: LocalizedText | null;
  label: LocalizedText;
  options?: LocalizedOnboardingOption[];
  placeholder?: LocalizedText | null;
  sub_label?: LocalizedText | null;
};

export type LocalizedOnboardingStepTemplate = Omit<
  OnboardingStep,
  'cta' | 'flow_key' | 'questions' | 'section' | 'subtitle' | 'title'
> & {
  cta: {
    enabled_when: 'always' | 'valid';
    label: LocalizedText;
  };
  questions: LocalizedOnboardingQuestion[];
  section: LocalizedText;
  subtitle?: LocalizedText | null;
  title: LocalizedText;
};

