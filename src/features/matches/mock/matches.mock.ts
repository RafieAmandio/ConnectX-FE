import type {
  LikesYouListItem,
  MatchAnalysisResponse,
  MatchListItem,
  MatchesListResponse,
} from '../types/matches.types';
import { mockDiscoveryCardsResponsesByMode } from '@features/home/mock/discovery.mock';
import { isDiscoveryStartupCard } from '@features/home/types/discovery.types';

export type MockMatchesSeedVariant = 'individual' | 'startup';

const likesYouBlueprints = [
  {
    likeId: 'like_201',
    likedAt: '2026-04-13T03:20:00Z',
    userId: 'usr_like_201',
    name: 'Sinta Prameswari',
    photoUrl: 'https://i.pravatar.cc/512?img=47',
    headline: 'Brand Strategist',
    location: 'Jakarta, Indonesia',
  },
  {
    likeId: 'like_202',
    likedAt: '2026-04-13T08:45:00Z',
    userId: 'usr_like_202',
    name: 'Daniel Koh',
    photoUrl: 'https://i.pravatar.cc/512?img=15',
    headline: 'Founding Engineer',
    location: 'Singapore',
  },
  {
    likeId: 'like_203',
    likedAt: '2026-04-14T01:10:00Z',
    userId: 'usr_like_203',
    name: 'Alya Rahman',
    photoUrl: 'https://i.pravatar.cc/512?img=23',
    headline: 'Product Designer',
    location: 'Bandung, Indonesia',
  },
  {
    likeId: 'like_204',
    likedAt: '2026-04-14T05:05:00Z',
    userId: 'usr_like_204',
    name: 'Marcus Tan',
    photoUrl: null,
    headline: 'Growth Lead',
    location: 'Kuala Lumpur, Malaysia',
  },
] as const;

const matchBlueprints = [
  {
    matchId: 'mtc_789',
    conversationId: 'conv_ardi_wijaya',
    userId: 'usr_123',
    name: 'Ardi Wijaya',
    photoUrl: 'https://i.pravatar.cc/512?img=12',
    headline: 'Full-Stack Engineer',
    location: 'Jakarta, Indonesia',
    status: 'active',
    matchedAt: '2026-04-10T08:00:00Z',
    expiresAt: '2026-04-17T08:00:00Z',
    expiresInDays: 6,
    hasMessaged: false,
    isOnline: true,
    score: 87,
    label: 'Strong Founding Team Fit',
    insight: 'Business + technical founder pairing with strong startup alignment.',
    youBring: ['Strategy', 'Business Development', 'Fundraising'],
    theyBring: ['React', 'Node.js', 'PostgreSQL'],
    sharedInterests: ['FinTech', 'AI/ML', 'SaaS'],
    youCommitment: 'Full-time',
    themCommitment: 'Full-time',
    workStyle: ['Remote', 'Hybrid', 'Fast builder', 'Experimental'],
    risks: ['Different time zones', 'Different startup experience levels'],
    youRole: 'CEO',
    themRole: 'CTO',
    teamStructure: ['CEO', 'CTO', 'Product Designer', 'Growth Marketer'],
  },
  {
    matchId: 'mtc_790',
    conversationId: 'conv_maya_chen',
    userId: 'usr_456',
    name: 'Maya Chen',
    photoUrl: 'https://i.pravatar.cc/512?img=32',
    headline: 'Product Strategist',
    location: 'Singapore',
    status: 'active',
    matchedAt: '2026-04-11T07:30:00Z',
    expiresAt: '2026-04-18T07:30:00Z',
    expiresInDays: 5,
    hasMessaged: true,
    isOnline: false,
    score: 92,
    label: 'High Vision Alignment',
    insight: 'Strong product and founder-ops overlap with clean strategic fit.',
    youBring: ['Go-to-Market', 'Fundraising', 'Partnerships'],
    theyBring: ['Product Strategy', 'User Research', 'Growth Loops'],
    sharedInterests: ['B2B SaaS', 'Marketplaces', 'AI/ML'],
    youCommitment: 'Full-time',
    themCommitment: 'Part-time',
    workStyle: ['Async', 'Structured', 'Research-driven'],
    risks: ['Different commitment levels'],
    youRole: 'CEO',
    themRole: 'CPO',
    teamStructure: ['CEO', 'CPO', 'Founding Engineer', 'Growth Lead'],
  },
  {
    matchId: 'mtc_791',
    conversationId: 'conv_ghi',
    userId: 'usr_789',
    name: 'Nina Patel',
    photoUrl: 'https://i.pravatar.cc/512?img=5',
    headline: 'Growth Operator',
    location: 'Bangalore, India',
    status: 'active',
    matchedAt: '2026-04-12T06:00:00Z',
    expiresAt: '2026-04-19T06:00:00Z',
    expiresInDays: 6,
    hasMessaged: false,
    isOnline: true,
    score: 91,
    label: 'Execution-Heavy Match',
    insight: 'Strong growth execution fit with fast iteration potential.',
    youBring: ['Strategy', 'Sales', 'Fundraising'],
    theyBring: ['Growth', 'Analytics', 'Experimentation'],
    sharedInterests: ['FinTech', 'SaaS', 'Analytics'],
    youCommitment: 'Full-time',
    themCommitment: 'Full-time',
    workStyle: ['Data-driven', 'Fast builder', 'Experimental'],
    risks: ['Similar operating tempo may need clearer ownership'],
    youRole: 'CEO',
    themRole: 'Growth Lead',
    teamStructure: ['CEO', 'Growth Lead', 'Founding Engineer', 'Designer'],
  },
] as const;

export const mockIndividualMatchesListResponse: MatchesListResponse = {
  success: true,
  message: 'Matches fetched successfully',
  data: {
    likesYou: {
      items: likesYouBlueprints.map<LikesYouListItem>((item) => ({
        likeId: item.likeId,
        likedAt: item.likedAt,
        user: {
          userId: item.userId,
          name: item.name,
          photoUrl: item.photoUrl,
          headline: item.headline,
          location: item.location,
        },
      })),
      totalNew: likesYouBlueprints.length,
      locked: true,
    },
    items: matchBlueprints.map<MatchListItem>((item) => ({
      matchId: item.matchId,
      status: item.status,
      matchedAt: item.matchedAt,
      expiresAt: item.expiresAt,
      expiresInDays: item.expiresInDays,
      hasMessaged: item.hasMessaged,
      isOnline: item.isOnline,
      conversationId: item.conversationId,
      user: {
        userId: item.userId,
        name: item.name,
        photoUrl: item.photoUrl,
        headline: item.headline,
        location: item.location,
      },
      fitSummary: {
        score: item.score,
        label: item.label,
        insight: item.insight,
      },
      actions: {
        canChat: true,
        canViewAnalysis: true,
      },
    })),
    total: matchBlueprints.length,
    page: 1,
    limit: 10,
    hasMore: false,
  },
};

export const mockIndividualMatchAnalysisById: Record<string, MatchAnalysisResponse> = Object.fromEntries(
  matchBlueprints.map((item) => [
    item.matchId,
    {
      success: true,
      message: 'Match analysis fetched successfully',
      data: {
        matchId: item.matchId,
        conversationId: item.conversationId,
        status: item.status,
        generatedAt: '2026-04-13T10:00:00.000Z',
        user: {
          userId: item.userId,
          name: item.name,
          photoUrl: item.photoUrl,
          headline: item.headline,
          location: item.location,
        },
        analysis: {
          compatibilityScore: item.score,
          label: item.label,
          subtitle: `You & ${item.name}`,
          skillComplementarity: {
            title: 'Skill Complementarity',
            youBring: [...item.youBring],
            theyBring: [...item.theyBring],
            summary: 'Your skills complement each other well for building a technology startup.',
          },
          startupVisionAlignment: {
            title: 'Startup Vision Alignment',
            sharedInterests: [...item.sharedInterests],
          },
          commitmentCompatibility: {
            title: 'Commitment Compatibility',
            you: item.youCommitment,
            them: item.themCommitment,
          },
          workStyle: {
            title: 'Work Style',
            traits: [...item.workStyle],
          },
          potentialRisks: {
            title: 'Potential Risks',
            items: [...item.risks],
          },
          suggestedRoles: {
            title: 'Suggested Roles',
            you: item.youRole,
            them: item.themRole,
          },
          suggestedTeamStructure: {
            title: 'Suggested Team Structure',
            roles: [...item.teamStructure],
          },
        },
      },
    },
  ])
);

const startupMatchCards = mockDiscoveryCardsResponsesByMode.joining_startups.data.items
  .filter(isDiscoveryStartupCard)
  .slice(0, 4);

const startupMatches = startupMatchCards.slice(0, 3).map((card, index) => {
  const normalizedStartupId = card.startupId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const role = card.openRoles[0]?.title ?? card.lookingFor[0] ?? 'Early Team Member';
  const matchedAt = new Date(Date.UTC(2026, 3, 13 + index, 7, 0, 0)).toISOString();
  const expiresAt = new Date(Date.UTC(2026, 3, 20 + index, 7, 0, 0)).toISOString();

  return {
    actions: {
      canChat: true,
      canViewAnalysis: true,
    },
    conversationId: `conv_startup_${normalizedStartupId}`,
    expiresAt,
    expiresInDays: 6 - Math.min(index, 2),
    fitSummary: {
      score: card.match.score,
      label: card.match.label ?? 'Strong Startup Fit',
      insight: `You connected with ${card.name} for ${role}.`,
    },
    hasMessaged: index === 0,
    isOnline: index !== 1,
    matchedAt,
    matchId: `mtc_startup_${normalizedStartupId}`,
    status: 'active',
    user: {
      userId: card.startupId,
      name: card.name,
      photoUrl: card.logoUrl,
      headline: role,
      location: card.industry.display,
    },
    card,
    role,
  } satisfies MatchListItem & {
    card: typeof card;
    role: string;
  };
});

export const mockStartupMatchesListResponse: MatchesListResponse = {
  ...mockIndividualMatchesListResponse,
  data: {
    ...mockIndividualMatchesListResponse.data,
    likesYou: {
      items: startupMatchCards.map<LikesYouListItem>((card, index) => ({
        likeId: `like_startup_${card.startupId}`,
        likedAt: new Date(Date.UTC(2026, 3, 13 + index, 4, 30, 0)).toISOString(),
        user: {
          userId: card.startupId,
          name: card.name,
          photoUrl: card.logoUrl,
          headline: card.openRoles[0]?.title ?? card.lookingFor[0] ?? 'Startup team',
          location: card.industry.display,
        },
      })),
      locked: true,
      totalNew: startupMatchCards.length,
    },
    items: startupMatches.map(({ card, role, ...match }) => match),
    total: startupMatches.length,
  },
};

export const mockStartupMatchAnalysisById: Record<string, MatchAnalysisResponse> = Object.fromEntries(
  startupMatches.map(({ card, role, ...match }) => [
    match.matchId,
    {
      success: true,
      message: 'Match analysis fetched successfully',
      data: {
        matchId: match.matchId,
        conversationId: match.conversationId,
        status: match.status,
        generatedAt: '2026-04-13T10:00:00.000Z',
        user: match.user,
        analysis: {
          compatibilityScore: card.match.score,
          label: card.match.label ?? 'Strong Startup Fit',
          subtitle: `You & ${card.name}`,
          skillComplementarity: {
            title: 'Role Fit',
            youBring: ['Founder energy', 'Execution', 'Startup interest'],
            theyBring: [role, ...card.lookingFor],
            summary: card.summary,
          },
          startupVisionAlignment: {
            title: 'Startup Vision Alignment',
            sharedInterests: [card.industry.primary, card.industry.secondary].filter(
              (value): value is string => Boolean(value)
            ),
          },
          suggestedRoles: {
            title: 'Suggested Roles',
            you: role,
            them: card.founder.title ?? 'Founder',
          },
          suggestedTeamStructure: {
            title: 'Suggested Team Structure',
            roles: card.openRoles.map((openRole) => openRole.title),
          },
        },
      },
    },
  ])
);

export const mockMatchesListResponse = mockIndividualMatchesListResponse;
export const mockMatchAnalysisById = mockIndividualMatchAnalysisById;

export function getMockMatchesListResponse(seedVariant: MockMatchesSeedVariant) {
  return seedVariant === 'startup'
    ? mockStartupMatchesListResponse
    : mockIndividualMatchesListResponse;
}

export function getFallbackMatchAnalysis(
  matchId: string,
  seedVariant: MockMatchesSeedVariant = 'individual'
) {
  const analysisById =
    seedVariant === 'startup' ? mockStartupMatchAnalysisById : mockIndividualMatchAnalysisById;

  return (
    analysisById[matchId] ??
    mockStartupMatchAnalysisById[matchId] ??
    mockIndividualMatchAnalysisById[matchId] ??
    (seedVariant === 'startup'
      ? mockStartupMatchAnalysisById.mtc_startup_startup_payflow_ai
      : mockIndividualMatchAnalysisById.mtc_789)
  );
}
