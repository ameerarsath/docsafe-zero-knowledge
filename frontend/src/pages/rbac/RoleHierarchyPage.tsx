/**
 * Role Hierarchy Page
 * 
 * Wrapper page for Role Hierarchy interface with consistent layout
 */

import React from 'react';
import { RequireAuth } from '../../components/auth/ProtectedRoute';
import { RoleBasedComponent } from '../../components/rbac/RoleBasedComponent';
import AppLayout from '../../components/layout/AppLayout';
import MobileResponsiveRoleManagement from '../../components/rbac/MobileResponsiveRoleManagement';

export default function RoleHierarchyPage() {
  return (
    <RequireAuth>
      <RoleBasedComponent requiredPermission="roles:read">
        <AppLayout>
          <MobileResponsiveRoleManagement 
            initialView="hierarchy"
            showNavigation={false}
          />
        </AppLayout>
      </RoleBasedComponent>
    </RequireAuth>
  );
}