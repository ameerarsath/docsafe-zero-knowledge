/**
 * Permission Matrix Page - Fixed Version
 *
 * Uses permission-based access control instead of hierarchy levels
 */

import React from 'react';
import { RequireAuth } from '../../components/auth/ProtectedRoute';
import { RoleBasedComponent } from '../../components/rbac/RoleBasedComponent';
import AppLayout from '../../components/layout/AppLayout';
import PermissionMatrixDisplay from '../../components/rbac/PermissionMatrixDisplay';
import { useAuth } from '../../contexts/AuthContext';

export default function PermissionMatrixPageFixed() {
  const { user } = useAuth();

  return (
    <RequireAuth>
      <RoleBasedComponent
        requiredPermission="system:read"
        fallback={
          <AppLayout>
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Access Denied
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        You need the "system:read" permission to access the permission matrix.
                      </p>
                      <p className="mt-1">
                        Current user: {user?.username || 'Unknown'} ({user?.role || 'Unknown'})
                      </p>
                      <p className="mt-2">
                        Please contact your administrator to request access.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AppLayout>
        }
      >
        <AppLayout>
          <div className="space-y-6">
            <PermissionMatrixDisplay
              interactive={true}
              showHierarchy={true}
              compact={false}
            />
          </div>
        </AppLayout>
      </RoleBasedComponent>
    </RequireAuth>
  );
}