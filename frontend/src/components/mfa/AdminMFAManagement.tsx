/**
 * Admin MFA Management Interface
 * 
 * Administrative interface for managing MFA across all users:
 * - View system-wide MFA statistics
 * - Reset MFA for users
 * - View user MFA status
 * - Monitor MFA health and service status
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mfaService } from '../../services/mfaService';
import { authService } from '../../services/authService';
import { MFAStatsResponse, MFAHealthResponse, MFAResetRequest } from '../../types/mfa';
import { User } from '../../types/auth';
import { MFAStatusBadge } from './MFAStatusIndicator';

interface AdminMFAManagementProps {
  className?: string;
}

export default function AdminMFAManagement({ className = '' }: AdminMFAManagementProps) {
  const { user, hasRole } = useAuth();
  
  const [stats, setStats] = useState<MFAStatsResponse | null>(null);
  const [health, setHealth] = useState<MFAHealthResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<{
    user: User | null;
    reason: string;
    isSubmitting: boolean;
  }>({
    user: null,
    reason: '',
    isSubmitting: false
  });

  // Check admin permissions
  if (!user || !hasRole('admin')) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            Administrator privileges required to access MFA management.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsResponse, healthResponse, usersResponse] = await Promise.all([
        mfaService.getMFAStats(),
        mfaService.checkMFAHealth(),
        authService.getUsers(1, 100) // Get first 100 users
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (healthResponse.success && healthResponse.data) {
        setHealth(healthResponse.data);
      }

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data.users);
      }

      // If any request failed, show the first error
      if (!statsResponse.success) {
        setError(statsResponse.error?.detail || 'Failed to load MFA statistics');
      } else if (!healthResponse.success) {
        setError(healthResponse.error?.detail || 'Failed to load MFA health status');
      } else if (!usersResponse.success) {
        setError(usersResponse.error?.detail || 'Failed to load users');
      }

    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetMFA = (targetUser: User) => {
    setResetModal({
      user: targetUser,
      reason: '',
      isSubmitting: false
    });
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetModal.user || !resetModal.reason.trim()) {
      return;
    }

    setResetModal(prev => ({ ...prev, isSubmitting: true }));

    try {
      const response = await mfaService.resetUserMFA({
        user_id: resetModal.user!.id,
        reason: resetModal.reason.trim()
      });

      if (response.success) {
        // Close modal and refresh data
        setResetModal({ user: null, reason: '', isSubmitting: false });
        await loadData();
      } else {
        setError(response.error?.detail || 'Failed to reset MFA');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setResetModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleResetCancel = () => {
    setResetModal({ user: null, reason: '', isSubmitting: false });
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading MFA management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Page Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">MFA Administration</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage multi-factor authentication across all users
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-4">
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

        {/* Quick Actions */}
        <div className="px-6 py-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={loadData}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* MFA Statistics */}
      {stats && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">System Statistics</h2>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.total_users}</div>
                <div className="text-sm text-gray-500">Total Users</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.mfa_enabled_users}</div>
                <div className="text-sm text-gray-500">MFA Enabled</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {Math.round(stats.mfa_enabled_percentage)}%
                </div>
                <div className="text-sm text-gray-500">Adoption Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{stats.recent_mfa_setups}</div>
                <div className="text-sm text-gray-500">Recent Setups (30d)</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>MFA Adoption Progress</span>
                <span>{Math.round(stats.mfa_enabled_percentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(stats.mfa_enabled_percentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Warnings */}
            {stats.backup_codes_exhausted > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <h4 className="font-medium text-yellow-800">Attention Required</h4>
                    <p className="text-yellow-700 mt-1">
                      {stats.backup_codes_exhausted} users have exhausted their backup codes and may need assistance.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Service Health */}
      {health && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Service Health</h2>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* TOTP Service */}
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  health.totp_service_available ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm">TOTP Service</span>
              </div>

              {/* QR Code Service */}
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  health.qr_code_service_available ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm">QR Code Service</span>
              </div>

              {/* Backup Codes Service */}
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  health.backup_codes_service_available ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm">Backup Codes</span>
              </div>

              {/* Database */}
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  health.database_connection ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm">Database</span>
              </div>

              {/* Rate Limiting */}
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  health.rate_limiting_active ? 'bg-green-400' : 'bg-yellow-400'
                }`}></div>
                <span className="text-sm">Rate Limiting</span>
              </div>
            </div>

            {/* Errors and Warnings */}
            {health.errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Service Errors</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {health.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {health.warnings.length > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Service Warnings</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {health.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Management */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">User MFA Status</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage MFA settings for individual users
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MFA Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((targetUser) => (
                <tr key={targetUser.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {targetUser.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {targetUser.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {targetUser.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {authService.getRoleName(targetUser.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <MFAStatusBadge />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {targetUser.last_login 
                      ? new Date(targetUser.last_login).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleResetMFA(targetUser)}
                      className="text-red-600 hover:text-red-900 mr-3"
                    >
                      Reset MFA
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">Try refreshing the page</p>
          </div>
        )}
      </div>

      {/* MFA Reset Modal */}
      {resetModal.user && (
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
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <h3 className="text-lg font-semibold leading-6 text-gray-900">
                      Reset MFA for {resetModal.user.email}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        This will disable MFA for the user and remove all their backup codes. 
                        This action cannot be undone.
                      </p>
                    </div>
                    
                    <form onSubmit={handleResetSubmit} className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="reset-reason" className="block text-sm font-medium text-gray-700">
                          Reason for reset (required)
                        </label>
                        <textarea
                          id="reset-reason"
                          value={resetModal.reason}
                          onChange={(e) => setResetModal(prev => ({ ...prev, reason: e.target.value }))}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                          placeholder="Explain why MFA is being reset..."
                          rows={3}
                          disabled={resetModal.isSubmitting}
                          required
                          minLength={10}
                          maxLength={500}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          This will be logged for audit purposes (10-500 characters)
                        </p>
                      </div>
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={resetModal.isSubmitting || resetModal.reason.trim().length < 10}
                        >
                          {resetModal.isSubmitting ? 'Resetting...' : 'Reset MFA'}
                        </button>
                        <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                          onClick={handleResetCancel}
                          disabled={resetModal.isSubmitting}
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
    </div>
  );
}