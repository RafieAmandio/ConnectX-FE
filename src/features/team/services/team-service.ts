import { apiFetch } from '@shared/services/api';

import { applyMockStartupUpdate, getMockTeamOverviewResponse } from '../mock/team.mock';
import type {
  CreateStartupInvitationRequest,
  CreateStartupInvitationResponse,
  TeamOverviewResponse,
  UpdateRequiredRolesRequest,
  UpdateRequiredRolesResponse,
  UpdateStartupRequest,
  UpdateStartupResponse,
} from '../types/team.types';

export const TEAM_API = {
  OVERVIEW: (startupId: string) => `/api/v1/startups/${startupId}/team-overview`,
  STARTUP: (startupId: string) => `/api/v1/startups/${startupId}`,
  REQUIRED_ROLES: (startupId: string) => `/api/v1/startups/${startupId}/required-roles`,
  INVITATIONS: (startupId: string) => `/api/v1/startups/${startupId}/invitations`,
} as const;

function hasUsableTeamOverviewResponse(payload: unknown): payload is TeamOverviewResponse {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    return false;
  }

  const data = payload.data as { startup?: { id?: unknown; name?: unknown } };

  if (!data || typeof data !== 'object') {
    return false;
  }

  if (!('startup' in data) || !data.startup || typeof data.startup !== 'object') {
    return false;
  }

  return typeof data.startup.id === 'string' && typeof data.startup.name === 'string';
}

export async function fetchTeamOverview(startupId: string) {
  try {
    const response = await apiFetch<TeamOverviewResponse>(TEAM_API.OVERVIEW(startupId));

    if (!hasUsableTeamOverviewResponse(response)) {
      return getMockTeamOverviewResponse(startupId);
    }

    return response;
  } catch {
    return getMockTeamOverviewResponse(startupId);
  }
}

export async function updateStartup(startupId: string, payload: UpdateStartupRequest) {
  try {
    return await apiFetch<UpdateStartupResponse>(TEAM_API.STARTUP(startupId), {
      body: payload as unknown as BodyInit,
      method: 'PATCH',
    });
  } catch {
    return applyMockStartupUpdate(startupId, payload);
  }
}

export async function updateRequiredRoles(startupId: string, payload: UpdateRequiredRolesRequest) {
  return apiFetch<UpdateRequiredRolesResponse>(TEAM_API.REQUIRED_ROLES(startupId), {
    body: payload as unknown as BodyInit,
    method: 'PUT',
  });
}

export async function createStartupInvitation(
  startupId: string,
  payload: CreateStartupInvitationRequest
) {
  return apiFetch<CreateStartupInvitationResponse>(TEAM_API.INVITATIONS(startupId), {
    body: payload as unknown as BodyInit,
    method: 'POST',
  });
}
