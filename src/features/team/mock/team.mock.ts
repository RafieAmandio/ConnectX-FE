import type {
  CreateStartupInvitationRequest,
  CreateStartupInvitationResponse,
  FetchStartupInvitationsResponse,
  RespondToStartupInvitationRequest,
  RespondToStartupInvitationResponse,
  StartupInvitation,
  StartupInvitationOptionsResponse,
  TeamOverviewResponse,
} from '../types/team.types';

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const initialMockResponse: TeamOverviewResponse = {
  success: true,
  data: {
    viewerContext: {
      kind: 'startup_owner',
      hasActiveStartup: true,
      startupId: 'stp_local_demo',
      membershipId: 'tm_founder',
    },
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
        statusLabel: 'Active',
        availableActions: ['edit_role'],
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
        statusLabel: 'Active',
        availableActions: ['edit_role', 'remove'],
      },
    ],
    teamRoster: {
      title: 'Your Team',
      members: [],
      actions: {
        inviteViaLink: true,
        addFromMatches: true,
      },
    },
    myApplications: {
      title: 'My Applications',
      stats: {
        applied: 0,
        inReview: 0,
        interviews: 0,
      },
      items: [],
      actions: {
        browseStartups: false,
        discoverMoreStartups: false,
      },
    },
    teamInvites: {
      title: 'Team Invites',
      items: [
        {
          id: 'inv_sent_maya',
          direction: 'sent',
          startupId: 'stp_local_demo',
          startupName: 'My Startup',
          role: {
            id: 'product_designer',
            label: 'Product Designer',
          },
          email: 'maya@example.com',
          sentAt: '2026-04-23T12:00:00.000Z',
          status: 'pending',
          statusLabel: 'Pending',
          availableActions: ['revoke'],
        },
      ],
    },
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

initialMockResponse.data.teamRoster.members = cloneValue(initialMockResponse.data.members ?? []);

const initialMockPersonResponse: TeamOverviewResponse = {
  success: true,
  data: {
    viewerContext: {
      kind: 'person',
      hasActiveStartup: false,
      startupId: null,
      membershipId: null,
    },
    startup: null,
    teamCompleteness: {
      percent: 0,
      filledRoles: 0,
      targetRoles: 0,
    },
    members: [],
    teamRoster: {
      title: 'Your Team',
      members: [],
      actions: {
        inviteViaLink: false,
        addFromMatches: false,
      },
    },
    myApplications: {
      title: 'My Applications',
      stats: {
        applied: 3,
        inReview: 1,
        interviews: 1,
      },
      items: [
        {
          id: 'app_atlas_cto',
          startupId: 'stp_atlas_commerce',
          startupName: 'PayFlow AI',
          startupInitials: 'PA',
          industryLabel: 'Fintech / AI',
          stageLabel: 'MVP',
          role: {
            id: 'technical_cofounder',
            label: 'Technical Co-Founder',
          },
          openRoles: [
            {
              id: 'technical_cofounder',
              label: 'Technical Co-Founder',
            },
            {
              id: 'backend_engineer',
              label: 'Backend Engineer',
            },
          ],
          matchScore: 94,
          teamMemberCount: 2,
          appliedAt: '2026-04-20T08:30:00.000Z',
          status: 'applied',
          statusLabel: 'Applied',
        },
        {
          id: 'app_klinik_growth',
          startupId: 'stp_klinik_ops',
          startupName: 'GreenCarbon',
          startupInitials: 'G',
          industryLabel: 'Climate Tech',
          stageLabel: 'Idea',
          role: {
            id: 'technical_cofounder',
            label: 'Technical Co-Founder',
          },
          openRoles: [
            {
              id: 'technical_cofounder',
              label: 'Technical Co-Founder',
            },
            {
              id: 'product_designer',
              label: 'Product Designer',
            },
          ],
          matchScore: 87,
          teamMemberCount: 1,
          appliedAt: '2026-04-19T10:00:00.000Z',
          status: 'in_review',
          statusLabel: 'Under Review',
        },
        {
          id: 'app_nusa_product',
          startupId: 'stp_nusa_ai',
          startupName: 'Nusa AI',
          startupInitials: 'NA',
          industryLabel: 'AI / SaaS',
          stageLabel: 'Pre-seed',
          role: {
            id: 'product_cofounder',
            label: 'Product Co-Founder',
          },
          openRoles: [
            {
              id: 'product_cofounder',
              label: 'Product Co-Founder',
            },
            {
              id: 'growth_marketer',
              label: 'Growth Marketer',
            },
          ],
          matchScore: 91,
          teamMemberCount: 3,
          appliedAt: '2026-04-24T14:15:00.000Z',
          status: 'applied',
          statusLabel: 'Applied',
        },
      ],
      actions: {
        browseStartups: true,
        discoverMoreStartups: true,
      },
    },
    teamInvites: {
      title: 'Team Invites',
      items: [
        {
          id: 'inv_atlas_cto',
          direction: 'received',
          startupId: 'stp_atlas_commerce',
          startupName: 'Atlas Commerce',
          role: {
            id: 'technical_cofounder',
            label: 'Technical Co-Founder',
          },
          email: 'builder@connectx.app',
          sentAt: '2026-04-12T09:30:00.000Z',
          status: 'pending',
          statusLabel: 'Pending',
          availableActions: ['accept', 'decline'],
        },
        {
          id: 'inv_klinik_ops',
          direction: 'received',
          startupId: 'stp_klinik_ops',
          startupName: 'KlinikOps',
          role: {
            id: 'growth_marketer',
            label: 'Growth Marketer',
          },
          email: 'builder@connectx.app',
          sentAt: '2026-04-14T03:15:00.000Z',
          status: 'pending',
          statusLabel: 'Pending',
          availableActions: ['accept', 'decline'],
        },
      ],
    },
    requiredRoles: [],
    missingRoles: [],
  },
};

const initialMockInvitations: StartupInvitation[] = [
  {
    id: 'inv_atlas_cto',
    recipientEmail: 'builder@connectx.app',
    status: 'pending',
    sentAt: '2026-04-12T09:30:00.000Z',
    expiresAt: '2026-04-26T09:30:00.000Z',
    startup: {
      id: 'stp_atlas_commerce',
      name: 'Atlas Commerce',
      description: 'B2B commerce tools helping Indonesian distributors manage catalog, credit, and repeat orders.',
      industry: {
        id: 'b2b_saas',
        label: 'B2B SaaS',
      },
      stage: {
        id: 'mvp',
        label: 'MVP',
      },
    },
    inviter: {
      userId: 'usr_nadia',
      name: 'Nadia Prasetyo',
      email: 'nadia@atlascommerce.app',
      avatarUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
      roleLabel: 'Founder',
    },
  },
  {
    id: 'inv_klinik_ops',
    recipientEmail: 'builder@connectx.app',
    status: 'pending',
    sentAt: '2026-04-14T03:15:00.000Z',
    expiresAt: '2026-04-28T03:15:00.000Z',
    startup: {
      id: 'stp_klinik_ops',
      name: 'KlinikOps',
      description: 'Workflow software for multi-branch clinics to manage staffing, patient queues, and finance reconciliation.',
      industry: {
        id: 'healthtech',
        label: 'Healthtech',
      },
      stage: {
        id: 'live',
        label: 'Live',
      },
    },
    inviter: {
      userId: 'usr_ryan',
      name: 'Ryan Kusuma',
      email: 'ryan@klinikops.app',
      avatarUrl:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80',
      roleLabel: 'CEO',
    },
  },
];

let mockTeamOverviewState = cloneValue(initialMockResponse);
let mockPersonOverviewState = cloneValue(initialMockPersonResponse);
let mockStartupInvitationsState = cloneValue(initialMockInvitations);
let mockAcceptedStartupId: string | null = null;

export function getMockTeamOverviewResponse(startupId = 'stp_local_demo'): TeamOverviewResponse {
  const nextResponse = cloneValue(mockTeamOverviewState);
  nextResponse.data.viewerContext.startupId = startupId;

  if (nextResponse.data.startup) {
    nextResponse.data.startup.id = startupId;
  }

  return nextResponse;
}

export function getMockPersonTeamOverviewResponse(): TeamOverviewResponse {
  return cloneValue(mockPersonOverviewState);
}

export function getMockStartupInvitationsResponse(): FetchStartupInvitationsResponse {
  return {
    success: true,
    data: {
      invitations: cloneValue(mockStartupInvitationsState),
    },
  };
}

export function getMockStartupInvitationOptionsResponse(): StartupInvitationOptionsResponse {
  return {
    success: true,
    data: {
      roleOptions: [
        {
          id: 'co_founder',
          label: 'Co-Founder',
        },
        {
          id: 'cto',
          label: 'CTO',
        },
        {
          id: 'engineer',
          label: 'Engineer',
        },
        {
          id: 'product_manager',
          label: 'Product Manager',
        },
        {
          id: 'designer',
          label: 'Designer',
        },
        {
          id: 'marketing',
          label: 'Marketing',
        },
        {
          id: 'operations',
          label: 'Operations',
        },
      ],
      commitmentOptions: [
        {
          id: 'full_time',
          label: 'Full-time',
        },
        {
          id: 'part_time',
          label: 'Part-time',
        },
        {
          id: 'advisor',
          label: 'Advisor',
        },
      ],
      equity: {
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 15,
      },
    },
  };
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

function syncMockOverviewFromInvitation(invitation: StartupInvitation) {
  mockTeamOverviewState = {
    ...mockTeamOverviewState,
    data: {
      ...mockTeamOverviewState.data,
      startup: cloneValue(invitation.startup),
      viewerContext: {
        kind: 'startup_member',
        hasActiveStartup: true,
        startupId: invitation.startup.id,
        membershipId: 'tm_joined_mock',
      },
    },
  };
}

export function getMockAcceptedStartupId() {
  return mockAcceptedStartupId;
}

export function respondToMockStartupInvitation(
  invitationId: string,
  payload: RespondToStartupInvitationRequest
): RespondToStartupInvitationResponse {
  const invitationIndex = mockStartupInvitationsState.findIndex((invitation) => invitation.id === invitationId);

  if (invitationIndex === -1) {
    throw new Error(`Unknown mock invitation: ${invitationId}`);
  }

  const invitation = mockStartupInvitationsState[invitationIndex];
  const actedAt = new Date().toISOString();
  const nextStatus = payload.decision === 'accept' ? 'accepted' : 'denied';

  mockStartupInvitationsState = mockStartupInvitationsState.map((currentInvitation) =>
    currentInvitation.id === invitationId
      ? {
          ...currentInvitation,
          status: nextStatus,
        }
      : currentInvitation
  );

  if (nextStatus === 'accepted') {
    mockAcceptedStartupId = invitation.startup.id;
    syncMockOverviewFromInvitation(invitation);
  }

  mockPersonOverviewState = {
    ...mockPersonOverviewState,
    data: {
      ...mockPersonOverviewState.data,
      teamInvites: {
        ...mockPersonOverviewState.data.teamInvites,
        items: mockPersonOverviewState.data.teamInvites.items.map((currentInvitation) =>
          currentInvitation.id === invitationId
            ? {
                ...currentInvitation,
                status: nextStatus,
                statusLabel: nextStatus === 'accepted' ? 'Accepted' : 'Declined',
                availableActions: [],
              }
            : currentInvitation
        ),
      },
    },
  };

  return {
    success: true,
    message:
      payload.decision === 'accept'
        ? `You joined ${invitation.startup.name}.`
        : `Invitation to ${invitation.startup.name} declined.`,
    data: {
      invitationId,
      status: nextStatus,
      startupId: invitation.startup.id,
      actedAt,
    },
  };
}
