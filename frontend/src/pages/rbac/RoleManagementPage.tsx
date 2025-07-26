/**
 * Role Management Page
 * 
 * Wrapper page for Role Management interface with consistent layout
 */

import React from 'react';
import { RequireAuth } from '../../components/auth/ProtectedRoute';
import { RoleBasedComponent } from '../../components/rbac/RoleBasedComponent';
import AppLayout from '../../components/layout/AppLayout';
import MobileResponsiveRoleManagement from '../../components/rbac/MobileResponsiveRoleManagement';

export default function RoleManagementPage() {
  return (
    <RequireAuth>
      <RoleBasedComponent requiredPermission="roles:read">
        <AppLayout>
          <MobileResponsiveRoleManagement 
            initialView="roles"
            showNavigation={false}
          />
        </AppLayout>
      </RoleBasedComponent>
    </RequireAuth>
  );
}