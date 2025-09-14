/**
 * Role-Based UI Demo Component for SecureVault
 *
 * This component demonstrates all the role-based UI features and can be used
 * to test different user roles and permissions. It's useful for:
 * - Testing role-based visibility
 * - Demonstrating UI adaptations
 * - Training users on role capabilities
 * - Development and QA testing
 */

import React, { useState } from 'react';
import {
  Shield,
  Users,
  FileText,
  Upload,
  Download,
  Edit,
  Trash2,
  Eye,
  Settings,
  Key,
  Monitor,
  BarChart,
  AlertCircle,
  CheckCircle,
  Info,
  Crown,
  Star,
  Lock
} from 'lucide-react';
import {
  PermissionProvider,
  usePermissions,
  RoleBasedComponent,
  AdminOnly,
  ManagerAndAbove,
  UserAndAbove,
  SystemAdminOnly,
  RoleBasedContent,
  ProtectedSection
} from '../rbac/RoleBasedComponent';
import { DocumentActions, UserActions, SystemActions, BulkActions } from '../rbac/RoleBasedActionButtons';
import { RoleBasedNavigation } from '../navigation/RoleBasedNavigation';

// Mock user data for different roles
const MOCK_USERS = {
  viewer: {
    id: 1,
    username: 'viewer_user',
    email: 'viewer@example.com',
    role: 'viewer',
    hierarchyLevel: 1,
    permissions: ['documents:read']
  },
  user: {
    id: 2,
    username: 'regular_user',
    email: 'user@example.com',
    role: 'user',
    hierarchyLevel: 2,
    permissions: ['documents:read', 'documents:create']
  },
  manager: {
    id: 3,
    username: 'team_manager',
    email: 'manager@example.com',
    role: 'manager',
    hierarchyLevel: 3,
    permissions: ['documents:read', 'documents:create', 'documents:update', 'users:read']
  },
  admin: {
    id: 4,
    username: 'system_admin',
    email: 'admin@example.com',
    role: 'admin',
    hierarchyLevel: 4,
    permissions: ['documents:read', 'documents:create', 'documents:update', 'documents:delete', 'users:read', 'users:create', 'users:update', 'system:admin']
  },
  super_admin: {
    id: 5,
    username: 'super_admin',
    email: 'superadmin@example.com',
    role: 'super_admin',
    hierarchyLevel: 5,
    permissions: ['documents:read', 'documents:create', 'documents:update', 'documents:delete', 'users:read', 'users:create', 'users:update', 'users:delete', 'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'system:admin']
  }
};

// Demo content component
const DemoContent: React.FC = () => {
  const { userRoles, hierarchyLevel, hasPermission, userPermissions } = usePermissions();
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [currentDemo, setCurrentDemo] = useState<'overview' | 'navigation' | 'actions' | 'permissions'>('overview');

  // Mock data
  const mockDocuments = [
    { id: 1, name: 'Public Document.pdf', owner: 'System', isEncrypted: false },
    { id: 2, name: 'Team Report.docx', owner: 'Manager', isEncrypted: true },
    { id: 3, name: 'Confidential Data.xlsx', owner: 'Admin', isEncrypted: true },
  ];

  const mockUsers = [
    { id: 1, username: 'john_doe', hierarchyLevel: 2, isActive: true },
    { id: 2, username: 'jane_manager', hierarchyLevel: 3, isActive: true },
    { id: 3, username: 'admin_user', hierarchyLevel: 4, isActive: false },
  ];

  return (
    <div className="space-y-8">
      {/* Role Information Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Role-Based UI Demo</h1>
            <p className="text-blue-100">
              Demonstrating how the UI adapts to different user roles and permissions
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5" />
              <span className="text-lg font-semibold">{userRoles.join(', ')}</span>
            </div>
            <p className="text-blue-100">Hierarchy Level: {hierarchyLevel}</p>
          </div>
        </div>
      </div>

      {/* Current Permissions Display */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Current Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Role Information</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Roles: {userRoles.join(', ')}</p>
              <p>Level: {hierarchyLevel}/5</p>
              <p>Permissions: {userPermissions.length}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Capabilities</h4>
            <div className="space-y-1 text-sm">
              {hasPermission('documents:read') ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>View Documents</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <Lock className="w-4 h-4 mr-1" />
                  <span>View Documents</span>
                </div>
              )}

              {hasPermission('documents:create') ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>Upload Documents</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <Lock className="w-4 h-4 mr-1" />
                  <span>Upload Documents</span>
                </div>
              )}

              {hasPermission('users:read') ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>Manage Users</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <Lock className="w-4 h-4 mr-1" />
                  <span>Manage Users</span>
                </div>
              )}

              {hasPermission('system:admin') ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>System Administration</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <Lock className="w-4 h-4 mr-1" />
                  <span>System Administration</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Access Level</h4>
            <div className="space-y-2">
              {hierarchyLevel >= 5 && (
                <div className="flex items-center text-red-600">
                  <Crown className="w-4 h-4 mr-1" />
                  <span>Super Administrator</span>
                </div>
              )}
              {hierarchyLevel >= 4 && hierarchyLevel < 5 && (
                <div className="flex items-center text-purple-600">
                  <Star className="w-4 h-4 mr-1" />
                  <span>Administrator</span>
                </div>
              )}
              {hierarchyLevel >= 3 && hierarchyLevel < 4 && (
                <div className="flex items-center text-blue-600">
                  <Users className="w-4 h-4 mr-1" />
                  <span>Manager</span>
                </div>
              )}
              {hierarchyLevel >= 2 && hierarchyLevel < 3 && (
                <div className="flex items-center text-green-600">
                  <FileText className="w-4 h-4 mr-1" />
                  <span>User</span>
                </div>
              )}
              {hierarchyLevel < 2 && (
                <div className="flex items-center text-gray-600">
                  <Eye className="w-4 h-4 mr-1" />
                  <span>Viewer</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Demo Navigation */}
      <div className="flex space-x-4 border-b border-gray-200">
        {['overview', 'navigation', 'actions', 'permissions'].map((demo) => (
          <button
            key={demo}
            onClick={() => setCurrentDemo(demo as any)}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              currentDemo === demo
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {demo.charAt(0).toUpperCase() + demo.slice(1)}
          </button>
        ))}
      </div>

      {/* Demo Content */}
      {currentDemo === 'overview' && (
        <div className="space-y-6">
          {/* Role-Specific Welcome Messages */}
          <RoleBasedContent
            viewer={
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Viewer Dashboard</h3>
                <p className="text-gray-600 mb-4">
                  Welcome! As a Viewer, you can browse and view documents that have been shared with you.
                </p>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Eye className="w-4 h-4" />
                  <span>Read-only access</span>
                </div>
              </div>
            }
            user={
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User Dashboard</h3>
                <p className="text-gray-600 mb-4">
                  Welcome! You can view, create, and manage your own documents with secure encryption.
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Document Management</span>
                  </div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Upload & Encrypt</span>
                  </div>
                </div>
              </div>
            }
            manager={
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manager Dashboard</h3>
                <p className="text-gray-600 mb-4">
                  Welcome! You can manage your team's documents and view user activity reports.
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Team Management</span>
                  </div>
                  <div className="flex items-center space-x-1 text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Reports & Analytics</span>
                  </div>
                </div>
              </div>
            }
            admin={
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Administrator Dashboard</h3>
                <p className="text-gray-600 mb-4">
                  Welcome! You have full system administration capabilities including user management.
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1 text-purple-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>User Management</span>
                  </div>
                  <div className="flex items-center space-x-1 text-purple-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>System Administration</span>
                  </div>
                </div>
              </div>
            }
            superAdmin={
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Super Administrator Dashboard</h3>
                <p className="text-gray-600 mb-4">
                  Welcome! You have complete system control including security and maintenance operations.
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1 text-red-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Full System Control</span>
                  </div>
                  <div className="flex items-center space-x-1 text-red-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Security Administration</span>
                  </div>
                </div>
              </div>
            }
          />

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UserAndAbove>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Upload className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Document Upload</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Upload and encrypt documents securely with client-side encryption.
                </p>
                <div className="text-xs text-green-600">✓ Available for your role</div>
              </div>
            </UserAndAbove>

            <ManagerAndAbove>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Analytics & Reports</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Generate reports and analyze team document usage patterns.
                </p>
                <div className="text-xs text-blue-600">✓ Available for your role</div>
              </div>
            </ManagerAndAbove>

            <AdminOnly>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">User Management</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Create, manage, and configure user accounts and permissions.
                </p>
                <div className="text-xs text-purple-600">✓ Available for your role</div>
              </div>
            </AdminOnly>
          </div>
        </div>
      )}

      {currentDemo === 'navigation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigation Demo</h3>
            <p className="text-gray-600 mb-4">
              The navigation menu adapts to show only the features you have access to based on your role.
            </p>
            <div className="h-64 border border-gray-200 rounded overflow-hidden">
              <RoleBasedNavigation
                mode="sidebar"
                currentPath="/demo"
                onNavigate={(path) => console.log('Navigate to:', path)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-3">Visible Navigation Items</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Dashboard - Always visible</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Documents - Always visible</span>
                </div>

                <UserAndAbove fallback={
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Lock className="w-4 h-4" />
                    <span>Upload - Requires User level</span>
                  </div>
                }>
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Upload - Available</span>
                  </div>
                </UserAndAbove>

                <ManagerAndAbove fallback={
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Lock className="w-4 h-4" />
                    <span>Reports - Requires Manager level</span>
                  </div>
                }>
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Reports - Available</span>
                  </div>
                </ManagerAndAbove>

                <AdminOnly fallback={
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Lock className="w-4 h-4" />
                    <span>Admin Panel - Requires Admin level</span>
                  </div>
                }>
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Admin Panel - Available</span>
                  </div>
                </AdminOnly>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentDemo === 'actions' && (
        <div className="space-y-6">
          {/* Document Actions Demo */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Actions</h3>
            <p className="text-gray-600 mb-4">
              Action buttons appear based on your permissions for each document.
            </p>
            <div className="space-y-4">
              {mockDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">
                        Owner: {doc.owner} • {doc.isEncrypted ? 'Encrypted' : 'Not encrypted'}
                      </p>
                    </div>
                  </div>
                  <DocumentActions
                    documentId={doc.id}
                    isEncrypted={doc.isEncrypted}
                    onClick={() => console.log('Action clicked')}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* User Actions Demo */}
          <ManagerAndAbove>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management Actions</h3>
              <p className="text-gray-600 mb-4">
                User management actions are filtered based on hierarchy levels and permissions.
              </p>
              <div className="space-y-4">
                {mockUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">{user.username}</p>
                        <p className="text-sm text-gray-500">
                          Level {user.hierarchyLevel} • {user.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                    <UserActions
                      userId={user.id}
                      targetUserHierarchyLevel={user.hierarchyLevel}
                      isActive={user.isActive}
                      onClick={() => console.log('User action clicked')}
                    />
                  </div>
                ))}
              </div>
            </div>
          </ManagerAndAbove>

          {/* System Actions Demo */}
          <AdminOnly>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Administration Actions</h3>
              <p className="text-gray-600 mb-4">
                System actions require admin-level permissions and vary based on your exact role.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Monitor className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">System Monitoring</span>
                    </div>
                    <SystemActions
                      systemFunction="monitoring"
                      actions={['settings', 'logs']}
                      onClick={() => console.log('System action')}
                    />
                  </div>
                </div>

                <SystemAdminOnly>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Settings className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-red-700">Critical Operations</span>
                      </div>
                      <SystemActions
                        systemFunction="critical"
                        actions={['backup', 'restore', 'maintenance']}
                        criticalAction
                        onClick={() => console.log('Critical action')}
                      />
                    </div>
                  </div>
                </SystemAdminOnly>
              </div>
            </div>
          </AdminOnly>
        </div>
      )}

      {currentDemo === 'permissions' && (
        <div className="space-y-6">
          {/* Permission Matrix */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Permission Matrix</h3>
            <p className="text-gray-600 mb-4">
              This shows what permissions are available at different hierarchy levels.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permission
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Viewer (1)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User (2)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager (3)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin (4)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Super Admin (5)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[
                    'documents:read',
                    'documents:create',
                    'documents:update',
                    'documents:delete',
                    'users:read',
                    'users:create',
                    'users:update',
                    'users:delete',
                    'system:admin'
                  ].map((permission) => (
                    <tr key={permission}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{permission}</td>
                      {[1, 2, 3, 4, 5].map((level) => {
                        const hasPermissionAtLevel = (perm: string, lvl: number) => {
                          switch (perm) {
                            case 'documents:read': return lvl >= 1;
                            case 'documents:create': return lvl >= 2;
                            case 'documents:update': return lvl >= 2;
                            case 'documents:delete': return lvl >= 3;
                            case 'users:read': return lvl >= 3;
                            case 'users:create': return lvl >= 4;
                            case 'users:update': return lvl >= 4;
                            case 'users:delete': return lvl >= 5;
                            case 'system:admin': return lvl >= 4;
                            default: return false;
                          }
                        };

                        const hasAccess = hasPermissionAtLevel(permission, level);
                        const isCurrentLevel = hierarchyLevel === level;

                        return (
                          <td key={level} className="px-4 py-3 text-center">
                            <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                              hasAccess
                                ? isCurrentLevel
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              {hasAccess ? '✓' : '×'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span>Your current level</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-green-100 rounded-full"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-gray-100 rounded-full"></div>
                  <span>Not available</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions Demo */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Actions</h3>
            <p className="text-gray-600 mb-4">
              Bulk actions are also role-based. Select some items to see available bulk operations.
            </p>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Select Documents:</h4>
                <div className="space-y-2">
                  {mockDocuments.map((doc) => (
                    <label key={doc.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocuments([...selectedDocuments, doc.id]);
                          } else {
                            setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{doc.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <BulkActions
                selectedCount={selectedDocuments.length}
                context="documents"
                onAction={(action) => {
                  console.log('Bulk action:', action, selectedDocuments);
                  setSelectedDocuments([]);
                }}
              />
            </div>

            <ManagerAndAbove>
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Select Users:</h4>
                  <div className="space-y-2">
                    {mockUsers.map((user) => (
                      <label key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{user.username}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <BulkActions
                  selectedCount={selectedUsers.length}
                  context="users"
                  onAction={(action) => {
                    console.log('Bulk user action:', action, selectedUsers);
                    setSelectedUsers([]);
                  }}
                />
              </div>
            </ManagerAndAbove>
          </div>
        </div>
      )}
    </div>
  );
};

// Role switcher for testing
const RoleSwitcher: React.FC<{ onRoleChange: (role: keyof typeof MOCK_USERS) => void }> = ({ onRoleChange }) => {
  const [selectedRole, setSelectedRole] = useState<keyof typeof MOCK_USERS>('viewer');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Test Different Roles</h3>
          <p className="text-sm text-gray-600">Switch between roles to see how the UI adapts</p>
        </div>
        <select
          value={selectedRole}
          onChange={(e) => {
            const role = e.target.value as keyof typeof MOCK_USERS;
            setSelectedRole(role);
            onRoleChange(role);
          }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="viewer">Viewer (Level 1)</option>
          <option value="user">User (Level 2)</option>
          <option value="manager">Manager (Level 3)</option>
          <option value="admin">Administrator (Level 4)</option>
          <option value="super_admin">Super Administrator (Level 5)</option>
        </select>
      </div>
    </div>
  );
};

// Main demo component
export const RoleBasedUIDemo: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<keyof typeof MOCK_USERS>('viewer');

  // Mock authentication context for testing
  const mockAuthContext = {
    user: MOCK_USERS[currentRole],
    isAuthenticated: true,
    login: () => {},
    logout: () => {}
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <RoleSwitcher onRoleChange={setCurrentRole} />

        {/* Provide mock auth context */}
        <PermissionProvider>
          <DemoContent />
        </PermissionProvider>
      </div>
    </div>
  );
};

export default RoleBasedUIDemo;