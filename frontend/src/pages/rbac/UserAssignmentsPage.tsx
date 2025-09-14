/**
 * User Assignments Page
 * 
 * Wrapper page for User Role Assignment interface with consistent layout
 */

import React from 'react';
import { RequireAuth } from '../../components/auth/ProtectedRoute';
import { RoleBasedComponent } from '../../components/rbac/RoleBasedComponent';
import AppLayout from '../../components/layout/AppLayout';
import MobileResponsiveRoleManagement from '../../components/rbac/MobileResponsiveRoleManagement';

export default function UserAssignmentsPage() {
  return (
    <RequireAuth>
      <RoleBasedComponent anyPermissions={["users:admin", "users:update", "system:admin"]}>
        <AppLayout>
          <MobileResponsiveRoleManagement 
            initialView="assignments"
            showNavigation={false}
          />
        </AppLayout>
      </RoleBasedComponent>
    </RequireAuth>
  );
}