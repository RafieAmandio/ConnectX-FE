// The user closed the provider sheet; nothing failed, so screens should not show an error.
export class SignInCanceledError extends Error {
  name = 'SignInCanceledError';
}

export function isSignInCanceled(error: unknown) {
  return error instanceof SignInCanceledError;
}
