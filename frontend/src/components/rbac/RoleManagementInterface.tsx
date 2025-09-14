/**
 * Role Management Interface Component
 * 
 * Admin interface for managing roles in the RBAC system.
 * Provides CRUD operations for roles with proper permission checking.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash, 
  Eye,
  Copy,
  Download,
  Upload,
  SlidersHorizontal,
  Users,
  ShieldCheck,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

import { rbacService } from '../../services/rbacService';
import LoadingSpinner from '../ui/LoadingSpinner';

import type {
  Role,
  RoleWithStats,
  RoleCreate,
  RoleUpdate,
  RoleManagementState,
  RoleManagementProps,
  RoleFormData,
  RoleFormErrors,
  Permission
} from '../../types/rbac';

const RoleManagementInterface: React.FC<RoleManagementProps> = ({
  showStats = true,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  onRoleSelect
}) => {
  const [state, setState] = useState<RoleManagementState>({
    roles: [],
    selectedRole: undefined,
    isLoading: true,
    error: undefined,
    showCreateDialog: false,
    showEditDialog: false,
    showDeleteDialog: false,
    filters: {
      search: '',
      hierarchy_level: undefined,
      active_only: true
    },
    pagination: {
      page: 1,
      size: 10,
      total: 0,
      has_next: false
    }
  });

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    display_name: '',
    description: '',
    hierarchy_level: 1,
    permissions: []
  });
  const [formErrors, setFormErrors] = useState<RoleFormErrors>({});
  const [sortBy, setSortBy] = useState<'name' | 'hierarchy_level' | 'created_at'>('hierarchy_level');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');

  // Load roles data
  const loadRoles = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      const response = await rbacService.getRoles({
        page: state.pagination.page,
        size: state.pagination.size,
        include_stats: showStats,
        active_only: state.filters.active_only
      });

      setState(prev => ({
        ...prev,
        roles: response.roles,
        pagination: {
          page: response.page,
          size: response.size,
          total: response.total,
          has_next: response.has_next
        },
        isLoading: false
      }));
    } catch (error: any) {
      let errorMessage = 'Failed to load roles';
      
      // Handle specific error cases
      if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view roles.';
      } else if (error?.status === 404) {
        errorMessage = 'Roles endpoint not found. Please contact your administrator.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred while loading roles. Please try again later.';
      } else if (error?.message?.includes('Network Error') || error?.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
    }
  }, [state.pagination.page, state.pagination.size, state.filters.active_only, showStats]);

  // Load permissions for role creation/editing
  const loadPermissions = useCallback(async () => {
    try {
      const response = await rbacService.getPermissions({ size: 200 });
      setPermissions(response.permissions);
    } catch (error) {
      // Failed to load permissions
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    if (state.showCreateDialog || state.showEditDialog) {
      loadPermissions();
    }
  }, [state.showCreateDialog, state.showEditDialog, loadPermissions]);

  // Handle role creation
  const handleCreateRole = async () => {
    const validation = rbacService.validateRoleData(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    try {
      const roleData: RoleCreate = {
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description,
        hierarchy_level: formData.hierarchy_level,
        permissions: formData.permissions
      };

      await rbacService.createRole(roleData);
      setState(prev => ({ ...prev, showCreateDialog: false }));
      resetForm();
      loadRoles();
    } catch (error: any) {
      let errorMessage = 'Failed to create role';
      
      if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to create roles.';
      } else if (error?.status === 409 || error?.detail?.includes('already exists')) {
        setFormErrors({ name: 'Role name already exists. Please choose a different name.' });
        return;
      } else if (error?.status === 422) {
        errorMessage = 'Invalid role data. Please check all fields and try again.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred while creating role. Please try again later.';
      }
      
      setFormErrors({ name: errorMessage });
    }
  };

  // Handle role update
  const handleUpdateRole = async () => {
    if (!state.selectedRole) return;

    const validation = rbacService.validateRoleData(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    try {
      const updateData: RoleUpdate = {
        display_name: formData.display_name,
        description: formData.description,
        permissions: formData.permissions
      };

      await rbacService.updateRole(state.selectedRole.id, updateData);
      setState(prev => ({ ...prev, showEditDialog: false, selectedRole: undefined }));
      resetForm();
      loadRoles();
    } catch (error: any) {
      let errorMessage = 'Failed to update role';
      
      if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to update roles.';
      } else if (error?.status === 404) {
        errorMessage = 'Role not found. It may have been deleted by another user.';
      } else if (error?.status === 422) {
        errorMessage = 'Invalid role data. Please check all fields and try again.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred while updating role. Please try again later.';
      }
      
      setFormErrors({ name: errorMessage });
    }
  };

  // Handle role deletion
  const handleDeleteRole = async () => {
    if (!state.selectedRole) return;

    try {
      await rbacService.deleteRole(state.selectedRole.id);
      setState(prev => ({ ...prev, showDeleteDialog: false, selectedRole: undefined }));
      loadRoles();
    } catch (error: any) {
      let errorMessage = 'Failed to delete role';
      
      if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to delete roles.';
      } else if (error?.status === 404) {
        errorMessage = 'Role not found. It may have already been deleted.';
      } else if (error?.status === 409) {
        errorMessage = 'Cannot delete role. It may still be assigned to users.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred while deleting role. Please try again later.';
      }
      
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  };

  // Form management
  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      hierarchy_level: 1,
      permissions: []
    });
    setFormErrors({});
  };

  const openCreateDialog = () => {
    resetForm();
    setPermissionSearch('');
    setState(prev => ({ ...prev, showCreateDialog: true }));
  };

  const openEditDialog = async (role: Role) => {
    try {
      // Load role with permissions
      const roleWithPermissions = await rbacService.getRole(role.id);
      const existingPermissions = roleWithPermissions.permissions?.map(p => p.name) || [];
      
      setFormData({
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        hierarchy_level: role.hierarchy_level,
        permissions: existingPermissions
      });
      setState(prev => ({ ...prev, selectedRole: role, showEditDialog: true }));
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to load role permissions for editing' }));
    }
  };

  const openDeleteDialog = (role: Role) => {
    setState(prev => ({ ...prev, selectedRole: role, showDeleteDialog: true }));
  };

  const handleCloneRole = async (sourceRole: Role) => {
    try {
      // Load the source role with permissions
      const roleWithPermissions = await rbacService.getRole(sourceRole.id);
      const existingPermissions = roleWithPermissions.permissions?.map(p => p.name) || [];
      
      setFormData({
        name: `${sourceRole.name}_copy`,
        display_name: `${sourceRole.display_name} (Copy)`,
        description: `Copy of ${sourceRole.description}`,
        hierarchy_level: sourceRole.hierarchy_level,
        permissions: existingPermissions
      });
      setState(prev => ({ ...prev, showCreateDialog: true }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: 'Failed to clone role. Please try again.' }));
    }
  };

  // Handle role selection for bulk operations
  const handleRoleSelection = (roleId: number) => {
    setSelectedRoles(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(roleId)) {
        newSelection.delete(roleId);
      } else {
        newSelection.add(roleId);
      }
      return newSelection;
    });
  };

  // Handle bulk enable/disable
  const handleBulkToggleActive = async (makeActive: boolean) => {
    if (selectedRoles.size === 0) return;
    
    try {
      const roleIds = Array.from(selectedRoles);
      // Since there's no bulk API yet, we'll do individual updates
      await Promise.all(
        roleIds.map(async (roleId) => {
          const role = state.roles.find(r => r.id === roleId);
          if (role && role.is_active !== makeActive) {
            await rbacService.updateRole(roleId, { is_active: makeActive } as any);
          }
        })
      );
      
      setSelectedRoles(new Set());
      setState(prev => ({ ...prev, error: undefined }));
      loadRoles();
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to ${makeActive ? 'enable' : 'disable'} selected roles. Some may have been processed.` 
      }));
    }
  };

  // Handle export roles
  const handleExportRoles = () => {
    try {
      const exportData = state.roles.map(role => ({
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        hierarchy_level: role.hierarchy_level,
        is_active: role.is_active,
        is_system: role.is_system,
        created_at: role.created_at
      }));

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `roles_export_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to export roles data' }));
    }
  };

  // Filtering and sorting
  const filteredAndSortedRoles = state.roles
    .filter(role => {
      if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        return (
          role.name.toLowerCase().includes(search) ||
          role.display_name.toLowerCase().includes(search) ||
          role.description.toLowerCase().includes(search)
        );
      }
      return true;
    })
    .filter(role => {
      if (state.filters.hierarchy_level !== undefined) {
        return role.hierarchy_level === state.filters.hierarchy_level;
      }
      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'hierarchy_level':
          aValue = a.hierarchy_level;
          bValue = b.hierarchy_level;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const handleSort = (field: 'name' | 'hierarchy_level' | 'created_at') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'hierarchy_level' | 'created_at') => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  if (state.isLoading && state.roles.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">Loading roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600">Manage system roles and permissions</p>
          {selectedRoles.size > 0 && (
            <p className="text-sm text-blue-600 mt-1">
              {selectedRoles.size} role{selectedRoles.size !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* Bulk Actions */}
          {selectedRoles.size > 0 && (
            <div className="flex items-center space-x-2 mr-4">
              <button
                onClick={() => handleBulkToggleActive(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
              >
                Enable Selected
              </button>
              <button
                onClick={() => handleBulkToggleActive(false)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
              >
                Disable Selected
              </button>
              <button
                onClick={() => setSelectedRoles(new Set())}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          )}
          
          {/* Export Button */}
          <button
            onClick={handleExportRoles}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          
          {/* Create Role Button */}
          {allowCreate && (
            <button
              onClick={openCreateDialog}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </button>
          )}
        </div>
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

      {/* Filters and Search */}
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
                placeholder="Search roles..."
                value={state.filters.search}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  filters: { ...prev.filters, search: e.target.value }
                }))}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Hierarchy Level Filter */}
          <div className="min-w-0 sm:w-48">
            <select
              value={state.filters.hierarchy_level || ''}
              onChange={(e) => setState(prev => ({
                ...prev,
                filters: {
                  ...prev.filters,
                  hierarchy_level: e.target.value ? parseInt(e.target.value) : undefined
                }
              }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Levels</option>
              <option value="5">Super Admin (5)</option>
              <option value="4">Admin (4)</option>
              <option value="3">Manager (3)</option>
              <option value="2">User (2)</option>
              <option value="1">Viewer (1)</option>
            </select>
          </div>

          {/* Active Only Filter */}
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.filters.active_only}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  filters: { ...prev.filters, active_only: e.target.checked }
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Active only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedRoles.size === filteredAndSortedRoles.length && filteredAndSortedRoles.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles(new Set(filteredAndSortedRoles.map(r => r.id)));
                      } else {
                        setSelectedRoles(new Set());
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    Role Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Name
                </th>
                <th
                  onClick={() => handleSort('hierarchy_level')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    Level
                    {getSortIcon('hierarchy_level')}
                  </div>
                </th>
                {showStats && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permissions
                    </th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    Created
                    {getSortIcon('created_at')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedRoles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRoles.has(role.id)}
                      onChange={() => handleRoleSelection(role.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ShieldCheck className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {role.name}
                        </div>
                        {role.is_system && (
                          <div className="text-xs text-gray-500">System Role</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{role.display_name}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {role.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rbacService.getRoleColor(role.hierarchy_level)}`}>
                      {role.hierarchy_level}
                    </span>
                  </td>
                  {showStats && 'user_count' in role && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-400 mr-1" />
                          {(role as RoleWithStats).user_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <SlidersHorizontal className="h-4 w-4 text-gray-400 mr-1" />
                          {(role as RoleWithStats).permission_count}
                        </div>
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      role.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(role.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onRoleSelect?.(role)}
                        className="text-gray-400 hover:text-gray-600"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {allowCreate && (
                        <button
                          onClick={() => handleCloneRole(role)}
                          className="text-purple-400 hover:text-purple-600"
                          title="Clone Role"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                      {allowEdit && !role.is_system && (
                        <button
                          onClick={() => openEditDialog(role)}
                          className="text-blue-400 hover:text-blue-600"
                          title="Edit Role"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {allowDelete && !role.is_system && (
                        <button
                          onClick={() => openDeleteDialog(role)}
                          className="text-red-400 hover:text-red-600"
                          title="Delete Role"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedRoles.length === 0 && !state.isLoading && (
          <div className="text-center py-12">
            <ShieldCheck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {state.error ? 'Unable to load roles' : 'No roles found'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {state.error ? (
                'There was an error loading roles. Please try refreshing the page.'
              ) : state.filters.search || state.filters.hierarchy_level ? (
                'No roles match your current filters. Try adjusting your search or filters.'
              ) : (
                'No roles have been created yet. Get started by creating your first role.'
              )}
            </p>
            {!state.error && allowCreate && (
              <button
                onClick={openCreateDialog}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Role
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {state.pagination.total > state.pagination.size && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              disabled={state.pagination.page === 1}
              onClick={() => setState(prev => ({
                ...prev,
                pagination: { ...prev.pagination, page: prev.pagination.page - 1 }
              }))}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={!state.pagination.has_next}
              onClick={() => setState(prev => ({
                ...prev,
                pagination: { ...prev.pagination, page: prev.pagination.page + 1 }
              }))}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(state.pagination.page - 1) * state.pagination.size + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(state.pagination.page * state.pagination.size, state.pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{state.pagination.total}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  disabled={state.pagination.page === 1}
                  onClick={() => setState(prev => ({
                    ...prev,
                    pagination: { ...prev.pagination, page: prev.pagination.page - 1 }
                  }))}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={!state.pagination.has_next}
                  onClick={() => setState(prev => ({
                    ...prev,
                    pagination: { ...prev.pagination, page: prev.pagination.page + 1 }
                  }))}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Create Role Dialog */}
      {state.showCreateDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Role</h3>
                <button
                  onClick={() => setState(prev => ({ ...prev, showCreateDialog: false }))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., content_manager"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Content Manager"
                  />
                  {formErrors.display_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.display_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the role and its responsibilities"
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Hierarchy Level</label>
                  <select
                    value={formData.hierarchy_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, hierarchy_level: parseInt(e.target.value) }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>1 - Viewer</option>
                    <option value={2}>2 - User</option>
                    <option value={3}>3 - Manager</option>
                    <option value={4}>4 - Admin</option>
                    <option value={5}>5 - Super Admin</option>
                  </select>
                  {formErrors.hierarchy_level && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.hierarchy_level}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Permissions</label>
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {permissions.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <div className="text-sm">Loading permissions...</div>
                      </div>
                    ) : (
                      Object.entries(rbacService.groupPermissionsByResource(permissions)).map(([resourceType, resourcePermissions]) => (
                        <div key={resourceType} className="mb-4">
                          <h4 className="font-medium text-gray-900 capitalize mb-2">{resourceType}</h4>
                          <div className="space-y-1">
                            {resourcePermissions.map((permission) => (
                              <label key={permission.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(permission.name)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData(prev => ({
                                        ...prev,
                                        permissions: [...prev.permissions, permission.name]
                                      }));
                                    } else {
                                      setFormData(prev => ({
                                        ...prev,
                                        permissions: prev.permissions.filter(p => p !== permission.name)
                                      }));
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                  {rbacService.formatPermissionName(permission.name)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setState(prev => ({ ...prev, showCreateDialog: false }))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Dialog */}
      {state.showEditDialog && state.selectedRole && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Role: {state.selectedRole.display_name}
                </h3>
                <button
                  onClick={() => setState(prev => ({ ...prev, showEditDialog: false }))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    disabled
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Role name cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formErrors.display_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.display_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Hierarchy Level</label>
                  <input
                    type="text"
                    value={`${formData.hierarchy_level} - ${rbacService.getRoleDisplayName(state.selectedRole.name)}`}
                    disabled
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Hierarchy level cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Permissions</label>
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {permissions.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <div className="text-sm">Loading permissions...</div>
                      </div>
                    ) : (
                      Object.entries(rbacService.groupPermissionsByResource(permissions)).map(([resourceType, resourcePermissions]) => (
                        <div key={resourceType} className="mb-4">
                          <h4 className="font-medium text-gray-900 capitalize mb-2">{resourceType}</h4>
                          <div className="space-y-1">
                            {resourcePermissions.map((permission) => (
                              <label key={permission.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(permission.name)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData(prev => ({
                                        ...prev,
                                        permissions: [...prev.permissions, permission.name]
                                      }));
                                    } else {
                                      setFormData(prev => ({
                                        ...prev,
                                        permissions: prev.permissions.filter(p => p !== permission.name)
                                      }));
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                  {rbacService.formatPermissionName(permission.name)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setState(prev => ({ ...prev, showEditDialog: false }))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Role Dialog */}
      {state.showDeleteDialog && state.selectedRole && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Role</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the role "{state.selectedRole.display_name}"? 
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => setState(prev => ({ ...prev, showDeleteDialog: false }))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementInterface;