import { ApiError, apiFetch } from '@shared/services/api';
import { isExpoDevModeEnabled, parseBooleanEnv } from '@shared/utils/env';

import {
  createMockStartupInvitationResponse,
  getMockAcceptedStartupId,
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

function hasUsableTeamOverviewResponse(payload: unknown): payload is TeamOverviewResponse {
  if (!isRecord(payload) || !('data' in payload)) {
    return false;
  }

  const data = payload.data;

  if (!isRecord(data)) {
    return false;
  }

  if (!('startup' in data) || !isRecord(data.startup)) {
    return false;
  }

  return typeof data.startup.id === 'string' && typeof data.startup.name === 'string';
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

    throw new ApiError('No active startup.', 404, {
      code: 'NO_ACTIVE_STARTUP',
      message: 'No active startup.',
    });
  }

  try {
    const response = await apiFetch<TeamOverviewResponse>(TEAM_API.OVERVIEW);

    if (!hasUsableTeamOverviewResponse(response)) {
      return getMockTeamOverviewResponse();
    }

    return response;
  } catch (error) {
    if (isNoActiveStartupError(error)) {
      const acceptedStartupId = getMockAcceptedStartupId();

      if (acceptedStartupId) {
        return getMockTeamOverviewResponse(acceptedStartupId);
      }

      throw error;
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
