import { api } from '@workspace/backend/convex/_generated/api';
import { useSessionQuery } from 'convex-helpers/react/sessions';

export function useUserType() {
  const authState = useSessionQuery(api.auth.getState, {});

  const isAuthenticated = authState?.state === 'authenticated';
  const userType = isAuthenticated ? authState.user?.type : null;

  return {
    isAuthenticated,
    userType,
    isFullUser: userType === 'full',
    isAnonymous: userType === 'anonymous',
    isLoading: authState === undefined,
  };
}
