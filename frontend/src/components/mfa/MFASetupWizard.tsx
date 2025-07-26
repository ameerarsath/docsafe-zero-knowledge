/**
 * MFA Setup Wizard Component for SecureVault Frontend
 * 
 * A multi-step wizard that guides users through setting up multi-factor
 * authentication including password verification, QR code scanning, 
 * TOTP verification, and backup codes management.
 */

import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mfaService } from '../../services/mfaService';
import { MFASetupStep, MFASetupWizardState, MFASetupResponse } from '../../types/mfa';

interface MFASetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

export default function MFASetupWizard({ 
  onComplete, 
  onCancel, 
  className = '' 
}: MFASetupWizardProps) {
  const { user } = useAuth();
  
  const [wizardState, setWizardState] = useState<MFASetupWizardState>({
    currentStep: 'password',
    setupData: null,
    isLoading: false,
    error: null,
    backupCodesSaved: false,
  });

  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  // Step progression
  const steps: MFASetupStep[] = ['password', 'qr-code', 'verify', 'backup-codes', 'complete'];
  const currentStepIndex = steps.indexOf(wizardState.currentStep);

  const updateWizardState = useCallback((updates: Partial<MFASetupWizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleError = useCallback((error: string) => {
    updateWizardState({ 
      error, 
      isLoading: false 
    });
  }, [updateWizardState]);

  const clearError = useCallback(() => {
    updateWizardState({ error: null });
  }, [updateWizardState]);

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      updateWizardState({ 
        currentStep: steps[nextIndex],
        error: null 
      });
    }
  }, [currentStepIndex, steps, updateWizardState]);

  const previousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      updateWizardState({ 
        currentStep: steps[prevIndex],
        error: null 
      });
    }
  }, [currentStepIndex, steps, updateWizardState]);

  // Step 1: Password verification and MFA setup
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      handleError('Password is required');
      return;
    }

    updateWizardState({ isLoading: true, error: null });

    try {
      const response = await mfaService.setupMFA({ 
        password: password.trim(),
        issuer: 'SecureVault'
      });

      if (response.success && response.data) {
        updateWizardState({
          setupData: response.data,
          isLoading: false,
        });
        nextStep();
      } else {
        handleError(response.error?.detail || 'Failed to setup MFA');
      }
    } catch (error) {
      handleError('An unexpected error occurred');
    }
  };

  // Step 3: Verify TOTP code
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      handleError('Verification code is required');
      return;
    }

    if (!mfaService.validateMFACode(verificationCode)) {
      handleError('Please enter a valid 6-digit code');
      return;
    }

    updateWizardState({ isLoading: true, error: null });

    try {
      const response = await mfaService.verifyMFA({ 
        code: verificationCode.trim() 
      });

      if (response.success && response.data?.verified) {
        updateWizardState({ isLoading: false });
        nextStep();
      } else {
        handleError('Invalid verification code. Please try again.');
        setVerificationCode('');
      }
    } catch (error) {
      handleError('An unexpected error occurred during verification');
      setVerificationCode('');
    }
  };

  // Handle backup codes actions
  const handleBackupCodesSaved = () => {
    updateWizardState({ backupCodesSaved: true });
  };

  const handleDownloadBackupCodes = () => {
    if (wizardState.setupData && user?.email) {
      mfaService.downloadBackupCodes(wizardState.setupData.backup_codes, user.email);
      handleBackupCodesSaved();
    }
  };

  const handleCopyBackupCodes = async () => {
    if (wizardState.setupData && user?.email) {
      const success = await mfaService.copyBackupCodesToClipboard(
        wizardState.setupData.backup_codes, 
        user.email
      );
      if (success) {
        handleBackupCodesSaved();
      } else {
        handleError('Failed to copy backup codes to clipboard');
      }
    }
  };

  const handlePrintBackupCodes = () => {
    if (wizardState.setupData && user?.email) {
      mfaService.printBackupCodes(wizardState.setupData.backup_codes, user.email);
      handleBackupCodesSaved();
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.slice(0, -1).map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${index <= currentStepIndex 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {index + 1}
              </div>
              <div className={`
                ml-2 text-sm font-medium
                ${index <= currentStepIndex ? 'text-blue-600' : 'text-gray-500'}
              `}>
                {step === 'password' && 'Verify'}
                {step === 'qr-code' && 'Scan'}
                {step === 'verify' && 'Confirm'}
                {step === 'backup-codes' && 'Save Codes'}
              </div>
            </div>
            {index < steps.length - 2 && (
              <div className={`
                flex-1 h-0.5 mx-4
                ${index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'}
              `} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderPasswordStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Set Up Two-Factor Authentication</h3>
        <p className="mt-2 text-sm text-gray-500">
          Add an extra layer of security to your account by setting up MFA. 
          You'll need an authenticator app like Google Authenticator or Authy.
        </p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Confirm your password to continue
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your current password"
            disabled={wizardState.isLoading}
            autoFocus
          />
        </div>

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={wizardState.isLoading || !password.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {wizardState.isLoading ? 'Setting up...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderQRCodeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Scan QR Code</h3>
        <p className="mt-2 text-sm text-gray-500">
          Scan this QR code with your authenticator app to add your SecureVault account.
        </p>
      </div>

      {wizardState.setupData && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <img 
                src={wizardState.setupData.qr_code_data_uri} 
                alt="MFA Setup QR Code" 
                className="w-48 h-48"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Can't scan the QR code?
            </h4>
            <p className="text-xs text-gray-600 mb-2">
              Manually enter this key in your authenticator app:
            </p>
            <div className="bg-white p-2 rounded border font-mono text-sm break-all">
              {wizardState.setupData.secret}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Recommended Authenticator Apps
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Google Authenticator</li>
              <li>• Microsoft Authenticator</li>
              <li>• Authy</li>
              <li>• 1Password</li>
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={previousStep}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Verify Setup</h3>
        <p className="mt-2 text-sm text-gray-500">
          Enter the 6-digit code from your authenticator app to verify the setup.
        </p>
      </div>

      <form onSubmit={handleVerificationSubmit} className="space-y-4">
        <div>
          <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <input
            id="verification-code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="000000"
            maxLength={6}
            disabled={wizardState.isLoading}
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={previousStep}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={wizardState.isLoading || verificationCode.length !== 6}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {wizardState.isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderBackupCodesStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Save Your Backup Codes</h3>
        <p className="mt-2 text-sm text-gray-500">
          Store these backup codes in a safe place. Each code can only be used once 
          if you lose access to your authenticator app.
        </p>
      </div>

      {wizardState.setupData && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {mfaService.formatBackupCodes(wizardState.setupData.backup_codes).map((code, index) => (
                <div key={index} className="bg-white p-2 rounded border text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={handleDownloadBackupCodes}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </button>
            <button
              type="button"
              onClick={handleCopyBackupCodes}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.728 9.728 0 00-1.063-.425A1.125 1.125 0 014.5 6.375V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0022.5 18V6.375a1.125 1.125 0 00-1.125-1.125H12.75a9.728 9.728 0 00-1.063.425H15.75z" />
              </svg>
              Copy
            </button>
            <button
              type="button"
              onClick={handlePrintBackupCodes}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231a1.125 1.125 0 01-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.125-.813-2.083-1.929-2.346l-4.18-.66A12.114 12.114 0 009.109 6.75H7.5A2.25 2.25 0 005.25 9v6.75A2.25 2.25 0 007.5 18h11.318z" />
              </svg>
              Print
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <h4 className="font-medium text-yellow-800">Important Security Note</h4>
                <p className="text-yellow-700 mt-1">
                  Store these codes securely offline. Each code can only be used once. 
                  If you lose access to both your authenticator app and these codes, 
                  you'll need an administrator to reset your MFA.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={previousStep}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          disabled={!wizardState.backupCodesSaved}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {wizardState.backupCodesSaved ? 'Continue' : 'Save codes first'}
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">MFA Setup Complete!</h3>
        <p className="mt-2 text-sm text-gray-500">
          Two-factor authentication has been successfully enabled for your account. 
          Your account is now more secure.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-800 mb-2">What happens next?</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• You'll need your authenticator app to sign in</li>
          <li>• Keep your backup codes in a safe place</li>
          <li>• You can manage MFA settings in your profile</li>
          <li>• Contact your administrator if you need help</li>
        </ul>
      </div>

      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={handleComplete}
          className="px-6 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Finish Setup
        </button>
      </div>
    </div>
  );

  return (
    <div className={`max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {renderStepIndicator()}

      {wizardState.error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="text-red-800">{wizardState.error}</p>
              <button
                type="button"
                onClick={clearError}
                className="mt-1 text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {wizardState.currentStep === 'password' && renderPasswordStep()}
      {wizardState.currentStep === 'qr-code' && renderQRCodeStep()}
      {wizardState.currentStep === 'verify' && renderVerifyStep()}
      {wizardState.currentStep === 'backup-codes' && renderBackupCodesStep()}
      {wizardState.currentStep === 'complete' && renderCompleteStep()}
    </div>
  );
}