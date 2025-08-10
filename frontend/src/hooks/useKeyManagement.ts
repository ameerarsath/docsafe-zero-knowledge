/**
 * Key Management Hook
 * 
 * React hook that provides key management functionality and integrates
 * with the authentication context to manage master keys.
 */

import { useState, useEffect, useCallback } from 'react';
import { keyManagementService, KeyStatus, EncryptionStatistics, SecurityAudit } from '../services/keyManagement';
import { documentEncryptionService } from '../services/documentEncryption';

export interface UseKeyManagementReturn {
  keyStatus: KeyStatus | null;
  encryptionStats: EncryptionStatistics | null;
  securityAudit: SecurityAudit | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshKeyStatus: () => Promise<void>;
  setMasterKey: (key: CryptoKey) => void;
  clearMasterKey: () => void;
  performSecurityAudit: () => Promise<SecurityAudit>;
  runDiagnostics: () => Promise<any>;
  testPassword: (password: string) => Promise<boolean>;
}

/**
 * Custom hook for key management operations
 */
export function useKeyManagement(userData?: any): UseKeyManagementReturn {
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [encryptionStats, setEncryptionStats] = useState<EncryptionStatistics | null>(null);
  const [securityAudit, setSecurityAudit] = useState<SecurityAudit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize key management service
   */
  const initialize = useCallback(async () => {
    if (!userData) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await keyManagementService.initialize(userData);
      await refreshKeyStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize key management');
    } finally {
      setIsLoading(false);
    }
  }, [userData]);

  /**
   * Refresh key status from service
   */
  const refreshKeyStatus = useCallback(async () => {
    setError(null);
    
    try {
      const [status, stats] = await Promise.all([
        keyManagementService.getKeyStatus(),
        keyManagementService.getEncryptionStatistics()
      ]);
      
      setKeyStatus(status);
      setEncryptionStats(stats);
      
      // Load last audit if available
      const lastAudit = keyManagementService.getLastAudit();
      if (lastAudit) {
        setSecurityAudit(lastAudit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh key status');
    }
  }, []);

  /**
   * Set master key in the document encryption service
   */
  const setMasterKey = useCallback((key: CryptoKey) => {
    documentEncryptionService.setMasterKey(key);
    // Refresh status to reflect the loaded key
    refreshKeyStatus();
  }, [refreshKeyStatus]);

  /**
   * Clear master key from memory
   */
  const clearMasterKey = useCallback(() => {
    keyManagementService.clearSensitiveData();
    setKeyStatus(prev => prev ? { ...prev, isLoaded: false } : null);
  }, []);

  /**
   * Perform comprehensive security audit
   */
  const performSecurityAudit = useCallback(async () => {
    setError(null);
    
    try {
      const audit = await keyManagementService.performSecurityAudit();
      setSecurityAudit(audit);
      return audit;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Security audit failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Run system diagnostics
   */
  const runDiagnostics = useCallback(async () => {
    setError(null);
    
    try {
      return await keyManagementService.runDiagnostics();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Diagnostics failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Test encryption password
   */
  const testPassword = useCallback(async (password: string) => {
    setError(null);
    
    try {
      return await keyManagementService.testEncryptionPassword(password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password test failed';
      setError(errorMessage);
      return false;
    }
  }, []);

  // Initialize when userData changes
  useEffect(() => {
    if (userData) {
      initialize();
    }
  }, [initialize, userData]);

  return {
    keyStatus,
    encryptionStats,
    securityAudit,
    isLoading,
    error,
    
    // Actions
    refreshKeyStatus,
    setMasterKey,
    clearMasterKey,
    performSecurityAudit,
    runDiagnostics,
    testPassword
  };
}