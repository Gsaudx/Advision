import { createContext } from 'react';
import type {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthState,
} from '../types';

export interface AuthContextType extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<User>;
  signUp: (credentials: RegisterCredentials) => Promise<User>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export type { User, LoginCredentials, RegisterCredentials, AuthState };
