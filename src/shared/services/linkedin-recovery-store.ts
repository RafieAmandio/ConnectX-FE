export type LinkedInRecoveryReason = 'DUPLICATE' | 'INVALID_FORMAT' | string;

export type LinkedInRecoveryState = {
  errorReason: LinkedInRecoveryReason | null;
  isRequired: boolean;
  message: string | null;
};

const emptyState: LinkedInRecoveryState = {
  errorReason: null,
  isRequired: false,
  message: null,
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
}) {
  state = {
    errorReason: payload?.errorReason ?? null,
    isRequired: true,
    message: payload?.message ?? null,
  };
  emit();
}

export function clearLinkedInRecovery() {
  state = emptyState;
  emit();
}
