import type { DiscoveryMode } from '../types/discovery.types';

export type ViewerContext = 'startup' | 'talent';

export const DEFAULT_VIEWER_CONTEXT_DISCOVERY_MODE: DiscoveryMode = 'joining_startups';

export function getViewerContextForDiscoveryMode(mode: DiscoveryMode): ViewerContext {
  switch (mode) {
    case 'finding_cofounder':
    case 'building_team':
      return 'startup';
    case 'explore_startups':
    case 'joining_startups':
      return 'talent';
  }
}
