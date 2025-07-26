/**
 * MFA Settings Page Component
 * 
 * A comprehensive MFA management page that allows users to:
 * - View MFA status and statistics
 * - Enable/disable MFA
 * - Manage backup codes
 * - View setup instructions
 * - Access emergency disable options
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { mfaService } from '../../services/mfaService';
import { MFAStatus } from '../../types/mfa';
import MFASetupWizard from './MFASetupWizard';
import BackupCodesManager from './BackupCodesManager';
import QRCodeDisplay from './QRCodeDisplay';
import AppLayout from '../layout/AppLayout';

interface MFASettingsPageProps {
  className?: string;
}

export default function MFASettingsPage({ className = '' }: MFASettingsPageProps) {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await mfaService.getMFAStatus();
      
      if (response.success && response.data) {
        setMfaStatus(response.data);
      } else {
        setError(response.error?.detail || 'Failed to load MFA status');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    loadMFAStatus();
  };

  const handleSetupCancel = () => {
    setShowSetupWizard(false);
  };

  const handleDisableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!disablePassword.trim()) {
      setError('Password is required to disable MFA');
      return;
    }

    setIsDisabling(true);
    setError(null);

    try {
      const response = await mfaService.disableMFA({
        password: disablePassword.trim(),
        admin_override: false
      });

      if (response.success) {
        setShowDisableConfirm(false);
        setDisablePassword('');
        await loadMFAStatus();
      } else {
        setError(response.error?.detail || 'Failed to disable MFA');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleDisableCancel = () => {
    setShowDisableConfirm(false);
    setDisablePassword('');
    setError(null);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading MFA settings...</p>
        </div>
      </div>
    );
  }

  // Show setup wizard if requested
  if (showSetupWizard) {
    return (
      <div className={className}>
        <MFASetupWizard 
          onComplete={handleSetupComplete}
          onCancel={handleSetupCancel}
        />
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-8 ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <p className="text-red-800">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-1 text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MFA Status Overview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Current Status</h2>
        </div>

        <div className="px-6 py-6">
          {mfaStatus ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  mfaStatus.enabled ? 'bg-green-400' : 'bg-gray-400'
                }`}></div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    MFA is {mfaStatus.enabled ? 'Enabled' : 'Disabled'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {mfaStatus.enabled 
                      ? `Set up on ${formatDate(mfaStatus.setup_date)}`
                      : 'Two-factor authentication is not enabled for your account'
                    }
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                {!mfaStatus.enabled ? (
                  <button
                    onClick={() => setShowSetupWizard(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Enable MFA
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowQRCode(!showQRCode)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h4.5v4.5h-4.5v-4.5z" />
                      </svg>
                      {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
                    </button>

                    <button
                      onClick={() => setShowDisableConfirm(true)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      Disable MFA
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load MFA status</h3>
              <p className="mt-1 text-sm text-gray-500">Please try refreshing the page</p>
              <button
                onClick={loadMFAStatus}
                className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-transparent rounded-md hover:bg-blue-100"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MFA Statistics (if enabled) */}
      {mfaStatus?.enabled && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">MFA Statistics</h2>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {mfaStatus.backup_codes_remaining}
                </div>
                <div className="text-sm text-gray-500">Backup codes remaining</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatDate(mfaStatus.setup_date)}
                </div>
                <div className="text-sm text-gray-500">Setup date</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatDate(mfaStatus.last_used)}
                </div>
                <div className="text-sm text-gray-500">Last used</div>
              </div>
            </div>

            {mfaStatus.required_by_policy && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-800">MFA Required by Policy</h4>
                    <p className="text-blue-700 mt-1">
                      Multi-factor authentication is required for your account role and cannot be disabled.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Display (if enabled and requested) */}
      {mfaStatus?.enabled && showQRCode && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Current QR Code</h2>
            <p className="text-sm text-gray-500">
              Scan this QR code to add your account to a new authenticator app
            </p>
          </div>
          <div className="px-6 py-6">
            <QRCodeDisplay 
              accountName={user?.email}
              showInstructions={true}
              showManualEntry={true}
            />
          </div>
        </div>
      )}

      {/* Backup Codes Management (if enabled) */}
      {mfaStatus?.enabled && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Backup Codes</h2>
          </div>
          <div className="px-6 py-6">
            <BackupCodesManager 
              showRegenerateButton={true}
              showUsageStats={true}
            />
          </div>
        </div>
      )}

      {/* Disable MFA Confirmation Modal */}
      {showDisableConfirm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity" />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.886 1.5.218 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-semibold leading-6 text-gray-900">
                      Disable Multi-Factor Authentication?
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Disabling MFA will make your account less secure. You'll only need your password to sign in.
                      </p>
                    </div>
                    
                    <form onSubmit={handleDisableSubmit} className="mt-4 space-y-3">
                      <div>
                        <label htmlFor="disable-password" className="block text-sm font-medium text-gray-700">
                          Confirm your password to continue
                        </label>
                        <input
                          id="disable-password"
                          type="password"
                          value={disablePassword}
                          onChange={(e) => setDisablePassword(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter your current password"
                          disabled={isDisabling}
                          autoFocus
                        />
                      </div>
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isDisabling || !disablePassword.trim()}
                        >
                          {isDisabling ? 'Disabling...' : 'Disable MFA'}
                        </button>
                        <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                          onClick={handleDisableCancel}
                          disabled={isDisabling}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Help Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Need Help?</h2>
        </div>
        <div className="px-6 py-6">
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900">What is Multi-Factor Authentication?</h4>
              <p>MFA adds an extra layer of security by requiring a second form of verification when you sign in.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">How do I use an authenticator app?</h4>
              <p>Download an app like Google Authenticator or Authy, scan the QR code, and enter the 6-digit codes when signing in.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">What if I lose my phone?</h4>
              <p>Use your backup codes to sign in, then set up MFA on a new device. Contact your administrator if you've lost both.</p>
            </div>
            
            {hasRole('admin') && (
              <div>
                <h4 className="font-medium text-gray-900">Administrator Options</h4>
                <p>As an administrator, you can manage MFA settings for other users and view system-wide MFA statistics.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}