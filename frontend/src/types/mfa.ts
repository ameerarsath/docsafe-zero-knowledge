/**
 * TypeScript type definitions for MFA operations
 * 
 * These types mirror the backend Pydantic schemas for MFA functionality
 * including TOTP setup, verification, and backup code management.
 */

export interface MFASetupRequest {
  password: string;
  issuer?: string;
}

export interface MFASetupResponse {
  secret: string;
  qr_code_url: string;
  qr_code_data_uri: string;
  backup_codes: string[];
}

export interface MFAVerifyRequest {
  code: string;
}

export interface MFAVerifyResponse {
  verified: boolean;
  backup_code_used: boolean;
  backup_codes_remaining: number;
}

export interface MFADisableRequest {
  password: string;
  admin_override?: boolean;
}

export interface MFAStatus {
  enabled: boolean;
  setup_date: string | null;
  backup_codes_remaining: number;
  last_used: string | null;
  required_by_policy: boolean;
}

export interface BackupCodesRequest {
  password: string;
  count?: number;
}

export interface BackupCodesResponse {
  backup_codes: string[];
  codes_replaced: number;
}

export interface MFAResetRequest {
  user_id: number;
  reason: string;
}

export interface MFAResetResponse {
  success: boolean;
  user_id: number;
  reset_by: number;
  reset_at: string;
}

export interface QRCodeRequest {
  format?: 'data_uri' | 'png' | 'svg';
  size?: number;
}

export interface QRCodeResponse {
  qr_code: string;
  format: string;
  provisioning_uri: string;
}

export interface MFAStatsResponse {
  total_users: number;
  mfa_enabled_users: number;
  mfa_enabled_percentage: number;
  backup_codes_exhausted: number;
  recent_mfa_setups: number;
}

export interface MFAHealthResponse {
  totp_service_available: boolean;
  qr_code_service_available: boolean;
  backup_codes_service_available: boolean;
  database_connection: boolean;
  rate_limiting_active: boolean;
  errors: string[];
  warnings: string[];
}

// Wizard step types
export type MFASetupStep = 
  | 'password'
  | 'qr-code'
  | 'verify'
  | 'backup-codes'
  | 'complete';

export interface MFASetupWizardState {
  currentStep: MFASetupStep;
  setupData: MFASetupResponse | null;
  isLoading: boolean;
  error: string | null;
  backupCodesSaved: boolean;
}

// Login flow types
export interface MFALoginRequest {
  username: string;
  password: string;
  mfa_code?: string;
  remember_me?: boolean;
}

export interface MFALoginResponse {
  requires_mfa: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  temp_token?: string;
  user?: any;
}