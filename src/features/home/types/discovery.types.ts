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

export type DiscoveryCardsQueryParams = {
  cursor?: string;
  limit?: number;
};
