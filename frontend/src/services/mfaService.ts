/**
 * MFA Service for SecureVault Frontend
 * 
 * Provides all MFA-related API calls including setup, verification,
 * backup codes management, and admin functions.
 */

import { 
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
} from '../types/mfa';
import { ApiResponse } from '../types/auth';
import { apiRequest } from './api';

class MFAService {
  /**
   * Set up MFA for the current user
   */
  async setupMFA(request: MFASetupRequest): Promise<ApiResponse<MFASetupResponse>> {
    return apiRequest<MFASetupResponse>('POST', '/api/v1/mfa/setup', request);
  }

  /**
   * Verify a TOTP or backup code
   */
  async verifyMFA(request: MFAVerifyRequest): Promise<ApiResponse<MFAVerifyResponse>> {
    return apiRequest<MFAVerifyResponse>('POST', '/api/v1/mfa/verify', request);
  }

  /**
   * Get MFA status for current user
   */
  async getMFAStatus(): Promise<ApiResponse<MFAStatus>> {
    return apiRequest<MFAStatus>('GET', '/api/v1/mfa/status');
  }

  /**
   * Disable MFA for current user
   */
  async disableMFA(request: MFADisableRequest): Promise<ApiResponse<{message: string}>> {
    return apiRequest<{message: string}>('POST', '/api/v1/mfa/disable', request);
  }

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(request: BackupCodesRequest): Promise<ApiResponse<BackupCodesResponse>> {
    return apiRequest<BackupCodesResponse>('POST', '/api/v1/mfa/backup-codes', request);
  }

  /**
   * Get QR code for MFA setup
   */
  async getQRCode(request: QRCodeRequest): Promise<ApiResponse<QRCodeResponse>> {
    return apiRequest<QRCodeResponse>('POST', '/api/v1/mfa/qr-code', request);
  }

  /**
   * Reset MFA for a user (admin only)
   */
  async resetUserMFA(request: MFAResetRequest): Promise<ApiResponse<MFAResetResponse>> {
    return apiRequest<MFAResetResponse>('POST', '/api/v1/mfa/admin/reset', request);
  }

  /**
   * Get MFA statistics (admin only)
   */
  async getMFAStats(): Promise<ApiResponse<MFAStatsResponse>> {
    return apiRequest<MFAStatsResponse>('GET', '/api/v1/mfa/admin/stats');
  }

  /**
   * Check MFA service health
   */
  async checkMFAHealth(): Promise<ApiResponse<MFAHealthResponse>> {
    return apiRequest<MFAHealthResponse>('GET', '/api/v1/mfa/health');
  }

  /**
   * Validate TOTP code format (client-side validation)
   */
  validateTOTPCode(code: string): boolean {
    // TOTP codes are 6 digits
    return /^\d{6}$/.test(code);
  }

  /**
   * Validate backup code format (client-side validation)
   */
  validateBackupCode(code: string): boolean {
    // Backup codes are 8 alphanumeric characters
    return /^[A-Z0-9]{8}$/.test(code.toUpperCase());
  }

  /**
   * Validate MFA code (TOTP or backup code)
   */
  validateMFACode(code: string): boolean {
    const cleanCode = code.replace(/\s+/g, '').toUpperCase();
    return this.validateTOTPCode(cleanCode) || this.validateBackupCode(cleanCode);
  }

  /**
   * Format backup codes for display
   */
  formatBackupCodes(codes: string[]): string[] {
    return codes.map(code => {
      // Insert spaces every 4 characters for readability
      return code.replace(/(.{4})/g, '$1 ').trim();
    });
  }

  /**
   * Generate printable backup codes text
   */
  generatePrintableBackupCodes(codes: string[], userEmail: string): string {
    const formattedCodes = this.formatBackupCodes(codes);
    const timestamp = new Date().toLocaleDateString();
    
    return `
SecureVault MFA Backup Codes
Generated: ${timestamp}
Account: ${userEmail}

Keep these codes in a safe place. Each code can only be used once.

${formattedCodes.map((code, index) => `${(index + 1).toString().padStart(2, '0')}. ${code}`).join('\n')}

Important:
- Store these codes securely offline
- Each code can only be used once
- Generate new codes if you lose these
- Contact your administrator if you lose access
`.trim();
  }

  /**
   * Download backup codes as text file
   */
  downloadBackupCodes(codes: string[], userEmail: string): void {
    const content = this.generatePrintableBackupCodes(codes, userEmail);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `securevault-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Copy backup codes to clipboard
   */
  async copyBackupCodesToClipboard(codes: string[], userEmail: string): Promise<boolean> {
    try {
      const content = this.generatePrintableBackupCodes(codes, userEmail);
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Print backup codes
   */
  printBackupCodes(codes: string[], userEmail: string): void {
    const content = this.generatePrintableBackupCodes(codes, userEmail);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>SecureVault MFA Backup Codes</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                line-height: 1.6; 
                margin: 20px; 
                max-width: 600px;
              }
              h1 { color: #1f2937; }
              .code { 
                background: #f3f4f6; 
                padding: 2px 4px; 
                border-radius: 3px;
                font-weight: bold;
              }
              .warning {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                padding: 10px;
                border-radius: 5px;
                margin: 10px 0;
              }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
            <div class="warning">
              <strong>Security Warning:</strong> Store these codes securely and destroy this printout when no longer needed.
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  }
}

// Export singleton instance
export const mfaService = new MFAService();
export default mfaService;