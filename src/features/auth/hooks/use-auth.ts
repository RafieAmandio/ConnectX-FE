import { useAuthContext } from '../store/auth-provider';

export function useAuth() {
  return useAuthContext();
}
