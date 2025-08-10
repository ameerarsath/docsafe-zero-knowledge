/**
 * Session Key Manager Component
 * 
 * Handles encryption session initialization and management:
 * - Password prompt for session initialization
 * - Session status display
 * - Auto-expiry handling
 * - Session extension on activity
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Lock,
  Unlock,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { encryptionApi, SessionKeyData } from '../../services/api/encryptionService';
import { documentEncryptionService } from '../../services/documentEncryption';

interface SessionKeyManagerProps {
  onSessionChange?: (isActive: boolean) => void;
  showStatus?: boolean;
  className?: string;
}

interface SessionStatus {
  isActive: boolean;
  expiresAt?: number;
  timeRemaining?: number;
  keyHash?: string;
}

export default function SessionKeyManager({ 
  onSessionChange, 
  showStatus = true, 
  className = '' 
}: SessionKeyManagerProps) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({ isActive: false });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMasterKey, setHasMasterKey] = useState(false);

  // Check session status on mount and set up interval
  useEffect(() => {
    checkSessionStatus();
    
    // Check session every 30 seconds
    const interval = setInterval(checkSessionStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Update parent component when session changes
  useEffect(() => {
    if (onSessionChange) {
      onSessionChange(sessionStatus.isActive);
    }
  }, [sessionStatus.isActive, onSessionChange]);

  const checkSessionStatus = () => {
    const sessionKey = encryptionApi.getSessionKey();
    const masterKeyStatus = documentEncryptionService.hasMasterKey();
    
    // Update master key state
    setHasMasterKey(masterKeyStatus);
    
    if (sessionKey && sessionKey.expiresAt > Date.now()) {
      const timeRemaining = sessionKey.expiresAt - Date.now();
      setSessionStatus({
        isActive: true,
        expiresAt: sessionKey.expiresAt,
        timeRemaining,
        keyHash: sessionKey.keyHash.substring(0, 8) + '...'
      });
    } else {
      setSessionStatus({ isActive: false });
      encryptionApi.clearSession();
    }
  };

  const handleInitializeSession = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Check if user has zero-knowledge encryption configured
      const userHasEncryption = sessionStorage.getItem('user_has_encryption') === 'true';
      
      if (userHasEncryption) {
        console.log('🔑 SessionKeyManager: Attempting zero-knowledge key restoration');
        
        // Restore master key using stored encryption parameters
        const encryptionSalt = sessionStorage.getItem('encryption_salt');
        const keyVerificationPayload = sessionStorage.getItem('key_verification_payload');
        const keyDerivationIterations = parseInt(sessionStorage.getItem('key_derivation_iterations') || '500000');
        
        if (encryptionSalt && keyVerificationPayload) {
          const { 
            deriveKey, 
            verifyKeyValidation,
            base64ToUint8Array
          } = await import('../../utils/encryption');
          
          // Derive master key from encryption password
          const salt = base64ToUint8Array(encryptionSalt);
          const masterKey = await deriveKey({
            password,
            salt,
            iterations: keyDerivationIterations
          });
          
          // Verify the derived key using the verification payload
          const isValidKey = await verifyKeyValidation(
            user?.username || 'user', // Use actual username for validation
            masterKey,
            keyVerificationPayload
          );
          
          if (!isValidKey) {
            setError('Incorrect encryption password. Please verify you are using your encryption password, not your login password.');
            return;
          }
          
          // Set master key in document encryption service
          await documentEncryptionService.setMasterKey(masterKey);
          const debugInfo = documentEncryptionService.getDebugInfo();
          console.log('✅ Master key restored successfully on service instance:', debugInfo);
          
          // DO NOT clear the user_has_encryption flag - this indicates the user has zero-knowledge encryption configured
          // Only clear the temporary restoration flags, keep the permanent config flag
          // sessionStorage.removeItem('user_has_encryption'); // REMOVED - this was causing the session persistence issue
          
          setPassword('');
          setShowPasswordModal(false);
          checkSessionStatus();
          return;
        }
      }
      
      // Fallback to legacy session initialization
      await encryptionApi.initializeSession(password);
      setPassword('');
      setShowPasswordModal(false);
      checkSessionStatus();
    } catch (err) {
      setError(err.message || 'Failed to initialize encryption session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtendSession = () => {
    try {
      encryptionApi.extendSession();
      checkSessionStatus();
    } catch (err) {
      setError('Failed to extend session');
    }
  };

  const handleClearSession = () => {
    encryptionApi.clearSession();
    setSessionStatus({ isActive: false });
  };

  const formatTimeRemaining = (timeMs: number): string => {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (!sessionStatus.isActive) {
      // Check if zero-knowledge master key is active
      if (hasMasterKey) {
        return 'text-green-600 bg-green-100'; // Green for zero-knowledge encryption
      }
      return 'text-red-600 bg-red-100'; // Red for no encryption
    }
    if (sessionStatus.timeRemaining && sessionStatus.timeRemaining < 300000) { // < 5 minutes
      return 'text-orange-600 bg-orange-100';
    }
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = () => {
    if (!sessionStatus.isActive) {
      // Check if zero-knowledge master key is active
      if (hasMasterKey) {
        return <Unlock className="w-4 h-4" />; // Unlocked for zero-knowledge encryption
      }
      return <Lock className="w-4 h-4" />; // Locked for no encryption
    }
    if (sessionStatus.timeRemaining && sessionStatus.timeRemaining < 300000) {
      return <Clock className="w-4 h-4" />;
    }
    return <Unlock className="w-4 h-4" />;
  };

  if (!showStatus && sessionStatus.isActive) {
    return null; // Hide component when session is active and status display is disabled
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Session Status Display */}
      {showStatus && (
        <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="ml-2">
            {sessionStatus.isActive ? (
              <>
                Encryption Session Active
                {sessionStatus.timeRemaining && (
                  <span className="ml-2">
                    ({formatTimeRemaining(sessionStatus.timeRemaining)} remaining)
                  </span>
                )}
              </>
            ) : hasMasterKey ? (
              <>
                Zero-Knowledge Encryption Active
              </>
            ) : (
              sessionStorage.getItem('user_has_encryption') === 'true'
                ? 'Encryption Key Not Loaded'
                : 'No Active Encryption Session'
            )}
          </span>
        </div>
      )}

      {/* Session Actions */}
      <div className="flex items-center space-x-3">
        {sessionStatus.isActive ? (
          <>
            <button
              onClick={handleExtendSession}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Extend Session
            </button>
            <button
              onClick={handleClearSession}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Lock className="w-4 h-4 mr-2" />
              End Session
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Key className="w-4 h-4 mr-2" />
            Initialize Encryption Session
          </button>
        )}
      </div>

      {/* Session Details */}
      {sessionStatus.isActive && sessionStatus.keyHash && (
        <div className="text-xs text-gray-500">
          Key: {sessionStatus.keyHash} | 
          Expires: {sessionStatus.expiresAt ? new Date(sessionStatus.expiresAt).toLocaleTimeString() : 'Unknown'}
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <Key className="w-6 h-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Initialize Encryption Session</h3>
            </div>
            
            <div className="mb-4">
              {sessionStorage.getItem('user_has_encryption') === 'true' ? (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Key className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700 font-medium">
                        Zero-Knowledge Encryption Active
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        Enter your <strong>encryption password</strong> to restore access to your encrypted documents.
                      </p>
                      <p className="text-xs text-blue-500 mt-1">
                        ⚠️ This is your <em>encryption password</em>, which may be different from your login password.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <p className="text-sm text-gray-700">
                    Enter your login password to create a temporary encryption session. This will allow you to encrypt and upload documents for the next 30 minutes.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Note: For maximum security, consider setting up zero-knowledge encryption in your account settings.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {sessionStorage.getItem('user_has_encryption') === 'true' 
                    ? 'Encryption Password' 
                    : 'Login Password'
                  }
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleInitializeSession()}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={sessionStorage.getItem('user_has_encryption') === 'true' 
                      ? 'Enter your encryption password' 
                      : 'Enter your login password'
                    }
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInitializeSession}
                  disabled={isLoading || !password.trim()}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  Initialize Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for using session status in other components
export function useSessionStatus() {
  const [isActive, setIsActive] = useState(false);

  const checkStatus = useCallback(() => {
    // Check legacy session status
    const legacyActive = encryptionApi.isSessionActive();
    
    // Check zero-knowledge master key status
    const zeroKnowledgeActive = documentEncryptionService.hasMasterKey();
    
    const active = legacyActive || zeroKnowledgeActive;
    console.log('🔄 useSessionStatus checkStatus:', { legacyActive, zeroKnowledgeActive, active });
    setIsActive(active);
  }, []);

  useEffect(() => {
    // Check immediately
    checkStatus();
    
    // Listen for master key changes (event-based, immediate updates)
    documentEncryptionService.addMasterKeyChangeListener(checkStatus);
    
    // Check every 2 seconds for faster responsiveness
    const interval = setInterval(checkStatus, 2000);
    
    // Also listen for storage events to detect session changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'session_encryption_key' || e.key === 'session_key_expiry' || e.key === 'user_has_encryption' || e.key === 'has_master_key') {
        checkStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      documentEncryptionService.removeMasterKeyChangeListener(checkStatus);
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkStatus]);

  return {
    isActive,
    getSessionKey: () => encryptionApi.getSessionKey(),
    clearSession: () => {
      encryptionApi.clearSession();
      // Also clear zero-knowledge key
      documentEncryptionService.clearMasterKey();
      checkStatus(); // Immediately update status
    },
    extendSession: () => {
      encryptionApi.extendSession();
      checkStatus(); // Immediately update status
    },
    refreshStatus: checkStatus // Allow manual refresh
  };
}