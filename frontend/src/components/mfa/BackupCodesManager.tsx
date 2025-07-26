/**
 * Backup Codes Manager Component
 * 
 * Displays, manages, and allows regeneration of MFA backup codes.
 * Includes download, copy, and print functionality for secure storage.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mfaService } from '../../services/mfaService';
import { BackupCodesResponse, MFAStatus } from '../../types/mfa';

interface BackupCodesManagerProps {
  initialCodes?: string[];
  showRegenerateButton?: boolean;
  showUsageStats?: boolean;
  className?: string;
  onCodesRegenerated?: (codes: string[]) => void;
}

export default function BackupCodesManager({
  initialCodes,
  showRegenerateButton = true,
  showUsageStats = true,
  className = '',
  onCodesRegenerated
}: BackupCodesManagerProps) {
  const { user } = useAuth();
  
  const [codes, setCodes] = useState<string[]>(initialCodes || []);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [password, setPassword] = useState('');
  const [actionStatus, setActionStatus] = useState<{
    type: 'success' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    if (!initialCodes) {
      loadMFAStatus();
    }
  }, []);

  const loadMFAStatus = async () => {
    setIsLoading(true);
    try {
      const response = await mfaService.getMFAStatus();
      if (response.success && response.data) {
        setMfaStatus(response.data);
      }
    } catch (err) {
      setError('Failed to load MFA status');
    } finally {
      setIsLoading(false);
    }
  };

  const showStatus = (type: 'success' | 'info', message: string) => {
    setActionStatus({ type, message });
    setTimeout(() => setActionStatus({ type: null, message: '' }), 3000);
  };

  const handleDownload = () => {
    if (codes.length > 0 && user?.email) {
      mfaService.downloadBackupCodes(codes, user.email);
      showStatus('success', 'Backup codes downloaded successfully');
    }
  };

  const handleCopy = async () => {
    if (codes.length > 0 && user?.email) {
      const success = await mfaService.copyBackupCodesToClipboard(codes, user.email);
      if (success) {
        showStatus('success', 'Backup codes copied to clipboard');
      } else {
        setError('Failed to copy backup codes to clipboard');
      }
    }
  };

  const handlePrint = () => {
    if (codes.length > 0 && user?.email) {
      mfaService.printBackupCodes(codes, user.email);
      showStatus('info', 'Print dialog opened');
    }
  };

  const handleRegenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await mfaService.generateBackupCodes({
        password: password.trim(),
        count: 10
      });

      if (response.success && response.data) {
        setCodes(response.data.backup_codes);
        setShowRegenerateForm(false);
        setPassword('');
        showStatus('success', `Generated ${response.data.backup_codes.length} new backup codes`);
        
        if (onCodesRegenerated) {
          onCodesRegenerated(response.data.backup_codes);
        }
        
        // Reload MFA status to get updated counts
        await loadMFAStatus();
      } else {
        setError(response.error?.detail || 'Failed to generate backup codes');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCancelRegenerate = () => {
    setShowRegenerateForm(false);
    setPassword('');
    setError(null);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading backup codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Backup Codes</h3>
          <p className="text-sm text-gray-500">
            Use these codes if you don't have access to your authenticator app
          </p>
        </div>
        
        {showUsageStats && mfaStatus && (
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {mfaStatus.backup_codes_remaining} remaining
            </div>
            <div className="text-xs text-gray-500">
              out of {codes.length || 10} total
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {actionStatus.type && (
        <div className={`rounded-md p-4 ${
          actionStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex">
            <svg 
              className={`w-5 h-5 mr-2 flex-shrink-0 ${
                actionStatus.type === 'success' ? 'text-green-400' : 'text-blue-400'
              }`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className={`text-sm ${
              actionStatus.type === 'success' ? 'text-green-800' : 'text-blue-800'
            }`}>
              {actionStatus.message}
            </p>
          </div>
        </div>
      )}

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

      {/* Backup Codes Display */}
      {codes.length > 0 && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-sm">
              {mfaService.formatBackupCodes(codes).map((code, index) => (
                <div key={index} className="bg-white p-3 rounded border text-center">
                  <span className="text-gray-400 mr-2">{(index + 1).toString().padStart(2, '0')}.</span>
                  {code}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </button>
            
            <button
              onClick={handleCopy}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.728 9.728 0 010-1.063l.225-.007z" />
              </svg>
              Copy
            </button>
            
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231a1.125 1.125 0 01-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.125-.813-2.083-1.929-2.346l-4.18-.66A12.114 12.114 0 009.109 6.75H7.5A2.25 2.25 0 005.25 9v6.75A2.25 2.25 0 007.5 18h11.318z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      )}

      {/* Regenerate Section */}
      {showRegenerateButton && (
        <div className="border-t pt-6">
          {!showRegenerateForm ? (
            <div className="text-center">
              <button
                onClick={() => setShowRegenerateForm(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Generate New Backup Codes
              </button>
              <p className="mt-2 text-xs text-gray-500">
                This will replace all existing backup codes
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-900 mb-3">
                Generate New Backup Codes
              </h4>
              <p className="text-sm text-orange-800 mb-4">
                This will replace all your existing backup codes. Make sure to save the new codes securely.
              </p>
              
              <form onSubmit={handleRegenerateSubmit} className="space-y-3">
                <div>
                  <label htmlFor="regenerate-password" className="block text-sm font-medium text-gray-700">
                    Confirm your password
                  </label>
                  <input
                    id="regenerate-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter your current password"
                    disabled={isRegenerating}
                    autoFocus
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelRegenerate}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    disabled={isRegenerating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isRegenerating || !password.trim()}
                  >
                    {isRegenerating ? 'Generating...' : 'Generate New Codes'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Security Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm">
            <h4 className="font-medium text-yellow-800">Important Security Notes</h4>
            <ul className="text-yellow-700 mt-1 space-y-1 text-xs">
              <li>• Each backup code can only be used once</li>
              <li>• Store these codes securely offline (not in cloud storage)</li>
              <li>• Don't share these codes with anyone</li>
              <li>• Generate new codes if you suspect they've been compromised</li>
              <li>• Contact your administrator if you lose access to both your authenticator and backup codes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}