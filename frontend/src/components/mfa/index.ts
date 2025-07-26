/**
 * MFA Components Index
 * 
 * Centralized exports for all MFA-related components, making it easy
 * to import and use throughout the application.
 */

// Core MFA Components
export { default as MFASetupWizard } from './MFASetupWizard';
export { default as QRCodeDisplay } from './QRCodeDisplay';
export { default as TOTPVerificationForm } from './TOTPVerificationForm';
export { default as BackupCodesManager } from './BackupCodesManager';

// MFA Status and Indicators
export { 
  default as MFAStatusDisplay,
  MFAStatusBadge,
  MFAStatusCard,
  MFAWarningBanner 
} from './MFAStatusIndicator';

// Settings and Management
export { default as MFASettingsPage } from './MFASettingsPage';
export { default as AdminMFAManagement } from './AdminMFAManagement';

// Emergency and Authentication
export { default as EmergencyMFADisable } from './EmergencyMFADisable';
export { default as MFALoginFlow } from '../auth/MFALoginFlow';

// Type exports for convenience
export type {
  MFASetupStep,
  MFASetupWizardState,
  MFALoginRequest,
  MFALoginResponse,
  MFASetupRequest,
  MFASetupResponse,
  MFAVerifyRequest,
  MFAVerifyResponse,
  MFADisableRequest,
  MFAStatus,
  BackupCodesRequest,
  BackupCodesResponse,
  MFAResetRequest,
  MFAResetResponse,
  QRCodeRequest,
  QRCodeResponse,
  MFAStatsResponse,
  MFAHealthResponse
} from '../../types/mfa';

// Service exports for convenience
export { mfaService } from '../../services/mfaService';

/**
 * Quick Start Usage Guide:
 * 
 * // Basic MFA Setup
 * import { MFASetupWizard } from '@/components/mfa';
 * <MFASetupWizard onComplete={() => {}} onCancel={() => {}} />
 * 
 * // MFA Status Display
 * import { MFAStatusDisplay } from '@/components/mfa';
 * <MFAStatusDisplay variant="badge" />
 * 
 * // TOTP Verification
 * import { TOTPVerificationForm } from '@/components/mfa';
 * <TOTPVerificationForm onVerificationSuccess={(result) => {}} />
 * 
 * // Backup Codes Management
 * import { BackupCodesManager } from '@/components/mfa';
 * <BackupCodesManager showRegenerateButton={true} />
 * 
 * // Admin Management
 * import { AdminMFAManagement } from '@/components/mfa';
 * <AdminMFAManagement />
 * 
 * // Emergency Disable
 * import { EmergencyMFADisable } from '@/components/mfa';
 * <EmergencyMFADisable onSuccess={() => {}} />
 * 
 * // Enhanced Login Flow
 * import { MFALoginFlow } from '@/components/mfa';
 * <MFALoginFlow redirectTo="/dashboard" />
 */