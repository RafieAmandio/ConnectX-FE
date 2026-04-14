export type MatchStatus = 'active' | 'expired';

export type MatchesListStatusFilter = MatchStatus | 'all';

export type MatchUserSummary = {
  userId: string;
  name: string;
  photoUrl: string | null;
  headline: string;
  location: string;
};

export type LikesYouListItem = {
  likeId: string;
  likedAt: string;
  user: MatchUserSummary;
};

export type MatchListItem = {
  matchId: string;
  status: MatchStatus;
  matchedAt: string;
  expiresAt: string;
  expiresInDays: number;
  hasMessaged: boolean;
  isOnline: boolean;
  conversationId: string | null;
  user: MatchUserSummary;
  fitSummary: {
    score: number;
    label: string;
    insight?: string;
  };
  actions: {
    canChat: boolean;
    canViewAnalysis: boolean;
  };
};

export type MatchesListResponse = {
  success: boolean;
  message: string;
  data: {
    likesYou: {
      items: LikesYouListItem[];
      totalNew: number;
      locked: boolean;
    };
    items: MatchListItem[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export type MatchAnalysisResponse = {
  success: boolean;
  message: string;
  data: {
    matchId: string;
    conversationId: string | null;
    status: MatchStatus;
    generatedAt: string;
    user: MatchUserSummary;
    analysis: {
      compatibilityScore: number;
      label: string;
      subtitle: string;
      skillComplementarity?: {
        title: string;
        youBring: string[];
        theyBring: string[];
        summary?: string;
      };
      startupVisionAlignment?: {
        title: string;
        sharedInterests: string[];
      };
      commitmentCompatibility?: {
        title: string;
        you: string;
        them: string;
      };
      workStyle?: {
        title: string;
        traits: string[];
      };
      potentialRisks?: {
        title: string;
        items: string[];
      };
      suggestedRoles?: {
        title: string;
        you: string;
        them: string;
      };
      suggestedTeamStructure?: {
        title: string;
        roles: string[];
      };
    };
  };
};

export type MatchesListQueryParams = {
  limit?: number;
  page?: number;
  status?: MatchesListStatusFilter;
};

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
