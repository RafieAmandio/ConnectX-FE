export type LinkedInRecoveryReason = 'DUPLICATE' | 'INVALID_FORMAT' | string;

export type LinkedInRecoveryState = {
  errorReason: LinkedInRecoveryReason | null;
  isRequired: boolean;
  message: string | null;
  // Opened as a recommendation (Profile), not forced by the backend: the person can close it.
  optional: boolean;
};

const emptyState: LinkedInRecoveryState = {
  errorReason: null,
  isRequired: false,
  message: null,
  optional: false,
};

let state = emptyState;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getLinkedInRecoveryState() {
  return state;
}

export function subscribeLinkedInRecovery(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function requireLinkedInRecovery(payload?: {
  errorReason?: LinkedInRecoveryReason | null;
  message?: string | null;
  optional?: boolean;
}) {
  state = {
    errorReason: payload?.errorReason ?? null,
    isRequired: true,
    message: payload?.message ?? null,
    optional: payload?.optional ?? false,
  };
  emit();
}

export function clearLinkedInRecovery() {
  state = emptyState;
  emit();
}
