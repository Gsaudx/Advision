export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADVISOR' | 'CLIENT' | 'ADMIN';
  cpfCnpj: string | null;
  phone: string | null;
  clientProfileId: string | null;
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
  role?: 'ADVISOR' | 'CLIENT';
  cpfCnpj?: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
