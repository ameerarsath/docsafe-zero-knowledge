/**
 * Permission Matrix Display Component
 * 
 * Visual display of the permission matrix showing which roles have which permissions.
 * Includes interactive features, filtering, and role hierarchy visualization.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Check,
  X,
  Eye,
  Filter,
  ArrowUpDown,
  Info,
  ShieldCheck,
  Box,
  FileText,
  Users,
  Settings,
  Folder,
  AlertTriangle
} from 'lucide-react';

import { rbacService } from '../../services/rbacService';
import LoadingSpinner from '../ui/LoadingSpinner';

import type {
  Role,
  Permission,
  PermissionMatrixState,
  PermissionMatrixProps,
  RESOURCE_TYPES
} from '../../types/rbac';

const PermissionMatrixDisplay: React.FC<PermissionMatrixProps> = ({
  interactive = true,
  showHierarchy = true,
  highlightRole,
  onPermissionClick,
  compact = false,
  mobileView = 'matrix'
}) => {
  const [state, setState] = useState<PermissionMatrixState>({
    roles: [],
    permissions: [],
    matrix: {},
    hierarchy: {},
    isLoading: true,
    error: undefined,
    filters: {
      resource_type: undefined,
      role_hierarchy: undefined
    }
  });

  const [viewMode, setViewMode] = useState<'matrix' | 'hierarchy' | 'summary'>('matrix');
  const [selectedPermission, setSelectedPermission] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(highlightRole || null);
  const [showOnlyGranted, setShowOnlyGranted] = useState(false);

  // Load permission matrix data
  const loadPermissionMatrix = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      const matrixData = await rbacService.getPermissionMatrix();
      
      setState(prev => ({
        ...prev,
        roles: matrixData.roles,
        permissions: matrixData.permissions,
        matrix: matrixData.matrix,
        hierarchy: matrixData.hierarchy,
        isLoading: false
      }));
    } catch (error: any) {
      let errorMessage = 'Failed to load permission matrix';
      
      if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view the permission matrix.';
      } else if (error?.status === 404) {
        errorMessage = 'Permission matrix API not found. Please contact your administrator.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred while loading permission matrix. Please try again later.';
      } else if (error?.message?.includes('Network Error')) {
        errorMessage = 'Network connection failed. Please check your connection and try again.';
      }
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
    }
  }, []);

  useEffect(() => {
    loadPermissionMatrix();
  }, [loadPermissionMatrix]);

  useEffect(() => {
    if (highlightRole) {
      setSelectedRole(highlightRole);
    }
  }, [highlightRole]);

  // Filter and sort data
  const filteredPermissions = state.permissions.filter(permission => {
    if (state.filters.resource_type && permission.resource_type !== state.filters.resource_type) {
      return false;
    }
    if (showOnlyGranted && selectedRole) {
      return state.matrix[selectedRole]?.includes(permission.name);
    }
    return true;
  });

  const filteredRoles = state.roles.filter(role => {
    if (state.filters.role_hierarchy !== undefined && role.hierarchy_level !== state.filters.role_hierarchy) {
      return false;
    }
    return true;
  }).sort((a, b) => b.hierarchy_level - a.hierarchy_level);

  // Group permissions by resource type
  const permissionsByResource = rbacService.groupPermissionsByResource(filteredPermissions);

  // Get unique resource types
  const resourceTypes = Array.from(new Set(state.permissions.map(p => p.resource_type)));

  // Permission checking helpers
  const hasPermission = (roleName: string, permissionName: string): boolean => {
    return state.matrix[roleName]?.includes(permissionName) || false;
  };

  const getPermissionStatus = (roleName: string, permissionName: string): 'granted' | 'inherited' | 'denied' => {
    if (state.matrix[roleName]?.includes(permissionName)) {
      return 'granted';
    }
    
    // Check if permission is inherited from hierarchy
    const roleLevel = state.hierarchy[roleName] || 0;
    for (const [otherRole, otherLevel] of Object.entries(state.hierarchy)) {
      if (otherLevel < roleLevel && state.matrix[otherRole]?.includes(permissionName)) {
        return 'inherited';
      }
    }
    
    return 'denied';
  };

  const getStatusIcon = (status: 'granted' | 'inherited' | 'denied') => {
    switch (status) {
      case 'granted':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'inherited':
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
      case 'denied':
        return <X className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusBadge = (status: 'granted' | 'inherited' | 'denied') => {
    const classes = {
      granted: 'bg-green-100 text-green-800',
      inherited: 'bg-blue-100 text-blue-800',
      denied: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${classes[status]}`}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </span>
    );
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'documents':
        return <FileText className="h-4 w-4" />;
      case 'users':
        return <Users className="h-4 w-4" />;
      case 'roles':
        return <ShieldCheck className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'folders':
        return <Folder className="h-4 w-4" />;
      default:
        return <Box className="h-4 w-4" />;
    }
  };

  const handlePermissionClick = (roleName: string, permissionName: string) => {
    if (interactive && onPermissionClick) {
      onPermissionClick(roleName, permissionName);
    }
  };

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">Loading permission matrix...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Permission Matrix</h3>
          <p className="text-red-700 mb-4">{state.error}</p>
          <button 
            onClick={loadPermissionMatrix}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permission Matrix</h1>
          <p className="text-gray-600">System-wide permission assignments by role</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === 'matrix' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Matrix View
          </button>
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === 'hierarchy' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hierarchy View
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === 'summary' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Summary View
          </button>
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

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Resource Type Filter */}
          <div className="min-w-0 sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
            <select
              value={state.filters.resource_type || ''}
              onChange={(e) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, resource_type: e.target.value || undefined }
              }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Resources</option>
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Role Hierarchy Filter */}
          <div className="min-w-0 sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Level</label>
            <select
              value={state.filters.role_hierarchy || ''}
              onChange={(e) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, role_hierarchy: e.target.value ? parseInt(e.target.value) : undefined }
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

          {/* Role Selection */}
          <div className="min-w-0 sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Highlight Role</label>
            <select
              value={selectedRole || ''}
              onChange={(e) => setSelectedRole(e.target.value || null)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No Selection</option>
              {filteredRoles.map((role) => (
                <option key={role.name} value={role.name}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Show Only Granted */}
          {selectedRole && (
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showOnlyGranted}
                  onChange={(e) => setShowOnlyGranted(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Only granted permissions</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Permission
                  </th>
                  {filteredRoles.map((role) => (
                    <th
                      key={role.name}
                      className={`px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24 ${
                        selectedRole === role.name ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="truncate max-w-20" title={role.display_name}>
                          {role.display_name}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-1 ${rbacService.getRoleColor(role.hierarchy_level)}`}>
                          {role.hierarchy_level}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(permissionsByResource).map(([resourceType, permissions]) => (
                  <React.Fragment key={resourceType}>
                    {/* Resource Type Header */}
                    <tr className="bg-gray-25">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-gray-25 z-10">
                        <div className="flex items-center">
                          {getResourceIcon(resourceType)}
                          <span className="ml-2 capitalize">{resourceType}</span>
                        </div>
                      </td>
                      {filteredRoles.map((role) => (
                        <td key={role.name} className="px-3 py-3"></td>
                      ))}
                    </tr>
                    
                    {/* Permission Rows */}
                    {permissions.map((permission) => (
                      <tr
                        key={permission.name}
                        className={`hover:bg-gray-50 ${
                          selectedPermission === permission.name ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 sticky left-0 bg-white z-10">
                          <div className="flex items-center">
                            <button
                              onClick={() => setSelectedPermission(
                                selectedPermission === permission.name ? null : permission.name
                              )}
                              className="text-blue-600 hover:text-blue-800 mr-2"
                              title="Show permission details"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                            <div>
                              <div className="font-medium">
                                {rbacService.formatPermissionName(permission.name)}
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-xs">
                                {permission.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {filteredRoles.map((role) => {
                          const status = getPermissionStatus(role.name, permission.name);
                          return (
                            <td
                              key={role.name}
                              className={`px-3 py-4 text-center ${
                                selectedRole === role.name ? 'bg-blue-50' : ''
                              }`}
                            >
                              <button
                                onClick={() => handlePermissionClick(role.name, permission.name)}
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 ${
                                  interactive ? 'cursor-pointer' : 'cursor-default'
                                }`}
                                disabled={!interactive}
                                title={`${role.display_name}: ${status} - ${permission.name}`}
                              >
                                {getStatusIcon(status)}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hierarchy View */}
      {viewMode === 'hierarchy' && showHierarchy && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Role Hierarchy & Inheritance</h3>
          <div className="space-y-4">
            {filteredRoles.map((role, index) => (
              <div
                key={role.name}
                className={`flex items-center p-4 border rounded-lg ${
                  selectedRole === role.name 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${rbacService.getRoleColor(role.hierarchy_level)}`}>
                    {role.hierarchy_level}
                  </span>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center">
                    <h4 className="text-lg font-medium text-gray-900">{role.display_name}</h4>
                    {role.is_system && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <span>Direct permissions: {state.matrix[role.name]?.length || 0}</span>
                    {index < filteredRoles.length - 1 && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Inherits from roles below</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRole(selectedRole === role.name ? null : role.name)}
                  className="ml-4 text-blue-600 hover:text-blue-800"
                >
                  <Eye className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary View */}
      {viewMode === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Role Summary Cards */}
          {filteredRoles.map((role) => (
            <div
              key={role.name}
              className={`bg-white shadow rounded-lg p-6 ${
                selectedRole === role.name ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${rbacService.getRoleColor(role.hierarchy_level)}`}>
                    {role.hierarchy_level}
                  </span>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">{role.display_name}</h3>
                    <p className="text-sm text-gray-500">{role.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRole(selectedRole === role.name ? null : role.name)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Eye className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600 line-clamp-2">{role.description}</p>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Direct Permissions</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {state.matrix[role.name]?.length || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Resource Types</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {new Set(
                      state.matrix[role.name]?.map(perm => 
                        state.permissions.find(p => p.name === perm)?.resource_type
                      ).filter(Boolean)
                    ).size || 0}
                  </dd>
                </div>
              </div>
              
              {selectedRole === role.name && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Permissions by Resource</h4>
                  <div className="space-y-2">
                    {Object.entries(
                      rbacService.groupPermissionsByResource(
                        state.permissions.filter(p => state.matrix[role.name]?.includes(p.name))
                      )
                    ).map(([resourceType, permissions]) => (
                      <div key={resourceType} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          {getResourceIcon(resourceType)}
                          <span className="ml-2 capitalize">{resourceType}</span>
                        </div>
                        <span className="text-gray-500">{permissions.length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Permission Details Panel */}
      {selectedPermission && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Permission Details</h3>
                <button
                  onClick={() => setSelectedPermission(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {(() => {
                const permission = state.permissions.find(p => p.name === selectedPermission);
                if (!permission) return null;
                
                return (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      {getResourceIcon(permission.resource_type)}
                      <div className="ml-3">
                        <h4 className="text-xl font-semibold text-gray-900">
                          {rbacService.formatPermissionName(permission.name)}
                        </h4>
                        <p className="text-sm text-gray-500">{permission.name}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700">Description</h5>
                      <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700">Resource Type</h5>
                        <p className="text-sm text-gray-600 mt-1 capitalize">{permission.resource_type}</p>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700">Action</h5>
                        <p className="text-sm text-gray-600 mt-1 capitalize">{permission.action}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Role Assignments</h5>
                      <div className="space-y-2">
                        {filteredRoles.map((role) => {
                          const status = getPermissionStatus(role.name, permission.name);
                          return (
                            <div key={role.name} className="flex items-center justify-between py-2">
                              <div className="flex items-center">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${rbacService.getRoleColor(role.hierarchy_level)}`}>
                                  {role.hierarchy_level}
                                </span>
                                <span className="ml-3 text-sm text-gray-900">{role.display_name}</span>
                              </div>
                              {getStatusBadge(status)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Legend</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <Check className="h-4 w-4 text-green-600 mr-2" />
            <span>Directly granted permission</span>
          </div>
          <div className="flex items-center">
            <ArrowUpDown className="h-4 w-4 text-blue-600 mr-2" />
            <span>Inherited from hierarchy</span>
          </div>
          <div className="flex items-center">
            <X className="h-4 w-4 text-red-400 mr-2" />
            <span>Permission denied</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionMatrixDisplay;