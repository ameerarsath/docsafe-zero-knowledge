/**
 * Role-Based User Management Component for SecureVault
 *
 * This component wraps the UserManagementInterface with comprehensive role-based access controls:
 * - Viewer/User: No access to user management
 * - Manager: Can view users and perform limited management actions
 * - Admin: Full user management except for super admin users
 * - Super_Admin: Complete access to all user management functions
 */

import React, { useState } from 'react';
import { Shield, Users, Lock, AlertTriangle, Eye, Settings } from 'lucide-react';
import UserManagementInterface from './UserManagementInterface';
import {
  RoleBasedComponent,
  usePermissions,
  AdminOnly,
  ManagerAndAbove,
  SystemAdminOnly,
  ProtectedSection
} from '../rbac/RoleBasedComponent';

interface RoleBasedUserManagementProps {
  onUserSelect?: (user: any) => void;
  onBulkOperation?: (operation: string, userIds: number[]) => void;
}

export const RoleBasedUserManagement: React.FC<RoleBasedUserManagementProps> = (props) => {
  const { userRoles, hierarchyLevel, hasPermission } = usePermissions();
  const [showAccessRequest, setShowAccessRequest] = useState(false);

  // Check if user has any management permissions
  const canAccessUserManagement = hasPermission('users:read') || hierarchyLevel >= 3;

  // Define role-specific capabilities
  const getRoleCapabilities = () => {
    if (hierarchyLevel >= 5) { // Super Admin
      return {
        canViewAllUsers: true,
        canCreateUsers: true,
        canEditAllUsers: true,
        canDeleteAllUsers: true,
        canManageSuperAdmins: true,
        canBulkOperations: true,
        canViewAuditLogs: true,
        canExportData: true,
        maxUsersDisplayed: 1000
      };
    } else if (hierarchyLevel >= 4) { // Admin
      return {
        canViewAllUsers: true,
        canCreateUsers: true,
        canEditAllUsers: true,
        canDeleteAllUsers: false, // Cannot delete other admins
        canManageSuperAdmins: false,
        canBulkOperations: true,
        canViewAuditLogs: true,
        canExportData: true,
        maxUsersDisplayed: 500
      };
    } else if (hierarchyLevel >= 3) { // Manager
      return {
        canViewAllUsers: true,
        canCreateUsers: false,
        canEditAllUsers: false, // Can only edit basic info
        canDeleteAllUsers: false,
        canManageSuperAdmins: false,
        canBulkOperations: false,
        canViewAuditLogs: false,
        canExportData: false,
        maxUsersDisplayed: 100
      };
    } else {
      return null; // No access
    }
  };

  const capabilities = getRoleCapabilities();

  // No access for User/Viewer roles
  if (!capabilities || !canAccessUserManagement) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <Lock className="mx-auto h-16 w-16 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access user management. This feature requires at least Manager-level access.
          </p>

          {/* Role Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600">
              <p>Your current role: <span className="font-medium">{userRoles.join(', ')}</span></p>
              <p>Hierarchy level: <span className="font-medium">{hierarchyLevel}</span></p>
              <p>Required level: <span className="font-medium">3 (Manager) or higher</span></p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowAccessRequest(true)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Request Access Upgrade
            </button>
            <p className="text-xs text-gray-500">
              Contact your system administrator to request user management permissions.
            </p>
          </div>

          {/* Access Request Modal */}
          {showAccessRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="text-center">
                  <Shield className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Management Access</h3>
                  <p className="text-gray-600 mb-4">
                    To access user management, you need Manager or Administrator privileges. Your request will be sent to the system administrators.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Important</p>
                        <p>User management access includes sensitive operations like creating, editing, and potentially deleting user accounts.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowAccessRequest(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement access request functionality
                        alert('Access request sent to administrators. You will be notified when processed.');
                        setShowAccessRequest(false);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Send Request
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role-based Access Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900">User Management Access</h4>
            <div className="mt-1 text-sm text-blue-700 space-y-1">
              <p>Role: {userRoles.join(', ')} (Level {hierarchyLevel})</p>

              {/* Capabilities List */}
              <div className="mt-2 space-y-1">
                {capabilities.canViewAllUsers && (
                  <div className="flex items-center space-x-2">
                    <Eye className="w-3 h-3" />
                    <span>View all users (up to {capabilities.maxUsersDisplayed})</span>
                  </div>
                )}

                {capabilities.canCreateUsers && (
                  <div className="flex items-center space-x-2">
                    <Users className="w-3 h-3" />
                    <span>Create new users</span>
                  </div>
                )}

                {capabilities.canEditAllUsers && (
                  <div className="flex items-center space-x-2">
                    <Settings className="w-3 h-3" />
                    <span>Edit user information</span>
                  </div>
                )}

                {capabilities.canBulkOperations && (
                  <div className="flex items-center space-x-2">
                    <Users className="w-3 h-3" />
                    <span>Bulk operations (activate, deactivate, etc.)</span>
                  </div>
                )}
              </div>

              {/* Limitations for non-super-admin roles */}
              {hierarchyLevel < 5 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Limitations: Cannot manage Super Administrator accounts
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manager View - Read-only with limited functionality */}
      {hierarchyLevel === 3 && (
        <ProtectedSection
          title="User Overview"
          description="View user information and basic statistics (Manager access)"
          requiredHierarchyLevel={3}
        >
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Manager View</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                You have read-only access to user information. Contact an Administrator for user modifications.
              </p>
            </div>

            {/* Simplified user list for managers */}
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                User management functionality is limited for Manager role. You can:
              </div>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-4">
                <li>View user profiles and status</li>
                <li>Search and filter users</li>
                <li>Export user lists (if permitted)</li>
                <li>View user activity summaries</li>
              </ul>
            </div>
          </div>
        </ProtectedSection>
      )}

      {/* Admin and Super Admin - Full Management Interface */}
      <AdminOnly>
        <ProtectedSection
          title="Full User Management"
          description="Complete user management capabilities (Administrator access)"
          requiredHierarchyLevel={4}
        >
          {/* Enhanced User Management Interface with role restrictions */}
          <div className="relative">
            <UserManagementInterface
              {...props}
              // Add role-based restrictions to the interface
              onUserSelect={(user) => {
                // Super admins can select any user, admins cannot select other super admins
                const userRole = (user as any).role || 'user';
                const userHierarchyLevel = userRole === 'super_admin' ? 5 : userRole === 'admin' ? 4 : 3;
                if (hierarchyLevel >= 5 || userHierarchyLevel < 5) {
                  props.onUserSelect?.(user);
                } else {
                  alert('You cannot manage Super Administrator accounts.');
                }
              }}
              onBulkOperation={(operation, userIds) => {
                if (capabilities.canBulkOperations) {
                  props.onBulkOperation?.(operation, userIds);
                } else {
                  alert('Bulk operations are not available for your role.');
                }
              }}
            />

            {/* Admin-specific warning overlay for Super Admin users */}
            {hierarchyLevel === 4 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Administrator Notice</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  You cannot modify Super Administrator accounts. These accounts are protected and require Super Administrator privileges to manage.
                </p>
              </div>
            )}
          </div>
        </ProtectedSection>
      </AdminOnly>

      {/* Super Admin Only - Advanced Management Features */}
      <SystemAdminOnly>
        <ProtectedSection
          title="Super Administrator Controls"
          description="Advanced user management features (Super Administrator access only)"
          requiredRole="super_admin"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">System Users</h4>
              <p className="text-sm text-gray-600 mb-3">Manage system administrator accounts</p>
              <button className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                Manage Admins
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Security Audit</h4>
              <p className="text-sm text-gray-600 mb-3">View detailed user security logs</p>
              <button className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700">
                View Audit
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">System Maintenance</h4>
              <p className="text-sm text-gray-600 mb-3">Cleanup and maintenance operations</p>
              <button className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700">
                Maintenance
              </button>
            </div>
          </div>
        </ProtectedSection>
      </SystemAdminOnly>
    </div>
  );
};

export default RoleBasedUserManagement;