/**
 * Permission Matrix Page
 * 
 * Wrapper page for Permission Matrix interface with consistent layout
 */

import React from 'react';
import { RequireAuth } from '../../components/auth/ProtectedRoute';
import { RoleBasedComponent } from '../../components/rbac/RoleBasedComponent';
import AppLayout from '../../components/layout/AppLayout';
import PermissionMatrixDisplay from '../../components/rbac/PermissionMatrixDisplay';

import { useAuth } from '../../contexts/AuthContext';

export default function PermissionMatrixPage() {
  const { user } = useAuth();
  
  return (
    <RequireAuth>
      <RoleBasedComponent requiredHierarchyLevel={4}>
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