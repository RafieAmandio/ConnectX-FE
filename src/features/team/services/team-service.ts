import { ApiError, apiFetch } from '@shared/services/api';
import { isExpoDevModeEnabled, parseBooleanEnv } from '@shared/utils/env';

import {
  createMockStartupInvitationResponse,
  getMockAcceptedStartupId,
  getMockPersonTeamOverviewResponse,
  getMockStartupInvitationsResponse,
  getMockTeamOverviewResponse,
  respondToMockStartupInvitation,
} from '../mock/team.mock';
import type {
  CreateStartupInvitationRequest,
  CreateStartupInvitationResponse,
  FetchStartupInvitationsResponse,
  RespondToStartupInvitationRequest,
  RespondToStartupInvitationResponse,
  StartupInvitation,
  StartupTeamOverview,
  TeamCompleteness,
  TeamMember,
  TeamOverviewResponse,
  UpdateRequiredRolesRequest,
  UpdateRequiredRolesResponse,
} from '../types/team.types';

export const TEAM_API = {
  OVERVIEW: '/api/v1/me/startup/team-overview',
  INVITATIONS: '/api/v1/me/startup/invitations',
  STARTUP_INVITATIONS: '/api/v1/me/startup-invitations',
  RESPOND_TO_STARTUP_INVITATION: (invitationId: string) =>
    `/api/v1/me/startup-invitations/${invitationId}/respond`,
  REQUIRED_ROLES: (startupId: string) => `/api/v1/startups/${startupId}/required-roles`,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isTeamEntityOption(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' && typeof value.label === 'string';
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isTeamMember(payload: unknown) {
  if (!isRecord(payload)) {
    return false;
  }

  return (
    typeof payload.id === 'string' &&
    typeof payload.userId === 'string' &&
    typeof payload.name === 'string' &&
    isTeamEntityOption(payload.role) &&
    typeof payload.commitment === 'string' &&
    typeof payload.equityPercent === 'number' &&
    (payload.avatarUrl === null || typeof payload.avatarUrl === 'string') &&
    typeof payload.status === 'string' &&
    (!('availableActions' in payload) || isStringArray(payload.availableActions))
  );
}

function isRequiredRole(payload: unknown) {
  return isTeamEntityOption(payload) && isRecord(payload) && typeof payload.status === 'string';
}

function isTeamCompleteness(payload: unknown) {
  return (
    isRecord(payload) &&
    typeof payload.percent === 'number' &&
    typeof payload.filledRoles === 'number' &&
    typeof payload.targetRoles === 'number'
  );
}

function isStartupOverview(payload: unknown) {
  return (
    isRecord(payload) &&
    typeof payload.id === 'string' &&
    typeof payload.name === 'string' &&
    typeof payload.description === 'string' &&
    isTeamEntityOption(payload.industry) &&
    isTeamEntityOption(payload.stage)
  );
}

function hasUsableStartupInvitation(payload: unknown): payload is StartupInvitation {
  if (!isRecord(payload)) {
    return false;
  }

  return (
    typeof payload.id === 'string' &&
    typeof payload.recipientEmail === 'string' &&
    typeof payload.status === 'string' &&
    typeof payload.sentAt === 'string' &&
    (payload.expiresAt === null || typeof payload.expiresAt === 'string') &&
    isRecord(payload.startup) &&
    typeof payload.startup.id === 'string' &&
    typeof payload.startup.name === 'string' &&
    typeof payload.startup.description === 'string' &&
    isTeamEntityOption(payload.startup.industry) &&
    isTeamEntityOption(payload.startup.stage) &&
    isRecord(payload.inviter) &&
    typeof payload.inviter.userId === 'string' &&
    typeof payload.inviter.name === 'string' &&
    typeof payload.inviter.email === 'string' &&
    (payload.inviter.avatarUrl === null || typeof payload.inviter.avatarUrl === 'string') &&
    (payload.inviter.roleLabel === null || typeof payload.inviter.roleLabel === 'string')
  );
}

function normalizeTeamOverviewResponse(payload: unknown): TeamOverviewResponse | null {
  if (!isRecord(payload) || !('data' in payload) || !isRecord(payload.data)) {
    return null;
  }

  const data = payload.data;

  if (
    isRecord(data.viewerContext) &&
    typeof data.viewerContext.kind === 'string' &&
    typeof data.viewerContext.hasActiveStartup === 'boolean' &&
    (data.viewerContext.startupId === null || typeof data.viewerContext.startupId === 'string') &&
    (data.viewerContext.membershipId === null || typeof data.viewerContext.membershipId === 'string') &&
    (data.startup === null || isStartupOverview(data.startup)) &&
    isRecord(data.teamRoster) &&
    typeof data.teamRoster.title === 'string' &&
    Array.isArray(data.teamRoster.members) &&
    data.teamRoster.members.every((member) => isTeamMember(member)) &&
    isRecord(data.teamRoster.actions) &&
    typeof data.teamRoster.actions.inviteViaLink === 'boolean' &&
    typeof data.teamRoster.actions.addFromMatches === 'boolean' &&
    isRecord(data.myApplications) &&
    typeof data.myApplications.title === 'string' &&
    isRecord(data.myApplications.stats) &&
    typeof data.myApplications.stats.applied === 'number' &&
    typeof data.myApplications.stats.inReview === 'number' &&
    typeof data.myApplications.stats.interviews === 'number' &&
    Array.isArray(data.myApplications.items) &&
    data.myApplications.items.every(
      (application) =>
        isRecord(application) &&
        typeof application.id === 'string' &&
        typeof application.startupId === 'string' &&
        typeof application.startupName === 'string' &&
        isTeamEntityOption(application.role) &&
        typeof application.appliedAt === 'string' &&
        typeof application.status === 'string' &&
        typeof application.statusLabel === 'string'
    ) &&
    isRecord(data.myApplications.actions) &&
    typeof data.myApplications.actions.browseStartups === 'boolean' &&
    typeof data.myApplications.actions.discoverMoreStartups === 'boolean' &&
    isRecord(data.teamInvites) &&
    typeof data.teamInvites.title === 'string' &&
    Array.isArray(data.teamInvites.items) &&
    data.teamInvites.items.every(
      (invitation) =>
        isRecord(invitation) &&
        typeof invitation.id === 'string' &&
        (invitation.direction === 'sent' || invitation.direction === 'received') &&
        typeof invitation.startupId === 'string' &&
        typeof invitation.startupName === 'string' &&
        isTeamEntityOption(invitation.role) &&
        typeof invitation.email === 'string' &&
        typeof invitation.sentAt === 'string' &&
        typeof invitation.status === 'string' &&
        isStringArray(invitation.availableActions)
    ) &&
    isTeamCompleteness(data.teamCompleteness) &&
    Array.isArray(data.requiredRoles) &&
    data.requiredRoles.every((role) => isRequiredRole(role)) &&
    Array.isArray(data.missingRoles) &&
    data.missingRoles.every((role) => isTeamEntityOption(role))
  ) {
    return payload as TeamOverviewResponse;
  }

  if (
    isStartupOverview(data.startup) &&
    isTeamCompleteness(data.teamCompleteness) &&
    Array.isArray(data.members) &&
    data.members.every((member) => isTeamMember(member)) &&
    Array.isArray(data.requiredRoles) &&
    data.requiredRoles.every((role) => isRequiredRole(role)) &&
    Array.isArray(data.missingRoles) &&
    data.missingRoles.every((role) => isTeamEntityOption(role))
  ) {
    const startup = data.startup as StartupTeamOverview;
    const teamCompleteness = data.teamCompleteness as TeamCompleteness;
    const members = data.members as TeamMember[];

    return {
      success: Boolean(payload.success),
      data: {
        viewerContext: {
          kind: 'startup_member',
          hasActiveStartup: true,
          startupId: startup.id,
          membershipId: null,
        },
        startup,
        teamRoster: {
          title: 'Your Team',
          members,
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
          items: [],
        },
        teamCompleteness,
        members,
        requiredRoles: data.requiredRoles,
        missingRoles: data.missingRoles,
      },
    };
  }

  return null;
}

function hasUsableStartupInvitationsResponse(payload: unknown): payload is FetchStartupInvitationsResponse {
  if (!isRecord(payload) || !('data' in payload) || !isRecord(payload.data)) {
    return false;
  }

  return (
    Array.isArray(payload.data.invitations) &&
    payload.data.invitations.every((invitation) => hasUsableStartupInvitation(invitation))
  );
}

function hasUsableRespondToStartupInvitationResponse(
  payload: unknown
): payload is RespondToStartupInvitationResponse {
  if (!isRecord(payload) || !('data' in payload) || !isRecord(payload.data)) {
    return false;
  }

  return (
    typeof payload.success === 'boolean' &&
    typeof payload.message === 'string' &&
    typeof payload.data.invitationId === 'string' &&
    typeof payload.data.status === 'string' &&
    typeof payload.data.startupId === 'string' &&
    typeof payload.data.actedAt === 'string'
  );
}

function getApiErrorCode(error: unknown) {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== 'object') {
    return null;
  }

  if (!('code' in error.payload)) {
    return null;
  }

  return typeof error.payload.code === 'string' ? error.payload.code : null;
}

export function isNoActiveStartupError(error: unknown) {
  return error instanceof ApiError && error.status === 404 && getApiErrorCode(error) === 'NO_ACTIVE_STARTUP';
}

function shouldUseMockInvitationFallback(error: unknown) {
  if (!(error instanceof ApiError)) {
    return true;
  }

  return error.status === 0 || error.status === 404 || error.status >= 500;
}

function shouldMockNoActiveStartup() {
  return (
    isExpoDevModeEnabled() &&
    parseBooleanEnv(process.env.EXPO_PUBLIC_MOCK_NO_ACTIVE_STARTUP) === true
  );
}

export async function fetchTeamOverview() {
  if (shouldMockNoActiveStartup()) {
    const acceptedStartupId = getMockAcceptedStartupId();

    if (acceptedStartupId) {
      return getMockTeamOverviewResponse(acceptedStartupId);
    }

    return getMockPersonTeamOverviewResponse();
  }

  try {
    const response = await apiFetch<TeamOverviewResponse>(TEAM_API.OVERVIEW);
    const normalizedResponse = normalizeTeamOverviewResponse(response);

    if (!normalizedResponse) {
      return getMockTeamOverviewResponse();
    }

    return normalizedResponse;
  } catch (error) {
    if (isNoActiveStartupError(error)) {
      const acceptedStartupId = getMockAcceptedStartupId();

      if (acceptedStartupId) {
        return getMockTeamOverviewResponse(acceptedStartupId);
      }

      return getMockPersonTeamOverviewResponse();
    }

    return getMockTeamOverviewResponse();
  }
}

export async function updateRequiredRoles(startupId: string, payload: UpdateRequiredRolesRequest) {
  return apiFetch<UpdateRequiredRolesResponse>(TEAM_API.REQUIRED_ROLES(startupId), {
    body: payload as unknown as BodyInit,
    method: 'PUT',
  });
}

export async function createStartupInvitation(payload: CreateStartupInvitationRequest) {
  try {
    return await apiFetch<CreateStartupInvitationResponse>(TEAM_API.INVITATIONS, {
      body: payload as unknown as BodyInit,
      method: 'POST',
    });
  } catch (error) {
    if (isNoActiveStartupError(error)) {
      throw error;
    }

    return createMockStartupInvitationResponse(payload);
  }
}

export async function fetchStartupInvitations() {
  try {
    const response = await apiFetch<FetchStartupInvitationsResponse>(TEAM_API.STARTUP_INVITATIONS);

    if (!hasUsableStartupInvitationsResponse(response)) {
      return getMockStartupInvitationsResponse();
    }

    return response;
  } catch (error) {
    if (!shouldUseMockInvitationFallback(error)) {
      throw error;
    }

    return getMockStartupInvitationsResponse();
  }
}

export async function respondToStartupInvitation(
  invitationId: string,
  payload: RespondToStartupInvitationRequest
) {
  try {
    const response = await apiFetch<RespondToStartupInvitationResponse>(
      TEAM_API.RESPOND_TO_STARTUP_INVITATION(invitationId),
      {
        body: payload as unknown as BodyInit,
        method: 'POST',
      }
    );

    if (!hasUsableRespondToStartupInvitationResponse(response)) {
      return respondToMockStartupInvitation(invitationId, payload);
    }

    return response;
  } catch (error) {
    if (!shouldUseMockInvitationFallback(error)) {
      throw error;
    }

    return respondToMockStartupInvitation(invitationId, payload);
  }
}
