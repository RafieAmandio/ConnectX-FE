const authInvalidationListeners = new Set<() => void>();

export function subscribeToAuthInvalidation(listener: () => void) {
  authInvalidationListeners.add(listener);

  return () => {
    authInvalidationListeners.delete(listener);
  };
}

export function emitAuthInvalidation() {
  for (const listener of authInvalidationListeners) {
    listener();
  }
}
