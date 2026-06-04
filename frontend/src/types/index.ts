export interface User {
  id: string;
  email: string;
  role: 'PATIENT' | 'ADMIN';
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  preferred_language: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface PatientProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  preferred_language: string;
  phone_number: string | null;
  medications_analyzed: number;
  last_scan_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
