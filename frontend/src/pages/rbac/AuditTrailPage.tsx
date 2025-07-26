/**
 * Audit Trail Page
 * 
 * Wrapper page for Permission Audit Trail interface with consistent layout
 */

import React from 'react';
import { RequireAuth } from '../../components/auth/ProtectedRoute';
import { RoleBasedComponent } from '../../components/rbac/RoleBasedComponent';
import AppLayout from '../../components/layout/AppLayout';
import PermissionAuditTrailViewer from '../../components/rbac/PermissionAuditTrailViewer';

export default function AuditTrailPage() {
  return (
    <RequireAuth>
      <RoleBasedComponent requiredHierarchyLevel={4}>
        <AppLayout>
          <div className="space-y-6">
            <PermissionAuditTrailViewer 
              maxEvents={100}
              compact={false}
              showExport={true}
            />
          </div>
        </AppLayout>
      </RoleBasedComponent>
    </RequireAuth>
  );
}