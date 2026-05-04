import type { DiscoveryMode } from '../types/discovery.types';

const DISCOVERY_MODES = new Set<DiscoveryMode>([
  'finding_cofounder',
  'building_team',
  'explore_startups',
  'joining_startups',
]);
const listeners = new Set<() => void>();
let appliedDiscoveryMode: DiscoveryMode | null = null;

function isDiscoveryMode(value: unknown): value is DiscoveryMode {
  return typeof value === 'string' && DISCOVERY_MODES.has(value as DiscoveryMode);
}

function emitAppliedDiscoveryModeChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

export function getAppliedDiscoveryModeSnapshot(): DiscoveryMode | null {
  return appliedDiscoveryMode;
}

export function setAppliedDiscoveryMode(mode: DiscoveryMode | null) {
  if (mode !== null && !isDiscoveryMode(mode)) {
    return;
  }

  appliedDiscoveryMode = mode;
  emitAppliedDiscoveryModeChange();
}

export function subscribeAppliedDiscoveryMode(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
