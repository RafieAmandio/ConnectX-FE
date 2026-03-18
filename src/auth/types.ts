export type AuthMethod = 'google' | 'phone';

export type AuthSession = {
  displayName: string;
  method: AuthMethod;
  phoneNumber?: string;
};
