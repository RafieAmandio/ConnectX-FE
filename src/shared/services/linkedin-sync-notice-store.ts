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
  console.log('[linkedin_sync_notice] subscribe', state);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    console.log('[linkedin_sync_notice] unsubscribe', state);
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
  console.log('[linkedin_sync_notice] set pending', state);
  emitChange();
}

export function clearLinkedInSyncNotice() {
  if (!state.isPending && !state.linkedInUrl) {
    return;
  }

  state = emptyState;
  console.log('[linkedin_sync_notice] cleared');
  emitChange();
}
