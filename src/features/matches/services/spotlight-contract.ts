import { ApiError } from '@shared/services/api';

import type { SpotlightActivationDeniedResponse } from '../types/matches.types';

type SpotlightActivationApiError = ApiError & {
  payload: SpotlightActivationDeniedResponse;
};

export function isSpotlightActivationDeniedResponse(
  payload: unknown
): payload is SpotlightActivationDeniedResponse {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return false;
  }

  const error = payload.error;

  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  return (
    error.code === 'DISCOVERY_SPOTLIGHT_REQUIRES_CREDIT' ||
    error.code === 'DISCOVERY_SPOTLIGHT_ALREADY_ACTIVE'
  );
}

export function isSpotlightRequiresCreditError(
  error: unknown
): error is SpotlightActivationApiError {
  if (!(error instanceof ApiError) || error.status !== 409 || !isSpotlightActivationDeniedResponse(error.payload)) {
    return false;
  }

  return error.payload.error.code === 'DISCOVERY_SPOTLIGHT_REQUIRES_CREDIT';
}

export function isSpotlightAlreadyActiveError(
  error: unknown
): error is SpotlightActivationApiError {
  if (!(error instanceof ApiError) || error.status !== 409 || !isSpotlightActivationDeniedResponse(error.payload)) {
    return false;
  }

  return error.payload.error.code === 'DISCOVERY_SPOTLIGHT_ALREADY_ACTIVE';
}
