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

export type DiscoveryCardBadge = {
  id: string;
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

export type DiscoveryCard = {
  id: string;
  profileId: string;
  photoUrl: string | null;
  name: string;
  age: number | null;
  headline: string;
  location: {
    city: string;
    country: string;
    display: string;
    distanceKm?: number;
  };
  match: {
    score: number;
    label?: string;
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
  searchable?: boolean;
  suffix?: string;
};

export type DiscoveryFilterOption = {
  id: string;
  label: string;
  description?: string;
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
};

export type DiscoveryFilterSection = {
  id: string;
  title: string;
  type: 'single_select' | 'multi_select' | 'group' | string;
  ui: DiscoveryFilterUiConfig;
  options?: DiscoveryFilterOption[];
  fields?: DiscoveryFilterField[];
  defaultValue?: string | string[] | number | boolean;
};

export type DiscoveryFilterOptionsResponse = {
  success: boolean;
  message?: string;
  data: {
    context: {
      mode: DiscoveryMode;
      isPremium: boolean;
    };
    sections: DiscoveryFilterSection[];
  };
};

export type DiscoveryAppliedFilters = Record<string, unknown>;

export type DiscoveryAppliedSearch = {
  filters: DiscoveryAppliedFilters;
  mode: DiscoveryMode | null;
};

export type SwipeActionRequest = {
  action: 'like' | 'pass' | 'super_like';
};

export type SwipeActionResponse = {
  success: boolean;
  message: string;
  data: {
    profileId: string;
    action: SwipeActionRequest['action'];
    isMatch: boolean;
    matchId: string | null;
  };
};
