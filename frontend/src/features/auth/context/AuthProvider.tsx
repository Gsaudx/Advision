import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { authApi } from '../api';
import { AuthContext, type User, type AuthState } from './auth-context';
import type { LoginCredentials, RegisterCredentials } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const setAuth = useCallback((user: User) => {
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const clearAuth = useCallback(() => {
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const signIn = useCallback(
    async (credentials: LoginCredentials): Promise<User> => {
      const user = await authApi.login(credentials);
      setAuth(user);
      return user;
    },
    [setAuth],
  );

  const signUp = useCallback(
    async (credentials: RegisterCredentials): Promise<User> => {
      const user = await authApi.register(credentials);
      setAuth(user);
      return user;
    },
    [setAuth],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if logout fails, clear local state
    }
    clearAuth();
  }, [clearAuth]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get profile using the HttpOnly cookie
        const user = await authApi.getProfile();
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // No valid session, user needs to login
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  // Show loading screen during initial auth check
  if (state.isLoading) {
    return <LoadingScreen message="Iniciando..." />;
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
