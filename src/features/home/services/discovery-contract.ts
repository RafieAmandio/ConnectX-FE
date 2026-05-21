import { ApiError } from '@shared/services/api';

import type {
  RewindActionDeniedResponse,
  RewindActionSuccessResponse,
  SpotlightActivationDeniedResponse,
  SpotlightActivationSuccessResponse,
  SwipeActionDeniedResponse,
  SwipeActionSuccessResponse,
} from '../types/discovery.types';

export const DISCOVERY_ERROR_STATUS = {
  onboardingRequired: 409,
  rewindNotAvailable: 409,
  rewindPremiumRequired: 403,
  startupProfileRequired: 403,
  superLikeRequiresBoost: 403,
  spotlightAlreadyActive: 409,
  spotlightRequiresCredit: 409,
} as const;

type DiscoveryOnboardingRequiredPayload = {
  success: false;
  message?: string;
  error: {
    code: 'DISCOVERY_ONBOARDING_REQUIRED';
    details?: {
      next_action?: 'START_ONBOARDING' | string;
      reason?: 'MISSING_STARTUP_PROFILE' | 'MISSING_TALENT_PROFILE' | string;
      requested_mode?: string;
      requested_viewer_context?: string;
      required_profile_type?: 'startup' | 'talent' | string;
    };
  };
};

type StartupProfileRequiredPayload = {
  success: false;
  message?: string;
  error: {
    code: 'STARTUP_PROFILE_REQUIRED';
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function getApiPayloadErrorCode(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.error) || typeof payload.error.code !== 'string') {
    return null;
  }

  return payload.error.code;
}

export function isDiscoveryOnboardingRequiredResponse(
  payload: unknown
): payload is DiscoveryOnboardingRequiredPayload {
  return getApiPayloadErrorCode(payload) === 'DISCOVERY_ONBOARDING_REQUIRED';
}

export function isStartupProfileRequiredResponse(
  payload: unknown
): payload is StartupProfileRequiredPayload {
  return getApiPayloadErrorCode(payload) === 'STARTUP_PROFILE_REQUIRED';
}

export function isDiscoveryOnboardingRequiredError(error: unknown): error is ApiError & {
  payload: DiscoveryOnboardingRequiredPayload;
} {
  return (
    error instanceof ApiError &&
    error.status === DISCOVERY_ERROR_STATUS.onboardingRequired &&
    isDiscoveryOnboardingRequiredResponse(error.payload)
  );
}

export function isStartupProfileRequiredError(error: unknown): error is ApiError & {
  payload: StartupProfileRequiredPayload;
} {
  return (
    error instanceof ApiError &&
    error.status === DISCOVERY_ERROR_STATUS.startupProfileRequired &&
    isStartupProfileRequiredResponse(error.payload)
  );
}

export function getDiscoveryOnboardingRequiredMessage(
  error: unknown,
  fallback = 'Complete onboarding before using this mode.'
) {
  if (isDiscoveryOnboardingRequiredError(error)) {
    return error.payload.message?.trim() || error.message || fallback;
  }

  return fallback;
}

export function getStartupProfileRequiredMessage(
  error: unknown,
  fallback = 'Create your Startup profile before using this mode.'
) {
  if (isStartupProfileRequiredError(error)) {
    return error.payload.message?.trim() || error.message || fallback;
  }

  return fallback;
}

export function isSwipeActionDeniedResponse(payload: unknown): payload is SwipeActionDeniedResponse {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return false;
  }
  console.log(payload, 'payload')

  return getApiPayloadErrorCode(payload) === 'DISCOVERY_SUPER_LIKE_REQUIRES_BOOST' || getApiPayloadErrorCode(payload) === 'PREMIUM_REQUIRED';
}

export function isSuperLikeRequiresBoostError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError) || error.status !== DISCOVERY_ERROR_STATUS.superLikeRequiresBoost) {
    return false;
  }

  return isSwipeActionDeniedResponse(error.payload);
}

export function isSpotlightActivationDeniedResponse(
  payload: unknown
): payload is SpotlightActivationDeniedResponse {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return false;
  }

  const errorCode = getApiPayloadErrorCode(payload);

  return (
    errorCode === 'DISCOVERY_SPOTLIGHT_REQUIRES_CREDIT' ||
    errorCode === 'DISCOVERY_SPOTLIGHT_ALREADY_ACTIVE'
  );
}

export function isRewindActionDeniedResponse(payload: unknown): payload is RewindActionDeniedResponse {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return false;
  }

  const errorCode = getApiPayloadErrorCode(payload);

  return (
    errorCode === 'DISCOVERY_REWIND_PREMIUM_REQUIRED' ||
    errorCode === 'DISCOVERY_REWIND_NOT_AVAILABLE'
  );
}

export function isRewindPremiumRequiredError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError) || error.status !== DISCOVERY_ERROR_STATUS.rewindPremiumRequired) {
    return false;
  }

  return (
    isRewindActionDeniedResponse(error.payload) &&
    error.payload.error.code === 'DISCOVERY_REWIND_PREMIUM_REQUIRED'
  );
}

export function isRewindNotAvailableError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError) || error.status !== DISCOVERY_ERROR_STATUS.rewindNotAvailable) {
    return false;
  }

  return (
    isRewindActionDeniedResponse(error.payload) &&
    error.payload.error.code === 'DISCOVERY_REWIND_NOT_AVAILABLE'
  );
}

export function isSwipeActionSuccessResponse(payload: unknown): payload is SwipeActionSuccessResponse {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    payload.success === true &&
    'data' in payload
  );
}

export function isRewindActionSuccessResponse(payload: unknown): payload is RewindActionSuccessResponse {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    payload.success === true &&
    'data' in payload
  );
}

export function isSpotlightActivationSuccessResponse(
  payload: unknown
): payload is SpotlightActivationSuccessResponse {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    payload.success === true &&
    'data' in payload
  );
}
