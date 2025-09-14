/**
 * Role-Based Demo Page
 *
 * This page demonstrates the role-based UI system and can be used to test
 * how different roles see different UI elements
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EnhancedAppLayout } from '../components/layout/EnhancedAppLayout';
import { RoleBasedUIDemo } from '../components/demo/RoleBasedUIDemo';

const RoleBasedDemoPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <EnhancedAppLayout
      title="Role-Based UI Demo"
      subtitle={`Testing role-based UI with user: ${user?.username} (${user?.role})`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Current User Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">User Details</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Username: {user?.username}</p>
                <p>Email: {user?.email}</p>
                <p>Role: {user?.role}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Status</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Active: {user?.is_active ? 'Yes' : 'No'}</p>
                <p>Verified: {user?.is_verified ? 'Yes' : 'No'}</p>
                <p>MFA: {user?.mfa_enabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Expected UI Behavior</h3>
              <div className="space-y-1 text-sm text-gray-600">
                {user?.role === 'viewer' && (
                  <>
                    <p>• View documents only</p>
                    <p>• No upload capabilities</p>
                    <p>• No admin sections</p>
                  </>
                )}
                {user?.role === 'user' && (
                  <>
                    <p>• View and upload documents</p>
                    <p>• Manage own files</p>
                    <p>• No admin sections</p>
                  </>
                )}
                {user?.role === 'manager' && (
                  <>
                    <p>• Full document access</p>
                    <p>• View team reports</p>
                    <p>• Basic user management</p>
                  </>
                )}
                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                  <>
                    <p>• Full system access</p>
                    <p>• User management</p>
                    <p>• Admin sections visible</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Test */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Navigation Visibility Test</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Issue:</strong> If you're seeing "User Management" or other admin sections in the sidebar
                  but your role is "User", this indicates the role-based filtering is not working correctly.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Expected behavior based on your role ({user?.role}):</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {user?.role === 'viewer' && (
                <>
                  <li>Should see: Dashboard, Documents</li>
                  <li>Should NOT see: Upload, Trash, User Management, Administration</li>
                </>
              )}
              {user?.role === 'user' && (
                <>
                  <li>Should see: Dashboard, Documents, Upload, Trash</li>
                  <li>Should NOT see: User Management, Administration sections</li>
                </>
              )}
              {user?.role === 'manager' && (
                <>
                  <li>Should see: Dashboard, Documents, Upload, Trash, Reports</li>
                  <li>Should see limited: User Management (read-only)</li>
                  <li>Should NOT see: Full Administration sections</li>
                </>
              )}
              {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <>
                  <li>Should see: All sections including full Administration</li>
                  <li>Should see: User Management, System Administration, Security Center</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Interactive Demo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interactive Role-Based Demo</h2>
          <p className="text-gray-600 mb-4">
            The demo below shows how components adapt to different roles.
            The role switcher in the demo is for testing purposes only.
          </p>

          {/* Note about current layout issue */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  <strong>Current Issue:</strong> The sidebar navigation is showing admin sections to non-admin users.
                  This needs to be fixed in the main AppLayout component by implementing proper role-based filtering.
                </p>
              </div>
            </div>
          </div>

          <RoleBasedUIDemo />
        </div>
      </div>
    </EnhancedAppLayout>
  );
};

export default RoleBasedDemoPage;