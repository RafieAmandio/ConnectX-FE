export type LinkedInSyncNoticeState = {
  isPending: boolean;
  linkedInUrl: string | null;
};

const emptyState: LinkedInSyncNoticeState = {
  isPending: false,
  linkedInUrl: null,
};

let state = emptyState;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

export function getLinkedInSyncNoticeState() {
  return state;
}

export function subscribeLinkedInSyncNotice(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function setPendingLinkedInSyncNotice(linkedInUrl: string) {
  const normalizedLinkedInUrl = linkedInUrl.trim();

  if (!normalizedLinkedInUrl) {
    clearLinkedInSyncNotice();
    return;
  }

  state = {
    isPending: true,
    linkedInUrl: normalizedLinkedInUrl,
  };
  emitChange();
}

export function clearLinkedInSyncNotice() {
  if (!state.isPending && !state.linkedInUrl) {
    return;
  }

  state = emptyState;
  emitChange();
}
