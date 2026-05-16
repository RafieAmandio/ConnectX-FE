import React from 'react';

import { useAuth } from '@features/auth';

import {
  getAppliedDiscoveryModeSnapshot,
  subscribeAppliedDiscoveryMode,
} from '../services/applied-discovery-mode-store';
import {
  DEFAULT_VIEWER_CONTEXT_DISCOVERY_MODE,
  getViewerContextForDiscoveryMode,
  type ViewerContext,
} from '../services/discovery-viewer-context';
import { loadOnboardingDiscoveryPreference } from '../services/onboarding-discovery-preference';
import type { DiscoveryMode } from '../types/discovery.types';

function resolveDefaultDiscoveryMode(
  session: ReturnType<typeof useAuth>['session']
): DiscoveryMode | null {
  const localOnboardingMode = loadOnboardingDiscoveryPreference()?.mode ?? null;

  if (session?.authSessionSource === 'api') {
    return session.defaultDiscoveryMode ?? null;
  }

  return localOnboardingMode ?? session?.defaultDiscoveryMode ?? null;
}

export function useViewerContext(): ViewerContext {
  const { session } = useAuth();
  const appliedDiscoveryMode = React.useSyncExternalStore(
    subscribeAppliedDiscoveryMode,
    getAppliedDiscoveryModeSnapshot,
    getAppliedDiscoveryModeSnapshot
  );
  const mode =
    appliedDiscoveryMode ?? resolveDefaultDiscoveryMode(session) ?? DEFAULT_VIEWER_CONTEXT_DISCOVERY_MODE;

  return getViewerContextForDiscoveryMode(mode);
}
