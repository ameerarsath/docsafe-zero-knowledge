/**
 * Admin Users Management Page Component for SecureVault
 * 
 * Comprehensive user management page providing:
 * - User list with search and filtering
 * - User creation and editing capabilities
 * - Bulk operations and user activity monitoring
 * - Role assignment and permission management
 */

import React, { useCallback } from 'react';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import { UserManagementInterface } from '../components/admin';
import { User } from '../components/admin';

export default function AdminUsersPage() {
  
  const handleUserSelect = useCallback((user: User) => {
    // User selected
    // Could navigate to user detail page or open modal
  }, []);

  const handleBulkOperation = useCallback((operation: string, userIds: number[]) => {
    // Bulk operation performed
    // Handle bulk operation completion
    // Could show notification or update UI
  }, []);

  return (
    <RequireAuth>
      <AppLayout>
        <div className="container mx-auto px-6 py-8">
          <UserManagementInterface 
            onUserSelect={handleUserSelect}
            onBulkOperation={handleBulkOperation}
          />
        </div>
      </AppLayout>
    </RequireAuth>
  );
}