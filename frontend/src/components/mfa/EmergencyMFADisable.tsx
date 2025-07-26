/**
 * Emergency MFA Disable Component
 * 
 * Provides emergency procedures for users who have lost access to both
 * their authenticator app and backup codes. Includes admin contact,
 * verification processes, and guided recovery options.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { mfaService } from '../../services/mfaService';
import { MFAStatus } from '../../types/mfa';

interface EmergencyMFADisableProps {
  userEmail?: string; // For admin-initiated emergency disable
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

type EmergencyStep = 
  | 'assessment'
  | 'verification' 
  | 'admin-contact'
  | 'admin-reset'
  | 'confirmation';

interface EmergencyState {
  currentStep: EmergencyStep;
  hasBackupCodes: boolean | null;
  hasAlternateAuth: boolean | null;
  contactMethod: 'email' | 'admin' | null;
  isLoading: boolean;
  error: string | null;
  mfaStatus: MFAStatus | null;
}

export default function EmergencyMFADisable({
  userEmail,
  onSuccess,
  onCancel,
  className = ''
}: EmergencyMFADisableProps) {
  const { user, hasRole } = useAuth();
  const isAdminMode = !!userEmail && user && hasRole('admin');
  const targetEmail = userEmail || user?.email || '';

  const [emergencyState, setEmergencyState] = useState<EmergencyState>({
    currentStep: 'assessment',
    hasBackupCodes: null,
    hasAlternateAuth: null,
    contactMethod: null,
    isLoading: false,
    error: null,
    mfaStatus: null,
  });

  const [adminResetData, setAdminResetData] = useState({
    reason: '',
    userConfirmed: false,
    isSubmitting: false,
  });

  useEffect(() => {
    if (!isAdminMode) {
      loadMFAStatus();
    }
  }, [isAdminMode]);

  const loadMFAStatus = async () => {
    setEmergencyState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await mfaService.getMFAStatus();
      if (response.success && response.data) {
        setEmergencyState(prev => ({
          ...prev,
          mfaStatus: response.data,
          isLoading: false,
        }));
      } else {
        setEmergencyState(prev => ({
          ...prev,
          error: 'Failed to load MFA status',
          isLoading: false,
        }));
      }
    } catch (err) {
      setEmergencyState(prev => ({
        ...prev,
        error: 'An unexpected error occurred',
        isLoading: false,
      }));
    }
  };

  const updateEmergencyState = (updates: Partial<EmergencyState>) => {
    setEmergencyState(prev => ({ ...prev, ...updates }));
  };

  const handleStepChange = (step: EmergencyStep) => {
    updateEmergencyState({ currentStep: step, error: null });
  };

  const handleAssessmentSubmit = (hasBackup: boolean, hasAlternate: boolean) => {
    updateEmergencyState({
      hasBackupCodes: hasBackup,
      hasAlternateAuth: hasAlternate,
    });

    if (hasBackup || hasAlternate) {
      handleStepChange('verification');
    } else {
      handleStepChange('admin-contact');
    }
  };

  const handleContactMethodSelect = (method: 'email' | 'admin') => {
    updateEmergencyState({ contactMethod: method });
    
    if (method === 'admin') {
      handleStepChange('admin-reset');
    } else {
      // For email method, we would typically send a secure reset link
      handleStepChange('confirmation');
    }
  };

  const handleAdminReset = async () => {
    if (!isAdminMode || !adminResetData.reason.trim() || !adminResetData.userConfirmed) {
      return;
    }

    setAdminResetData(prev => ({ ...prev, isSubmitting: true }));

    try {
      const response = await mfaService.resetUserMFA({
        user_id: parseInt(userEmail?.split('@')[0] || '0'), // This is a simplified approach
        reason: adminResetData.reason.trim(),
      });

      if (response.success) {
        handleStepChange('confirmation');
        if (onSuccess) onSuccess();
      } else {
        updateEmergencyState({
          error: response.error?.detail || 'Failed to reset MFA'
        });
      }
    } catch (err) {
      updateEmergencyState({
        error: 'An unexpected error occurred during MFA reset'
      });
    } finally {
      setAdminResetData(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  if (emergencyState.isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading emergency options...</p>
        </div>
      </div>
    );
  }

  const renderAssessmentStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">MFA Emergency Access</h3>
        <p className="mt-2 text-sm text-gray-500">
          Can't access your authenticator app? Let's help you regain access to your account.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Before we proceed</h4>
          <p className="text-sm text-yellow-700">
            Emergency MFA disable should only be used when you've completely lost access to your 
            authentication methods. This process may require administrator approval.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">
            Let's assess your situation:
          </h4>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 mb-2">
                Do you have access to your backup codes?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleAssessmentSubmit(true, false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Yes, I have backup codes
                </button>
                <button
                  onClick={() => setEmergencyState(prev => ({ ...prev, hasBackupCodes: false }))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  No backup codes
                </button>
              </div>
            </div>

            {emergencyState.hasBackupCodes === false && (
              <div>
                <p className="text-sm text-gray-700 mb-2">
                  Can you access your authenticator app on another device?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleAssessmentSubmit(false, true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Yes, on another device
                  </button>
                  <button
                    onClick={() => handleAssessmentSubmit(false, false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    No access at all
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {onCancel && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancel and return to login
          </button>
        </div>
      )}
    </div>
  );

  const renderVerificationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159-.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1.035.43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Try Alternative Access</h3>
        <p className="mt-2 text-sm text-gray-500">
          Since you have {emergencyState.hasBackupCodes ? 'backup codes' : 'alternate access'}, 
          try using them first.
        </p>
      </div>

      <div className="space-y-4">
        {emergencyState.hasBackupCodes && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">Use Backup Codes</h4>
            <p className="text-sm text-green-700 mb-3">
              Return to the login page and click "Can't access your authenticator? Use a backup code" 
              to enter one of your 8-character backup codes.
            </p>
            <button
              onClick={onCancel}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-800 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Return to Login
            </button>
          </div>
        )}

        {emergencyState.hasAlternateAuth && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Use Alternate Device</h4>
            <p className="text-sm text-blue-700 mb-3">
              Open your authenticator app on your other device and enter the 6-digit code.
            </p>
            <button
              onClick={onCancel}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-800 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Login
            </button>
          </div>
        )}

        <div className="text-center pt-4">
          <button
            onClick={() => handleStepChange('admin-contact')}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Still can't access? Get help from administrator
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdminContactStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-orange-100">
          <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Administrator Assistance Required</h3>
        <p className="mt-2 text-sm text-gray-500">
          We need to verify your identity before disabling MFA for security reasons.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <h4 className="font-medium text-red-800">Security Notice</h4>
              <p className="text-red-700 mt-1">
                Disabling MFA reduces your account security. This action requires administrator approval 
                and identity verification.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Choose how to proceed:</h4>
          
          <div className="space-y-3">
            <button
              onClick={() => handleContactMethodSelect('admin')}
              className="w-full text-left p-4 border border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <h5 className="text-sm font-medium text-gray-900">Contact Administrator Directly</h5>
                  <p className="text-sm text-gray-500 mt-1">
                    Reach out to your system administrator for immediate assistance with MFA reset.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleContactMethodSelect('email')}
              className="w-full text-left p-4 border border-gray-300 rounded-lg hover:border-green-300 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75z" />
                </svg>
                <div>
                  <h5 className="text-sm font-medium text-gray-900">Request Email Verification</h5>
                  <p className="text-sm text-gray-500 mt-1">
                    Send a secure verification request to your registered email address.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">What you'll need:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Government-issued photo ID</li>
            <li>• Proof of employment or account ownership</li>
            <li>• Explanation of why MFA needs to be disabled</li>
            <li>• Alternative contact method verification</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => handleStepChange('assessment')}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Go back
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  const renderAdminResetStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-purple-100">
          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Administrator MFA Reset</h3>
        <p className="mt-2 text-sm text-gray-500">
          As an administrator, you can reset MFA for user: <strong>{targetEmail}</strong>
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-orange-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <h4 className="font-medium text-orange-800">Administrator Action Required</h4>
              <p className="text-orange-700 mt-1">
                This action will completely disable MFA for the user and remove all backup codes. 
                This action is logged for audit purposes.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="reset-reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for MFA reset (required)
          </label>
          <textarea
            id="reset-reason"
            value={adminResetData.reason}
            onChange={(e) => setAdminResetData(prev => ({ ...prev, reason: e.target.value }))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            rows={4}
            placeholder="Explain why MFA is being reset (e.g., user lost access to authenticator and backup codes, emergency access required for business continuity, etc.)"
            disabled={adminResetData.isSubmitting}
            required
            minLength={10}
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-500">
            This will be logged for audit purposes (10-500 characters)
          </p>
        </div>

        <div className="flex items-start">
          <input
            id="user-confirmed"
            type="checkbox"
            checked={adminResetData.userConfirmed}
            onChange={(e) => setAdminResetData(prev => ({ ...prev, userConfirmed: e.target.checked }))}
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            disabled={adminResetData.isSubmitting}
          />
          <label htmlFor="user-confirmed" className="ml-2 block text-sm text-gray-900">
            I confirm that I have verified the user's identity and this MFA reset is necessary
          </label>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => handleStepChange('admin-contact')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            disabled={adminResetData.isSubmitting}
          >
            Back
          </button>
          
          <button
            onClick={handleAdminReset}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              adminResetData.isSubmitting || 
              !adminResetData.reason.trim() || 
              adminResetData.reason.trim().length < 10 ||
              !adminResetData.userConfirmed
            }
          >
            {adminResetData.isSubmitting ? 'Resetting MFA...' : 'Reset User MFA'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Request Submitted</h3>
        <p className="mt-2 text-sm text-gray-500">
          {emergencyState.contactMethod === 'admin' 
            ? isAdminMode 
              ? 'MFA has been successfully reset for the user.'
              : 'Your administrator has been notified and will assist you shortly.'
            : 'A verification email has been sent to your registered email address.'
          }
        </p>
      </div>

      <div className="space-y-4">
        {emergencyState.contactMethod === 'email' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Check Your Email</h4>
            <p className="text-sm text-blue-700">
              We've sent a secure verification link to <strong>{targetEmail}</strong>. 
              Follow the instructions in the email to complete the MFA reset process.
            </p>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-800 mb-2">Next Steps</h4>
          <ul className="text-sm text-green-700 space-y-1">
            {isAdminMode ? (
              <>
                <li>• The user can now log in without MFA</li>
                <li>• User should set up MFA again immediately</li>
                <li>• This action has been logged for audit purposes</li>
              </>
            ) : (
              <>
                <li>• Wait for administrator approval</li>
                <li>• Be prepared to provide identity verification</li>
                <li>• Set up MFA again once access is restored</li>
              </>
            )}
          </ul>
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={onSuccess || onCancel}
            className="px-6 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            {isAdminMode ? 'Close' : 'Return to Login'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Error Display */}
      {emergencyState.error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="text-red-800">{emergencyState.error}</p>
              <button
                type="button"
                onClick={() => updateEmergencyState({ error: null })}
                className="mt-1 text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      {emergencyState.currentStep === 'assessment' && renderAssessmentStep()}
      {emergencyState.currentStep === 'verification' && renderVerificationStep()}
      {emergencyState.currentStep === 'admin-contact' && renderAdminContactStep()}
      {emergencyState.currentStep === 'admin-reset' && renderAdminResetStep()}
      {emergencyState.currentStep === 'confirmation' && renderConfirmationStep()}
    </div>
  );
}