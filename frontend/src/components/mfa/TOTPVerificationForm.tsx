/**
 * TOTP Code Verification Form Component
 * 
 * A form component for verifying TOTP codes during MFA authentication,
 * with support for both 6-digit TOTP codes and 8-character backup codes.
 */

import React, { useState, useEffect, useRef } from 'react';
import { mfaService } from '../../services/mfaService';
import { MFAVerifyResponse } from '../../types/mfa';

interface TOTPVerificationFormProps {
  onVerificationSuccess?: (result: MFAVerifyResponse) => void;
  onVerificationFailure?: (error: string) => void;
  onCancel?: () => void;
  allowBackupCodes?: boolean;
  autoFocus?: boolean;
  showInstructions?: boolean;
  className?: string;
  submitButtonText?: string;
  cancelButtonText?: string;
}

export default function TOTPVerificationForm({
  onVerificationSuccess,
  onVerificationFailure,
  onCancel,
  allowBackupCodes = true,
  autoFocus = true,
  showInstructions = true,
  className = '',
  submitButtonText = 'Verify',
  cancelButtonText = 'Cancel'
}: TOTPVerificationFormProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    // Detect if user is entering a backup code (8 characters)
    setIsBackupCode(code.length > 6);
  }, [code]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, '').toUpperCase();
    
    if (isBackupCode || value.length > 6) {
      // Handle backup code input (alphanumeric, up to 8 characters)
      const filteredValue = value.replace(/[^A-Z0-9]/g, '').slice(0, 8);
      setCode(filteredValue);
    } else {
      // Handle TOTP code input (digits only, up to 6 characters)
      const filteredValue = value.replace(/\D/g, '').slice(0, 6);
      setCode(filteredValue);
    }
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Please enter a verification code');
      return;
    }

    // Validate code format
    if (!mfaService.validateMFACode(code)) {
      if (isBackupCode) {
        setError('Backup codes must be exactly 8 characters');
      } else {
        setError('TOTP codes must be exactly 6 digits');
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await mfaService.verifyMFA({ code: code.trim() });

      if (response.success && response.data) {
        if (response.data.verified) {
          if (onVerificationSuccess) {
            onVerificationSuccess(response.data);
          }
        } else {
          const errorMsg = 'Invalid verification code. Please try again.';
          setError(errorMsg);
          setCode('');
          if (onVerificationFailure) {
            onVerificationFailure(errorMsg);
          }
        }
      } else {
        const errorMsg = response.error?.detail || 'Verification failed';
        setError(errorMsg);
        setCode('');
        if (onVerificationFailure) {
          onVerificationFailure(errorMsg);
        }
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      setCode('');
      if (onVerificationFailure) {
        onVerificationFailure(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const formatCodeDisplay = (code: string): string => {
    if (isBackupCode) {
      // Format backup code: ABCD EFGH
      return code.replace(/(.{4})/g, '$1 ').trim();
    } else {
      // Format TOTP code: 123 456
      return code.replace(/(.{3})/g, '$1 ').trim();
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {showInstructions && (
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Enter Verification Code
          </h3>
          <p className="text-sm text-gray-500">
            Enter the {isBackupCode ? '8-character backup code' : '6-digit code from your authenticator app'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-2">
            {isBackupCode ? 'Backup Code' : 'Authenticator Code'}
          </label>
          
          <input
            ref={inputRef}
            id="verification-code"
            type="text"
            value={formatCodeDisplay(code)}
            onChange={handleCodeChange}
            className={`
              block w-full px-4 py-3 text-center text-2xl font-mono tracking-widest
              border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2
              ${error 
                ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            placeholder={isBackupCode ? 'ABCD EFGH' : '000 000'}
            maxLength={isBackupCode ? 9 : 7} // Account for space in formatted display
            disabled={isLoading}
            autoComplete="one-time-code"
            inputMode="text"
          />
          
          {!isBackupCode && (
            <p className="mt-1 text-xs text-gray-500">
              Enter the 6-digit code from your authenticator app
            </p>
          )}
          
          {isBackupCode && (
            <p className="mt-1 text-xs text-gray-500">
              Enter one of your 8-character backup codes
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {allowBackupCodes && !isBackupCode && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsBackupCode(true);
                setCode('');
                setError(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-500 underline"
            >
              Can't access your authenticator? Use a backup code
            </button>
          </div>
        )}

        {allowBackupCodes && isBackupCode && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsBackupCode(false);
                setCode('');
                setError(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-500 underline"
            >
              Back to authenticator code
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              {cancelButtonText}
            </button>
          )}
          
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !code.trim() || (isBackupCode ? code.length !== 8 : code.length !== 6)}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              submitButtonText
            )}
          </button>
        </div>
      </form>

      {/* Help Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium mb-2">
            Need help with verification codes?
          </summary>
          <div className="space-y-3 text-gray-600 text-xs pl-4">
            <div>
              <p className="font-medium text-gray-700">Authenticator app codes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>6 digits that change every 30 seconds</li>
                <li>Make sure your device time is correct</li>
                <li>Enter the current code, not an expired one</li>
              </ul>
            </div>
            
            {allowBackupCodes && (
              <div>
                <p className="font-medium text-gray-700">Backup codes:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>8-character codes from your MFA setup</li>
                  <li>Each code can only be used once</li>
                  <li>Use when you don't have access to your authenticator</li>
                </ul>
              </div>
            )}
            
            <div>
              <p className="font-medium text-gray-700">Still having trouble?</p>
              <p className="ml-2">Contact your administrator for help with MFA reset.</p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}