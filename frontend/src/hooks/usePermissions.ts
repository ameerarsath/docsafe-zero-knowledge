/**
 * Permissions Hook
 * 
 * Provides permission checking functionality for the frontend
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

interface PermissionsHook {
  permissions: string[];
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAdmin: () => boolean;
  canAccessAdmin: () => boolean;
  refresh: () => Promise<void>;
}

export const usePermissions = (): PermissionsHook => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async () => {
    if (!isAuthenticated || !user) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Try to get current user permissions from RBAC API
      const response = await apiClient.get<string[]>('/api/v1/rbac/users/me/permissions');
      setPermissions(response.data || []);
    } catch (error) {
      console.warn('Failed to fetch user permissions, using fallback:', error);
      
      // Fallback: determine permissions based on user role
      const rolePermissions = getFallbackPermissions(user.role);
      setPermissions(rolePermissions);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackPermissions = (userRole?: string): string[] => {
    // Fallback permission mapping based on role
    const rolePermissionMap: Record<string, string[]> = {
      'super_admin': [
        'documents:create', 'documents:read', 'documents:update', 'documents:delete', 'documents:share',
        'folders:create', 'folders:read', 'folders:update', 'folders:delete',
        'users:create', 'users:read', 'users:update', 'users:delete',
        'roles:create', 'roles:read', 'roles:update', 'roles:delete', 'roles:assign',
        'system:admin', 'system:audit', 'system:security',
        'mfa:manage', 'mfa:bypass',
        'encryption:manage', 'encryption:keys'
      ],
      'admin': [
        'documents:create', 'documents:read', 'documents:update', 'documents:delete', 'documents:share',
        'folders:create', 'folders:read', 'folders:update', 'folders:delete',
        'users:create', 'users:read', 'users:update', 'users:delete',
        'roles:read', 'roles:assign',
        'system:audit', 'system:security',
        'mfa:manage',
        'encryption:manage'
      ],
      'manager': [
        'documents:create', 'documents:read', 'documents:update', 'documents:delete', 'documents:share',
        'folders:create', 'folders:read', 'folders:update', 'folders:delete',
        'users:read', 'users:update',
        'roles:read',
        'mfa:manage'
      ],
      'user': [
        'documents:create', 'documents:read', 'documents:update', 'documents:delete', 'documents:share',
        'folders:create', 'folders:read', 'folders:update', 'folders:delete'
      ],
      'viewer': [
        'documents:read',
        'folders:read'
      ]
    };

    // Also check numeric role values (legacy support)
    const numericRoleMap: Record<string, string> = {
      '5': 'super_admin',
      '4': 'admin', 
      '3': 'manager',
      '2': 'user',
      '1': 'viewer'
    };

    const roleKey = numericRoleMap[userRole || ''] || userRole || 'viewer';
    return rolePermissionMap[roleKey] || rolePermissionMap['viewer'];
  };

  // Fetch permissions when authentication state changes
  useEffect(() => {
    fetchPermissions();
  }, [isAuthenticated, user?.id, user?.role]);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some(perm => permissions.includes(perm));
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every(perm => permissions.includes(perm));
  };

  const isAdmin = (): boolean => {
    return hasAnyPermission(['system:admin', 'users:read', 'roles:read']) || 
           ['super_admin', 'admin', '5', '4'].includes(user?.role || '');
  };

  const canAccessAdmin = (): boolean => {
    // Only allow admin access for Manager level and above
    const isManagerOrAbove = ['super_admin', 'admin', 'manager', '5', '4', '3'].includes(user?.role || '');
    return isManagerOrAbove && (isAdmin() || hasAnyPermission(['users:read', 'roles:read', 'system:audit']));
  };

  const refresh = async (): Promise<void> => {
    await fetchPermissions();
  };

  return {
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    canAccessAdmin,
    refresh
  };
};

export default usePermissions;