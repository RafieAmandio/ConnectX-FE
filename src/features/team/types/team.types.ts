export type TeamEntityOption = {
  id: string;
  label: string;
};

export type TeamRole = TeamEntityOption;

export type MissingRole = TeamEntityOption;

export type TeamInviteCommitment = 'full_time' | 'part_time' | 'advisor';

export type TeamMemberCommitment = TeamInviteCommitment | 'flexible' | string;

export type TeamMemberStatus = 'active' | 'pending' | 'inactive' | string;

export type ViewerContextKind = 'person' | 'startup_owner' | 'startup_member' | string;

export type TeamMemberAction = 'edit_role' | 'remove' | string;

export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  role: TeamRole;
  commitment: TeamMemberCommitment;
  equityPercent: number;
  isCurrentUser?: boolean;
  avatarUrl: string | null;
  status: TeamMemberStatus;
  statusLabel?: string;
  availableActions?: TeamMemberAction[];
};

export type RequiredRole = TeamRole & {
  status: 'open' | 'filled' | string;
};

export type StartupTeamOverview = {
  id: string;
  name: string;
  description: string;
  industry: TeamEntityOption;
  stage: TeamEntityOption;
};

export type TeamCompleteness = {
  percent: number;
  filledRoles: number;
  targetRoles: number;
};

export type TeamViewerContext = {
  kind: ViewerContextKind;
  hasActiveStartup: boolean;
  startupId: string | null;
  membershipId: string | null;
};

export type TeamRoster = {
  title: string;
  members: TeamMember[];
  actions: {
    inviteViaLink: boolean;
    addFromMatches: boolean;
  };
};

export type TeamApplicationStatus = 'applied' | 'in_review' | 'interview' | 'rejected' | 'accepted' | string;

export type TeamApplication = {
  id: string;
  startupId: string;
  startupName: string;
  startupInitials?: string;
  industryLabel?: string;
  stageLabel?: string;
  role: TeamRole;
  openRoles?: TeamRole[];
  matchScore?: number;
  teamMemberCount?: number;
  appliedAt: string;
  status: TeamApplicationStatus;
  statusLabel: string;
};

export type TeamApplicationsSummary = {
  title: string;
  stats: {
    applied: number;
    inReview: number;
    interviews: number;
  };
  items: TeamApplication[];
  actions: {
    browseStartups: boolean;
    discoverMoreStartups: boolean;
  };
};

export type TeamInviteDirection = 'sent' | 'received';

export type TeamInviteAction = 'accept' | 'decline' | 'revoke' | string;

export type TeamDashboardInvite = {
  id: string;
  direction: TeamInviteDirection;
  startupId: string;
  startupName: string;
  role: TeamRole;
  email: string;
  sentAt: string;
  status: StartupInvitationStatus;
  statusLabel?: string;
  availableActions: TeamInviteAction[];
};

export type TeamInvitesSummary = {
  title: string;
  items: TeamDashboardInvite[];
};

export type TeamOverviewData = {
  viewerContext: TeamViewerContext;
  startup: StartupTeamOverview | null;
  teamRoster: TeamRoster;
  myApplications: TeamApplicationsSummary;
  teamInvites: TeamInvitesSummary;
  teamCompleteness: TeamCompleteness;
  members?: TeamMember[];
  requiredRoles: RequiredRole[];
  missingRoles: MissingRole[];
};

export type TeamOverviewResponse = {
  success: boolean;
  data: TeamOverviewData;
};

export type UpdateRequiredRolesRequest = {
  roleIds: string[];
};

export type UpdateRequiredRolesResponse = {
  success: boolean;
  message: string;
  data: {
    requiredRoles: RequiredRole[];
    missingRoles: MissingRole[];
    teamCompleteness: TeamCompleteness;
  };
};

export type CreateStartupInvitationRequest = {
  commitment: TeamInviteCommitment;
  email: string;
  equityPercent: number;
  roleId: string;
};

export type CreateStartupInvitationResponse = {
  success: boolean;
  message: string;
  data: {
    invitationId: string;
    email: string;
    status: 'pending' | string;
  };
};

export type StartupInvitationStatus = 'pending' | 'accepted' | 'denied' | 'expired' | string;

export type StartupInvitationDecision = 'accept' | 'deny';

export type StartupInvitationStartupSummary = {
  id: string;
  name: string;
  description: string;
  industry: TeamEntityOption;
  stage: TeamEntityOption;
};

export type StartupInvitationInviterSummary = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  roleLabel: string | null;
};

export type StartupInvitation = {
  id: string;
  recipientEmail: string;
  status: StartupInvitationStatus;
  sentAt: string;
  expiresAt: string | null;
  startup: StartupInvitationStartupSummary;
  inviter: StartupInvitationInviterSummary;
};

export type FetchStartupInvitationsResponse = {
  success: boolean;
  data: {
    invitations: StartupInvitation[];
  };
};

export type RespondToStartupInvitationRequest = {
  decision: StartupInvitationDecision;
};

export type RespondToStartupInvitationResponse = {
  success: boolean;
  message: string;
  data: {
    invitationId: string;
    status: Exclude<StartupInvitationStatus, 'pending'>;
    startupId: string;
    actedAt: string;
  };
};

export type StartupOptionsResponse = {
  success: boolean;
  data: {
    industries: TeamEntityOption[];
    stages: TeamEntityOption[];
    roles: TeamRole[];
  };
};

export type StartupInvitationOptionsResponse = {
  success: boolean;
  data: {
    roleOptions: TeamRole[];
    commitmentOptions: {
      id: TeamInviteCommitment;
      label: string;
    }[];
    equity: {
      min: number;
      max: number;
      step: number;
      defaultValue: number;
    };
  };
};
