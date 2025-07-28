/**
 * User Role Assignment Interface Component
 * 
 * Interface for managing user role assignments in the RBAC system.
 * Allows admins to assign/revoke roles for individual users or in bulk.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Plus,
  Trash,
  Check,
  X,
  Search,
  Users,
  Clock,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

import { rbacService } from '../../services/rbacService';
import { authService } from '../../services/authService';
import LoadingSpinner from '../ui/LoadingSpinner';

import type {
  Role,
  UserRole,
  UserRoleAssignment,
  UserRoleAssignmentState,
  UserRoleAssignmentProps,
  BulkRoleAssignment
} from '../../types/rbac';

interface UserWithRoles {
  id: number;
  username: string;
  email: string;
  account_locked: boolean;
  last_login: string | null;
  roles: UserRole[];
}

const UserRoleAssignmentInterface: React.FC<UserRoleAssignmentProps> = ({
  userId,
  showBulkOperations = true,
  onAssignmentChange
}) => {
  const [state, setState] = useState<UserRoleAssignmentState>({
    users: [] as UserWithRoles[],
    selectedUser: userId,
    availableRoles: [],
    isLoading: true,
    error: undefined,
    showAssignDialog: false,
    showBulkDialog: false,
    bulkSelection: []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [assignmentExpiry, setAssignmentExpiry] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [bulkRole, setBulkRole] = useState<string>('');
  const [bulkExpiry, setBulkExpiry] = useState<string>('');

  // Load users and their role assignments
  const loadUsers = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      // TODO: Since there's no user management API endpoint yet, use mock data
      // In production, this would call a proper user management API
      const mockUsers: UserWithRoles[] = [
        {
          id: 1,
          username: 'arahuman',
          email: 'arahuman@securevault.local',
          account_locked: false,
          last_login: new Date().toISOString(),
          roles: []
        },
        {
          id: 2,
          username: 'mfah',
          email: 'mfah@securevault.local',
          account_locked: false,
          last_login: null,
          roles: []
        },
        {
          id: 3,
          username: 'zr',
          email: 'zr@securevault.local',
          account_locked: false,
          last_login: null,
          roles: []
        },
        {
          id: 4,
          username: 'mfaiz',
          email: 'mfaiz@securevault.local',
          account_locked: false,
          last_login: null,
          roles: []
        }
      ];

      // Load role assignments for each user
      const usersWithRoles = await Promise.all(
        mockUsers.map(async (user) => {
          try {
            const rolesResponse = await rbacService.getUserRoles(user.id);
            return {
              ...user,
              roles: rolesResponse.user_roles || []
            };
          } catch (error) {
            return { 
              ...user,
              roles: [] 
            };
          }
        })
      );

      setState(prev => ({
        ...prev,
        users: usersWithRoles,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load users',
        isLoading: false
      }));
    }
  }, []);

  // Load available roles
  const loadRoles = useCallback(async () => {
    try {
      const response = await rbacService.getRoles({ active_only: true });
      setState(prev => ({ ...prev, availableRoles: response.roles as Role[] }));
    } catch (error) {
      // Failed to load roles
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [loadUsers, loadRoles]);

  // Handle role assignment
  const handleAssignRole = async () => {
    if (!state.selectedUser || !selectedRole) return;

    try {
      const assignment: UserRoleAssignment = {
        user_id: state.selectedUser,
        role_id: selectedRole,
        is_primary: isPrimary,
        expires_at: assignmentExpiry || undefined
      };

      await rbacService.assignRoleToUser(state.selectedUser, assignment);
      
      setState(prev => ({ ...prev, showAssignDialog: false }));
      setSelectedRole(null);
      setAssignmentExpiry('');
      setIsPrimary(false);
      
      await loadUsers();
      onAssignmentChange?.();
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to assign role' }));
    }
  };

  // Handle role revocation
  const handleRevokeRole = async (userId: number, roleId: number) => {
    try {
      await rbacService.revokeRoleFromUser(userId, roleId);
      await loadUsers();
      onAssignmentChange?.();
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to revoke role' }));
    }
  };

  // Handle bulk role assignment
  const handleBulkAssign = async () => {
    if (state.bulkSelection.length === 0 || !bulkRole) return;

    try {
      const assignment: BulkRoleAssignment = {
        user_ids: state.bulkSelection,
        role_name: bulkRole,
        expires_at: bulkExpiry || undefined
      };

      const result = await rbacService.bulkAssignRoles(assignment);
      
      if (result.failed.length > 0) {
        setState(prev => ({
          ...prev,
          error: `Assigned to ${result.successful.length} users, failed for ${result.failed.length} users`
        }));
      }

      setState(prev => ({
        ...prev,
        showBulkDialog: false,
        bulkSelection: []
      }));
      setBulkRole('');
      setBulkExpiry('');
      
      await loadUsers();
      onAssignmentChange?.();
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to perform bulk assignment' }));
    }
  };

  // Filtering logic
  const filteredUsers = state.users.filter(user => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!(
        user.username.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search)
      )) {
        return false;
      }
    }

    // Role filter
    if (roleFilter) {
      if (!user.roles.some(role => role.role.name === roleFilter)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && user.account_locked) return false;
      if (statusFilter === 'inactive' && !user.account_locked) return false;
    }

    return true;
  });

  const openAssignDialog = (userId: number) => {
    setState(prev => ({
      ...prev,
      selectedUser: userId,
      showAssignDialog: true
    }));
  };

  const openBulkDialog = () => {
    setState(prev => ({ ...prev, showBulkDialog: true }));
  };

  const toggleBulkSelection = (userId: number) => {
    setState(prev => ({
      ...prev,
      bulkSelection: prev.bulkSelection.includes(userId)
        ? prev.bulkSelection.filter(id => id !== userId)
        : [...prev.bulkSelection, userId]
    }));
  };

  const selectAllVisible = () => {
    const visibleUserIds = filteredUsers.map(user => user.id);
    setState(prev => ({ ...prev, bulkSelection: visibleUserIds }));
  };

  const clearSelection = () => {
    setState(prev => ({ ...prev, bulkSelection: [] }));
  };

  const getRoleBadgeColor = (role: UserRole) => {
    if (!role.is_active) return 'bg-gray-100 text-gray-600';
    if (role.expires_at && new Date(role.expires_at) < new Date()) {
      return 'bg-red-100 text-red-600';
    }
    return rbacService.getRoleColor(role.role.hierarchy_level);
  };

  if (state.isLoading && state.users.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Role Assignment</h1>
          <p className="text-gray-600">Manage role assignments for users</p>
        </div>
        {showBulkOperations && (
          <div className="flex space-x-3">
            {state.bulkSelection.length > 0 && (
              <button
                onClick={openBulkDialog}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <Users className="w-4 h-4 mr-2" />
                Bulk Assign ({state.bulkSelection.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Alert */}
      {state.error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{state.error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="min-w-0 sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Roles</option>
              {state.availableRoles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="min-w-0 sm:w-32">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Bulk Selection Controls */}
        {showBulkOperations && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={selectAllVisible}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Select All Visible ({filteredUsers.length})
              </button>
              {state.bulkSelection.length > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Clear Selection
                </button>
              )}
            </div>
            {state.bulkSelection.length > 0 && (
              <span className="text-sm text-gray-600">
                {state.bulkSelection.length} users selected
              </span>
            )}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {showBulkOperations && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={state.bulkSelection.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllVisible();
                        } else {
                          clearSelection();
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  {showBulkOperations && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={state.bulkSelection.includes(user.id)}
                        onChange={() => toggleBulkSelection(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-sm text-gray-500">No roles assigned</span>
                      ) : (
                        user.roles.map((userRole) => (
                          <div
                            key={userRole.role_id}
                            className="group relative"
                          >
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(userRole)}`}>
                              {userRole.role.display_name}
                              {userRole.is_primary && (
                                <Check className="ml-1 h-3 w-3" />
                              )}
                              {!userRole.is_active && (
                                <X className="ml-1 h-3 w-3" />
                              )}
                              {userRole.expires_at && (
                                <Clock className="ml-1 h-3 w-3" />
                              )}
                              <button
                                onClick={() => handleRevokeRole(user.id, userRole.role_id)}
                                className="ml-1 h-3 w-3 text-current hover:text-red-600"
                                title="Revoke role"
                              >
                                <Trash className="h-3 w-3" />
                              </button>
                            </span>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap">
                              {userRole.is_primary && 'Primary role, '}
                              {!userRole.is_active && 'Inactive, '}
                              {userRole.expires_at && `Expires: ${new Date(userRole.expires_at).toLocaleDateString()}`}
                              {userRole.assigned_at && `Assigned: ${new Date(userRole.assigned_at).toLocaleDateString()}`}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      !user.account_locked 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {!user.account_locked ? 'Active' : 'Locked'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openAssignDialog(user.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Assign Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || roleFilter || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'No users available for role assignment.'}
            </p>
          </div>
        )}
      </div>

      {/* Assign Role Dialog */}
      {state.showAssignDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assign Role</h3>
                <button
                  onClick={() => setState(prev => ({ ...prev, showAssignDialog: false }))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Role</label>
                  <select
                    value={selectedRole || ''}
                    onChange={(e) => setSelectedRole(parseInt(e.target.value))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a role...</option>
                    {state.availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.display_name} (Level {role.hierarchy_level})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    id="is-primary"
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is-primary" className="ml-2 block text-sm text-gray-900">
                    Set as primary role
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expiry Date (Optional)
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="datetime-local"
                      value={assignmentExpiry}
                      onChange={(e) => setAssignmentExpiry(e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Calendar className="absolute right-3 top-2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setState(prev => ({ ...prev, showAssignDialog: false }))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignRole}
                  disabled={!selectedRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assignment Dialog */}
      {state.showBulkDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Bulk Role Assignment ({state.bulkSelection.length} users)
                </h3>
                <button
                  onClick={() => setState(prev => ({ ...prev, showBulkDialog: false }))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Role</label>
                  <select
                    value={bulkRole}
                    onChange={(e) => setBulkRole(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a role...</option>
                    {state.availableRoles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.display_name} (Level {role.hierarchy_level})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expiry Date (Optional)
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="datetime-local"
                      value={bulkExpiry}
                      onChange={(e) => setBulkExpiry(e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Calendar className="absolute right-3 top-2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded-md">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Bulk Assignment Warning
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        This will assign the selected role to {state.bulkSelection.length} users.
                        This action cannot be easily undone.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setState(prev => ({ ...prev, showBulkDialog: false }))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Assign to {state.bulkSelection.length} Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoleAssignmentInterface;