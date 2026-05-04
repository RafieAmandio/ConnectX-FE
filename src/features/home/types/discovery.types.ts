export type DiscoveryMode =
  | 'finding_cofounder'
  | 'building_team'
  | 'explore_startups'
  | 'joining_startups';

export type DiscoveryGoalId =
  | 'goal_finding_cofounder'
  | 'goal_building_team'
  | 'goal_explore_startups'
  | 'goal_joining_startups';

export type DiscoveryEntityType = 'profile' | 'startup';

export type DiscoveryCardBadge = {
  id?: string;
  label: string;
  icon?: string;
};

export type DiscoveryCardTag = {
  id: string;
  name: string;
  type?: string;
};

export type DiscoveryCardExperience = {
  id: string;
  title: string;
  organization: string;
  period: string;
};

export type DiscoveryCardEducation = {
  id: string;
  degree: string;
  school: string;
};

export type DiscoveryStageJourneyState = 'completed' | 'current' | 'upcoming';

export type DiscoveryStartupJourneyStage = {
  id: string;
  label: string;
  state: DiscoveryStageJourneyState;
};

export type DiscoveryBaseCard = {
  entityType: DiscoveryEntityType;
  id: string;
  name: string;
  match: {
    score: number;
    label?: string;
  };
};

export type DiscoveryProfileCard = DiscoveryBaseCard & {
  entityType: 'profile';
  profileId: string;
  photoUrl: string | null;
  age: number | null;
  headline: string;
  location: {
    city: string;
    country: string;
    display: string;
    distanceKm?: number;
  };
  badges: DiscoveryCardBadge[];
  bio?: string;
  startupIdea?: string;
  interests: DiscoveryCardTag[];
  skills: DiscoveryCardTag[];
  experience?: DiscoveryCardExperience[];
  education?: DiscoveryCardEducation[];
  languages?: string[];
};

export type DiscoveryStartupCard = DiscoveryBaseCard & {
  entityType: 'startup';
  startupId: string;
  logoUrl: string | null;
  badge?: DiscoveryCardBadge;
  founder: {
    name: string;
    title?: string;
  };
  industry: {
    primary: string;
    secondary?: string;
    display: string;
  };
  team: {
    memberCount: number;
    display: string;
  };
  summary: string;
  openRoles: {
    id: string;
    title: string;
  }[];
  lookingFor: string[];
  teamStage: {
    teamSize: number;
    stage: string;
    industry: string;
    hiringCount: number;
  };
  journey: {
    currentStage: string;
    stages: DiscoveryStartupJourneyStage[];
  };
};

export type DiscoveryCard = DiscoveryProfileCard | DiscoveryStartupCard;

export function isDiscoveryProfileCard(card: DiscoveryCard): card is DiscoveryProfileCard {
  return card.entityType === 'profile';
}

export function isDiscoveryStartupCard(card: DiscoveryCard): card is DiscoveryStartupCard {
  return card.entityType === 'startup';
}

export type DiscoveryCardsResponse = {
  success: boolean;
  message: string;
  data: {
    items: DiscoveryCard[];
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type DiscoverySearchContext = {
  mode?: DiscoveryMode;
  [key: string]: unknown;
};

export type DiscoverySearchFilters = Record<string, unknown>;

export type DiscoverySearchPagination = {
  cursor?: string | null;
  limit?: number;
};

export type DiscoveryCardsRequest = {
  context?: DiscoverySearchContext;
  filters?: DiscoverySearchFilters;
  pagination?: DiscoverySearchPagination;
};

export type DiscoveryCardFeedInput = {
  cursor?: string;
  limit?: number;
  request?: Omit<DiscoveryCardsRequest, 'pagination'>;
};

export type DiscoveryFilterUiComponent =
  | 'chips'
  | 'checkbox_list'
  | 'radio_cards'
  | 'switch'
  | 'slider'
  | 'group'
  | string;

export type DiscoveryFilterUiConfig = {
  component: DiscoveryFilterUiComponent;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  placeholder?: string;
  searchable?: boolean;
  suffix?: string;
};

export type DiscoveryFilterOption = {
  id: string;
  label: string;
  description?: string;
  group?: string | null;
  value?: string;
};

export type DiscoveryFilterCatalogOption = {
  id: string;
  label: string;
  group?: string | null;
  value?: string;
};

export type DiscoveryFilterCatalogGroup = {
  id: string;
  label: string;
  options: DiscoveryFilterCatalogOption[];
};

export type DiscoveryFilterQuestionOption = {
  id: string;
  label: string;
  value: string;
  group?: string | null;
};

export type DiscoveryFilterQuestion = {
  id: string;
  type: 'searchable_dropdown' | string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  meta?: {
    searchable?: boolean;
    [key: string]: unknown;
  };
  options: DiscoveryFilterQuestionOption[];
};

export type DiscoveryFilterOptionsResponse = {
  success: true;
  message: string;
  data: {
    mode: DiscoveryMode;
    city?: DiscoveryFilterQuestion;
    industries: DiscoveryFilterCatalogGroup[];
    skills: DiscoveryFilterCatalogGroup[];
    roles: DiscoveryFilterCatalogGroup[];
    languages: DiscoveryFilterCatalogGroup[];
    founderTypes?: DiscoveryFilterCatalogGroup[];
  };
};

export type DiscoveryEntitlement = 'connectx_pro';

export type DiscoveryFilterAccess = {
  requiresEntitlement?: DiscoveryEntitlement;
  enabled?: boolean;
  errorCode?: 'PREMIUM_REQUIRED' | string;
};

export type DiscoveryFilterField = {
  id: string;
  title: string;
  type: 'single_select' | 'multi_select' | 'boolean' | 'range' | string;
  ui: DiscoveryFilterUiConfig;
  options?: DiscoveryFilterOption[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string | string[] | number | boolean;
  placeholder?: string;
  required?: boolean;
};

export type DiscoveryFilterSection = {
  id: string;
  title: string;
  type: 'single_select' | 'multi_select' | 'group' | string;
  access?: DiscoveryFilterAccess;
  ui: DiscoveryFilterUiConfig;
  options?: DiscoveryFilterOption[];
  fields?: DiscoveryFilterField[];
  defaultValue?: string | string[] | number | boolean;
};

export type DiscoveryAppliedFilters = Record<string, unknown>;

export type DiscoveryAppliedSearch = {
  filters: DiscoveryAppliedFilters;
  mode: DiscoveryMode | null;
};

export type DiscoveryConsumableType = 'boost' | 'spotlight';

export type DiscoveryBoostsBalance = {
  remaining: number;
};

export type DiscoverySpotlightWindow = {
  active: boolean;
  startedAt: string | null;
  endsAt: string | null;
  nextEligibleAt: string | null;
};

export type DiscoverySpotlightsBalance = {
  remaining: number;
  current: DiscoverySpotlightWindow;
};

export type DiscoveryConsumablesSnapshot = {
  boosts: DiscoveryBoostsBalance;
  spotlights: DiscoverySpotlightsBalance;
};

export type SwipeActionRequest = {
  action: 'like' | 'pass' | 'super_like';
};

export type SwipeActionSuccessResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    profileId?: string | null;
    startupId?: string | null;
    targetId?: string | null;
    action: SwipeActionRequest['action'];
    isMatch: boolean;
    matchId: string | null;
    consumables?: Pick<DiscoveryConsumablesSnapshot, 'boosts'>;
  };
};

export type SwipeActionErrorCode = 'DISCOVERY_SUPER_LIKE_REQUIRES_BOOST';

export type SwipeActionDeniedResponse = {
  success: false;
  message: string;
  error: {
    code: SwipeActionErrorCode;
    details: {
      id: string;
      profileId?: string | null;
      startupId?: string | null;
      targetId?: string | null;
      action: Extract<SwipeActionRequest['action'], 'super_like'>;
      requiredConsumable: Extract<DiscoveryConsumableType, 'boost'>;
      remaining: number;
    };
  };
};

export type SwipeActionResponse = SwipeActionSuccessResponse;

export type DiscoverySwipeHistoryEntry = {
  action: SwipeActionRequest['action'];
  card: DiscoveryCard;
};

export type RewindActionRequest = Record<string, never>;

export type RewindActionSuccessResponse = {
  success: true;
  message: string;
  data: {
    id: string;
    profileId?: string | null;
    rewoundAction: SwipeActionRequest['action'];
    card: DiscoveryCard;
  };
};

export type RewindActionErrorCode =
  | 'DISCOVERY_REWIND_PREMIUM_REQUIRED'
  | 'DISCOVERY_REWIND_NOT_AVAILABLE';

export type RewindActionDeniedResponse = {
  success: false;
  message: string;
  error: {
    code: RewindActionErrorCode;
    details: {
      id?: string | null;
      profileId?: string | null;
      requiredEntitlement?: 'connectx_pro';
      rewoundAction?: SwipeActionRequest['action'] | null;
      reason?: 'EMPTY_HISTORY' | 'ALREADY_REWOUND' | 'WINDOW_EXPIRED';
    };
  };
};

export type SpotlightActivationRequest = Record<string, never>;

export type SpotlightActivationSuccessResponse = {
  success: true;
  message: string;
  data: {
    active: true;
    startedAt: string;
    endsAt: string;
    remainingSpotlights: number;
  };
};

export type SpotlightActivationErrorCode =
  | 'DISCOVERY_SPOTLIGHT_REQUIRES_CREDIT'
  | 'DISCOVERY_SPOTLIGHT_ALREADY_ACTIVE';

export type SpotlightActivationDeniedResponse = {
  success: false;
  message: string;
  error: {
    code: SpotlightActivationErrorCode;
    details: {
      remaining: number;
      active: boolean;
      endsAt: string | null;
      nextEligibleAt: string | null;
    };
  };
};
