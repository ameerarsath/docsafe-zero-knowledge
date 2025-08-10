/**
 * Authentication Types for SecureVault Frontend
 * 
 * Defines all TypeScript interfaces and types for authentication
 * functionality including user data, login credentials, and API responses.
 */

export interface User {
  id: number;
  email: string;
  username: string;
  role: 'super_admin' | 'admin' | 'manager' | 'user' | 'viewer';
  is_admin: boolean;
  mfa_enabled: boolean;
  must_change_password: boolean;
  account_locked: boolean;
  failed_login_attempts: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  // Zero-knowledge encryption fields
  encryption_salt?: string;
  key_verification_payload?: string;
  encryption_method?: string;
  key_derivation_iterations?: number;
  encryption_configured?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id: number;
  username: string;
  role: string;
  must_change_password: boolean;
  mfa_required?: boolean;
  temp_token?: string; // For MFA flow
  // Zero-knowledge encryption fields
  encryption_salt?: string;
  key_verification_payload?: string;
  encryption_method?: string;
  key_derivation_iterations?: number;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthError {
  detail: string;
  error_code?: string;
  field_errors?: Record<string, string[]>;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tokens: {
    access_token: string | null;
    refresh_token: string | null;
    expires_at: number | null;
  };
  sessionTimeout: number | null;
  rememberMe: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
  confirm_password: string;
}

export interface UserCreateRequest {
  email: string;
  username: string;
  password: string;
  role: User['role'];
  must_change_password?: boolean;
}

// API Response types
export interface ApiError {
  detail: string;
  status_code: number;
  error_code?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// Session management types
export interface SessionWarning {
  show: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

// Token validation types
export interface TokenPayload {
  sub: string; // user_id
  email: string;
  role: string;
  exp: number;
  iat: number;
  token_type: 'access' | 'refresh';
}

// Form validation types
export interface LoginFormData {
  email: string;
  password: string;
  remember_me: boolean;
}

export interface RegistrationFormData {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  role: User['role'];
  must_change_password: boolean;
}

export interface PasswordResetFormData {
  email: string;
}

export interface PasswordResetConfirmFormData {
  new_password: string;
  confirm_password: string;
}