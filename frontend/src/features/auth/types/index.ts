export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADVISOR' | 'CLIENT' | 'ADMIN';
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
