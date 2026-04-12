export type MatchStatus = 'active' | 'expired';

export type MatchesListStatusFilter = MatchStatus | 'all';

export type MatchListItem = {
  matchId: string;
  status: MatchStatus;
  matchedAt: string;
  expiresAt: string;
  expiresInDays: number;
  hasMessaged: boolean;
  isOnline: boolean;
  conversationId: string | null;
  user: {
    userId: string;
    name: string;
    photoUrl: string | null;
    headline: string;
    location: string;
  };
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
    user: {
      userId: string;
      name: string;
      photoUrl: string | null;
      headline: string;
      location: string;
    };
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
