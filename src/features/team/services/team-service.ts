import { ApiError, apiFetch } from '@shared/services/api';

import {
  createMockStartupInvitationResponse,
  getMockTeamOverviewResponse,
} from '../mock/team.mock';
import type {
  CreateStartupInvitationRequest,
  CreateStartupInvitationResponse,
  TeamOverviewResponse,
  UpdateRequiredRolesRequest,
  UpdateRequiredRolesResponse,
} from '../types/team.types';

export const TEAM_API = {
  OVERVIEW: '/api/v1/me/startup/team-overview',
  INVITATIONS: '/api/v1/me/startup/invitations',
  REQUIRED_ROLES: (startupId: string) => `/api/v1/startups/${startupId}/required-roles`,
} as const;

function hasUsableTeamOverviewResponse(payload: unknown): payload is TeamOverviewResponse {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    return false;
  }

  const data = payload.data;

  if (!data || typeof data !== 'object') {
    return false;
  }

  if (!('startup' in data) || !data.startup || typeof data.startup !== 'object') {
    return false;
  }

  return typeof data.startup.id === 'string' && typeof data.startup.name === 'string';
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

export async function fetchTeamOverview() {
  try {
    const response = await apiFetch<TeamOverviewResponse>(TEAM_API.OVERVIEW);

    if (!hasUsableTeamOverviewResponse(response)) {
      return getMockTeamOverviewResponse();
    }

    return response;
  } catch (error) {
    if (isNoActiveStartupError(error)) {
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
