import type {
  CreateStartupInvitationRequest,
  CreateStartupInvitationResponse,
  TeamOverviewResponse,
} from '../types/team.types';

function cloneResponse(response: TeamOverviewResponse) {
  return JSON.parse(JSON.stringify(response)) as TeamOverviewResponse;
}

const initialMockResponse: TeamOverviewResponse = {
  success: true,
  data: {
    startup: {
      id: 'stp_local_demo',
      name: 'My Startup',
      description: 'AI-powered supply chain platform for SMEs in Southeast Asia',
      industry: {
        id: 'fintech',
        label: 'Fintech',
      },
      stage: {
        id: 'mvp',
        label: 'MVP',
      },
    },
    teamCompleteness: {
      percent: 50,
      filledRoles: 2,
      targetRoles: 4,
    },
    members: [
      {
        id: 'tm_founder',
        userId: 'usr_founder',
        name: 'Founder',
        role: {
          id: 'business_founder',
          label: 'Business',
        },
        commitment: 'full_time',
        equityPercent: 40,
        isCurrentUser: true,
        avatarUrl: null,
        status: 'active',
      },
      {
        id: 'tm_ardi',
        userId: 'usr_ardi',
        name: 'Ardi Wijaya',
        role: {
          id: 'engineer',
          label: 'Engineering',
        },
        commitment: 'full_time',
        equityPercent: 25,
        isCurrentUser: false,
        avatarUrl:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
        status: 'active',
      },
    ],
    requiredRoles: [
      {
        id: 'product_designer',
        label: 'Product Designer',
        status: 'open',
      },
      {
        id: 'growth_marketer',
        label: 'Growth Marketer',
        status: 'open',
      },
    ],
    missingRoles: [
      {
        id: 'product_designer',
        label: 'Product Designer',
      },
      {
        id: 'growth_marketer',
        label: 'Growth Marketer',
      },
    ],
  },
};

let mockTeamOverviewState = cloneResponse(initialMockResponse);

export function getMockTeamOverviewResponse(startupId = 'stp_local_demo'): TeamOverviewResponse {
  const nextResponse = cloneResponse(mockTeamOverviewState);
  nextResponse.data.startup.id = startupId;
  return nextResponse;
}

export function createMockStartupInvitationResponse(
  payload: CreateStartupInvitationRequest
): CreateStartupInvitationResponse {
  return {
    success: true,
    message: `Invitation sent to ${payload.email.trim().toLowerCase()}`,
    data: {
      invitationId: `inv_${Date.now().toString(36)}`,
      email: payload.email.trim().toLowerCase(),
      status: 'pending',
    },
  };
}
