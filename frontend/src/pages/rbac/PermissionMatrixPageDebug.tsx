/**
 * Debug Version of Permission Matrix Page
 *
 * This version includes comprehensive error logging and fallback displays
 */

import React, { useState, useEffect } from 'react';
import { RequireAuth } from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { rbacService } from '../../services/rbacService';
import AppLayout from '../../components/layout/AppLayout';

export default function PermissionMatrixPageDebug() {
  const { user, isAuthenticated } = useAuth();
  const [debugInfo, setDebugInfo] = useState({
    authStatus: '',
    userInfo: null,
    hierarchyCheck: '',
    permissionsCheck: '',
    apiTest: '',
    error: null
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        // Check 1: Authentication Status
        setDebugInfo(prev => ({
          ...prev,
          authStatus: isAuthenticated ? 'AUTHENTICATED' : 'NOT AUTHENTICATED',
          userInfo: user
        }));

        if (!isAuthenticated || !user) {
          return;
        }

        // Check 2: Hierarchy Level (simulate RoleBasedComponent check)
        let hierarchyResult = 'CHECKING...';
        if (user.role) {
          try {
            const roles = await rbacService.listRoles({ include_stats: false });
            const userRole = roles.roles.find(r => r.name === user.role);
            const userHierarchy = userRole?.hierarchy_level || 0;
            hierarchyResult = `User role: ${user.role}, hierarchy: ${userHierarchy}, required: 4, access: ${userHierarchy >= 4 ? 'GRANTED' : 'DENIED'}`;
          } catch (err) {
            hierarchyResult = `ERROR: ${err.message}`;
          }
        }

        setDebugInfo(prev => ({ ...prev, hierarchyCheck: hierarchyResult }));

        // Check 3: User Permissions
        let permissionsResult = 'CHECKING...';
        try {
          const permissions = await rbacService.getUserPermissions(user.id);
          const hasSystemRead = permissions.includes('system:read');
          permissionsResult = `Has system:read: ${hasSystemRead}, total permissions: ${permissions.length}`;
        } catch (err) {
          permissionsResult = `ERROR: ${err.message}`;
        }

        setDebugInfo(prev => ({ ...prev, permissionsCheck: permissionsResult }));

        // Check 4: API Test
        let apiResult = 'TESTING...';
        try {
          const matrix = await rbacService.getPermissionMatrix();
          apiResult = `SUCCESS: ${matrix.roles.length} roles, ${matrix.permissions.length} permissions`;
        } catch (err) {
          apiResult = `ERROR: ${err.message}`;
        }

        setDebugInfo(prev => ({ ...prev, apiTest: apiResult }));

      } catch (error) {
        setDebugInfo(prev => ({
          ...prev,
          error: error.message || 'Unknown error'
        }));
      }
    };

    runDiagnostics();
  }, [isAuthenticated, user]);

  const renderDebugPage = () => (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Permission Matrix - Debug Mode
          </h1>

          <div className="space-y-4">
            {/* Authentication Status */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                1. Authentication Status
              </h3>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                <div>Status: <span className={debugInfo.authStatus === 'AUTHENTICATED' ? 'text-green-600' : 'text-red-600'}>{debugInfo.authStatus}</span></div>
                <div>User: {JSON.stringify(debugInfo.userInfo, null, 2)}</div>
              </div>
            </div>

            {/* Hierarchy Check */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                2. Hierarchy Level Check
              </h3>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                {debugInfo.hierarchyCheck || 'Waiting...'}
              </div>
            </div>

            {/* Permissions Check */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                3. Permissions Check
              </h3>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                {debugInfo.permissionsCheck || 'Waiting...'}
              </div>
            </div>

            {/* API Test */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                4. API Connection Test
              </h3>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                {debugInfo.apiTest || 'Waiting...'}
              </div>
            </div>

            {/* Error Display */}
            {debugInfo.error && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h3 className="text-lg font-medium text-red-900 mb-2">
                  Error Details
                </h3>
                <div className="bg-red-100 p-3 rounded text-sm font-mono text-red-800">
                  {debugInfo.error}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Debugging Instructions
              </h3>
              <div className="text-sm text-blue-800 space-y-2">
                <p>1. All checks above should show SUCCESS or GRANTED status</p>
                <p>2. If authentication fails, try logging out and back in</p>
                <p>3. If hierarchy check fails, the user role may not have sufficient permissions</p>
                <p>4. If API test fails, there may be a backend connectivity issue</p>
                <p>5. Check the browser console (F12) for additional JavaScript errors</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <RequireAuth fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access the permission matrix.</p>
          </div>
        </div>
      </div>
    }>
      {renderDebugPage()}
    </RequireAuth>
  );
}