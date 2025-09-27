/**
 * React hook for security monitoring and management.
 * 
 * This hook provides security features including:
 * - Security headers monitoring
 * - CSP violation tracking
 * - Suspicious activity detection
 * - Security status reporting
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SecurityMonitor,
  SecurityHeadersStatus,
  SecurityEventListener,
  SuspiciousActivity,
  CSPViolationReport,
  checkSecurityHeaders,
  isSecureContext,
  generateSecureToken
} from '../utils/security';

// Types
export interface SecurityState {
  isSecure: boolean;
  headersStatus: SecurityHeadersStatus | null;
  violations: CSPViolationReport[];
  suspiciousActivities: SuspiciousActivity[];
  isMonitoring: boolean;
  isLoading: boolean;
  lastCheck: string | null;
  error: string | null;
  isEmittingEvent?: boolean; // Flag to prevent infinite recursion
}

export interface SecurityActions {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  checkHeaders: () => Promise<void>;
  testEncryption: () => Promise<void>;
  reportViolation: (violation: CSPViolationReport) => void;
  reportSuspiciousActivity: (activity: SuspiciousActivity) => void;
  clearViolations: () => void;
  clearSuspiciousActivities: () => void;
  generateToken: () => string;
  reset: () => void;
}

export interface UseSecurityOptions {
  autoStart?: boolean;
  maxViolations?: number;
  maxSuspiciousActivities?: number;
  onSecurityEvent?: (event: SecurityEvent) => void;
}

export interface SecurityEvent {
  type: 'violation' | 'suspicious_activity' | 'headers_check' | 'security_warning';
  data: any;
  timestamp: string;
}

export interface UseSecurityReturn extends SecurityState, SecurityActions {}

/**
 * Hook for security monitoring and management
 */
export function useSecurity(options: UseSecurityOptions = {}): UseSecurityReturn {
  const {
    autoStart = true,
    maxViolations = 100,
    maxSuspiciousActivities = 50,
    onSecurityEvent
  } = options;

  // State
  const [state, setState] = useState<SecurityState>({
    isSecure: isSecureContext(),
    headersStatus: null,
    violations: [],
    suspiciousActivities: [],
    isMonitoring: false,
    isLoading: false,
    lastCheck: null,
    error: null,
    isEmittingEvent: false
  });

  // Refs
  const listenerRef = useRef<SecurityEventListener | null>(null);
  const eventCallbackRef = useRef(onSecurityEvent);

  // Update callback ref
  useEffect(() => {
    eventCallbackRef.current = onSecurityEvent;
  }, [onSecurityEvent]);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<SecurityState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Ref to track emitting state to avoid stale closures
  const isEmittingRef = useRef(false);

  /**
   * Emit security event
   */
  const emitSecurityEvent = useCallback((type: SecurityEvent['type'], data: any) => {
    // Prevent infinite recursion
    if (isEmittingRef.current) return;
    
    const event: SecurityEvent = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    // Set flag to prevent recursion
    isEmittingRef.current = true;
    
    try {
      if (eventCallbackRef.current) {
        eventCallbackRef.current(event);
      }
    } finally {
      // Always reset flag
      isEmittingRef.current = false;
    }
  }, []);

  /**
   * Start security monitoring
   */
  const startMonitoring = useCallback(() => {
    if (state.isMonitoring) return;

    // Create security event listener
    const listener: SecurityEventListener = {
      onSecurityCheck: (status: SecurityHeadersStatus) => {
        updateState({
          headersStatus: status,
          lastCheck: new Date().toISOString(),
          error: status.error || null
        });

        emitSecurityEvent('headers_check', status);

        if (!status.hasRequiredHeaders) {
          emitSecurityEvent('security_warning', {
            message: 'Missing required security headers',
            status
          });
        }
      },

      onSuspiciousActivity: (activity: SuspiciousActivity) => {
        setState(prev => {
          const newActivities = [
            { ...activity, timestamp: new Date().toISOString() },
            ...prev.suspiciousActivities
          ].slice(0, maxSuspiciousActivities);

          return {
            ...prev,
            suspiciousActivities: newActivities
          };
        });

        emitSecurityEvent('suspicious_activity', activity);
      },

      onCSPViolation: (violation: CSPViolationReport) => {
        setState(prev => {
          const newViolations = [
            violation,
            ...prev.violations
          ].slice(0, maxViolations);

          return {
            ...prev,
            violations: newViolations
          };
        });

        emitSecurityEvent('violation', violation);
      }
    };

    listenerRef.current = listener;
    SecurityMonitor.addListener(listener);
    SecurityMonitor.start();

    updateState({ isMonitoring: true });
  }, [state.isMonitoring, updateState, emitSecurityEvent, maxViolations, maxSuspiciousActivities]);

  /**
   * Stop security monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!state.isMonitoring) return;

    if (listenerRef.current) {
      SecurityMonitor.removeListener(listenerRef.current);
      listenerRef.current = null;
    }

    SecurityMonitor.stop();
    updateState({ isMonitoring: false });
  }, [state.isMonitoring, updateState]);

  /**
   * Check security headers manually
   */
  const checkHeaders = useCallback(async () => {
    try {
      updateState({ error: null, isLoading: true });
      const status = await checkSecurityHeaders();

      updateState({
        headersStatus: status,
        lastCheck: new Date().toISOString(),
        error: status.error || null,
        isLoading: false
      });

      emitSecurityEvent('headers_check', status);

      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Security headers check failed:', errorMessage);
      updateState({ error: errorMessage, isLoading: false });

      emitSecurityEvent('security_warning', {
        message: 'Failed to check security headers',
        error: errorMessage
      });

      throw error;
    }
  }, [updateState, emitSecurityEvent]);

  /**
   * Test encryption functionality
   */
  const testEncryption = useCallback(async () => {
    try {
      updateState({ error: null, isLoading: true });

      // Import encryption utilities dynamically
      const { encryptText, decryptText, deriveKey, generateSalt } = await import('../utils/encryption');

      // Generate a test key for encryption
      const salt = generateSalt();
      const testKey = await deriveKey({
        password: 'test_encryption_password',
        salt: salt,
        iterations: 100000
      });

      // Test encryption/decryption
      const testData = 'test_encryption_functionality';
      const encrypted = await encryptText(testData, testKey);
      const decrypted = await decryptText({
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        key: testKey
      });

      if (decrypted !== testData) {
        throw new Error('Encryption test failed: decrypted data does not match original');
      }

      updateState({ isLoading: false });

      emitSecurityEvent('security_warning', {
        message: 'Encryption test completed successfully'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Encryption test failed:', errorMessage);
      updateState({ error: errorMessage, isLoading: false });

      emitSecurityEvent('security_warning', {
        message: 'Failed to test encryption',
        error: errorMessage
      });

      throw error;
    }
  }, [updateState, emitSecurityEvent]);

  /**
   * Report CSP violation
   */
  const reportViolation = useCallback((violation: CSPViolationReport) => {
    setState(prev => {
      const newViolations = [
        violation,
        ...prev.violations
      ].slice(0, maxViolations);

      return {
        ...prev,
        violations: newViolations
      };
    });

    emitSecurityEvent('violation', violation);
  }, [maxViolations, emitSecurityEvent]);

  /**
   * Report suspicious activity
   */
  const reportSuspiciousActivity = useCallback((activity: SuspiciousActivity) => {
    setState(prev => {
      const newActivities = [
        { ...activity, timestamp: new Date().toISOString() },
        ...prev.suspiciousActivities
      ].slice(0, maxSuspiciousActivities);

      return {
        ...prev,
        suspiciousActivities: newActivities
      };
    });

    emitSecurityEvent('suspicious_activity', activity);
  }, [maxSuspiciousActivities, emitSecurityEvent]);

  /**
   * Clear all violations
   */
  const clearViolations = useCallback(() => {
    updateState({ violations: [] });
  }, [updateState]);

  /**
   * Clear all suspicious activities
   */
  const clearSuspiciousActivities = useCallback(() => {
    updateState({ suspiciousActivities: [] });
  }, [updateState]);

  /**
   * Generate secure token
   */
  const generateToken = useCallback(() => {
    return generateSecureToken();
  }, []);

  /**
   * Reset security state
   */
  const reset = useCallback(() => {
    setState({
      isSecure: isSecureContext(),
      headersStatus: null,
      violations: [],
      suspiciousActivities: [],
      isMonitoring: false,
      isLoading: false,
      lastCheck: null,
      error: null,
      isEmittingEvent: false
    });
  }, []);

  // Auto-start monitoring on mount
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    // Cleanup on unmount
    return () => {
      if (listenerRef.current) {
        SecurityMonitor.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      SecurityMonitor.stop();
    };
  }, [autoStart, startMonitoring]);

  // Initial security check
  useEffect(() => {
    if (autoStart) {
      checkHeaders().catch((error) => {
        console.warn('Initial security headers check failed:', error);
      });
    }
  }, [autoStart, checkHeaders]);

  return {
    // State
    ...state,

    // Actions
    startMonitoring,
    stopMonitoring,
    checkHeaders,
    testEncryption,
    reportViolation,
    reportSuspiciousActivity,
    clearViolations,
    clearSuspiciousActivities,
    generateToken,
    reset
  };
}

// Shared security instance to prevent multiple monitors
let sharedSecurityInstance: UseSecurityReturn | null = null;

/**
 * Hook for security status display
 */
export function useSecurityStatus() {
  const [status, setStatus] = useState<'secure' | 'warning' | 'insecure'>('secure');
  const [message, setMessage] = useState<string>('');

  const security = useSecurity({
    onSecurityEvent: (event) => {
      switch (event.type) {
        case 'headers_check':
          const headersData = event.data as SecurityHeadersStatus;
          if (!headersData.secure) {
            setStatus('insecure');
            setMessage('Connection is not secure');
          } else if (!headersData.hasRequiredHeaders) {
            setStatus('warning');
            setMessage('Missing security headers');
          } else {
            setStatus('secure');
            setMessage('Connection is secure');
          }
          break;

        case 'violation':
        case 'suspicious_activity':
        case 'security_warning':
          setStatus('warning');
          setMessage(
            event.type === 'violation' ? 'Security policy violation detected' :
            event.type === 'suspicious_activity' ? 'Suspicious activity detected' :
            event.data.message || 'Security warning'
          );
          break;
      }
    }
  });

  return {
    status,
    message,
    violationsCount: security.violations.length,
    suspiciousActivitiesCount: security.suspiciousActivities.length,
    lastCheck: security.lastCheck,
    isMonitoring: security.isMonitoring
  };
}

/**
 * Hook for CSP violation reporting
 */
export function useCSPViolations() {
  const [cspViolations, setCspViolations] = useState<any[]>([]);
  const [violationStats, setViolationStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchViolations = useCallback(async (hours: number = 24) => {
    setIsLoading(true);
    try {
      const { securityHeadersApi } = await import('../services/api/securityHeaders');
      const response = await securityHeadersApi.getCSPViolations(hours);
      setCspViolations(response.violations || []);
      setError(null);
    } catch (err) {
      console.warn('CSP violations endpoint not available:', err);
      // Set empty violations instead of throwing error
      setCspViolations([]);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchViolationStats = useCallback(async (days: number = 7) => {
    try {
      const { securityHeadersApi } = await import('../services/api/securityHeaders');
      const stats = await securityHeadersApi.getCSPViolationStats(days);
      setViolationStats(stats);
    } catch (err) {
      console.warn('CSP violation stats endpoint not available:', err);
      // Set empty stats instead of throwing error
      setViolationStats({
        total_violations: 0,
        time_range_days: days,
        top_violated_directives: [],
        top_source_ips: [],
        violations_by_day: {}
      });
    }
  }, []);

  const getViolationsByDirective = useCallback(() => {
    if (!violationStats) return {};
    return violationStats.top_violated_directives.reduce((acc: any, item: any) => {
      acc[item.directive] = Array(item.count).fill({ violatedDirective: item.directive });
      return acc;
    }, {});
  }, [violationStats]);

  const clearViolations = useCallback(() => {
    setCspViolations([]);
    setViolationStats(null);
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchViolations();
    fetchViolationStats();
  }, [fetchViolations, fetchViolationStats]);

  return {
    violations: cspViolations,
    violationsByDirective: getViolationsByDirective(),
    recentViolations: cspViolations,
    totalCount: cspViolations.length,
    stats: violationStats,
    isLoading,
    error,
    clearViolations,
    fetchViolations,
    fetchViolationStats,
    reportViolation: async (violation: CSPViolationReport) => {
      try {
        const { securityHeadersApi } = await import('../services/api/securityHeaders');
        await securityHeadersApi.reportCSPViolation({
          violation,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href
        });
        // Refresh violations after reporting
        await fetchViolations();
      } catch (err) {
        console.warn('Failed to report CSP violation:', err);
        // Don't throw error, just log it
      }
    }
  };
}