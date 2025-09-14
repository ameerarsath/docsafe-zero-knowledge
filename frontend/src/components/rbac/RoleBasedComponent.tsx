/**
 * Role-Based Component Wrapper
 * 
 * Higher-order component and hooks for controlling UI element visibility
 * based on user roles and permissions in the RBAC system.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { rbacService } from '../../services/rbacService';

// Types for role-based visibility
interface RoleBasedVisibilityProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  requiredHierarchyLevel?: number;
  anyPermissions?: string[];
  anyRoles?: string[];
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  inverse?: boolean; // Show when permission is NOT granted
}

interface PermissionContextType {
  userPermissions: string[];
  userRoles: string[];
  hierarchyLevel: number;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasHierarchyLevel: (level: number) => boolean;
  isLoading: boolean;
  error?: string;
}

// Permission Context
const PermissionContext = createContext<PermissionContextType | null>(null);

// Fallback helper functions for when RBAC API is not available
const getRoleBasedPermissions = (role: string): string[] => {
  const rolePermissions: Record<string, string[]> = {
    'super_admin': [
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:admin',
      'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:admin',
      'permissions:read', 'permissions:create', 'permissions:update', 'permissions:delete',
      'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:admin',
      'system:admin', 'audit:read', 'folders:admin'
    ],
    'admin': [
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:admin',
      'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:assign',
      'permissions:read',
      'documents:read', 'documents:create', 'documents:update', 'documents:delete',
      'system:admin', 'system:read', 'system:audit', 'system:security',
      'audit:read', 'folders:create', 'folders:update', 'folders:delete',
      'encryption:manage', 'mfa:manage'
    ],
    'manager': [
      'users:read',
      'roles:read',
      'permissions:read',
      'documents:read', 'documents:create', 'documents:update',
      'folders:create', 'folders:update'
    ],
    'user': [
      'documents:read', 'documents:create',
      'folders:read'
    ],
    'viewer': [
      'documents:read'
    ],
    // Handle numeric roles
    '5': [
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:admin',
      'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:admin',
      'permissions:read', 'permissions:create', 'permissions:update', 'permissions:delete',
      'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:admin',
      'system:admin', 'audit:read', 'folders:admin'
    ],
    '4': [
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:admin',
      'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:assign',
      'permissions:read',
      'documents:read', 'documents:create', 'documents:update', 'documents:delete',
      'system:admin', 'system:read', 'system:audit', 'system:security',
      'audit:read', 'folders:create', 'folders:update', 'folders:delete',
      'encryption:manage', 'mfa:manage'
    ],
    '3': [
      'users:read',
      'roles:read',
      'permissions:read',
      'documents:read', 'documents:create', 'documents:update',
      'folders:create', 'folders:update'
    ],
    '2': [
      'documents:read', 'documents:create',
      'folders:read'
    ],
    '1': [
      'documents:read'
    ]
  };
  
  return rolePermissions[role] || [];
};

const getRoleHierarchyLevel = (role: string): number => {
  const hierarchyLevels: Record<string, number> = {
    'viewer': 1,
    'user': 2,
    'manager': 3,
    'admin': 4,
    'super_admin': 5,
    // Handle numeric roles
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5
  };
  
  return hierarchyLevels[role] || 1;
};

/**
 * Permission Provider Component
 * Wraps the app to provide permission checking capabilities
 */
export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [hierarchyLevel, setHierarchyLevel] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();

  // Load user permissions and roles
  useEffect(() => {
    const loadUserPermissions = async () => {
      if (!isAuthenticated || !user?.id) {
        setUserPermissions([]);
        setUserRoles([]);
        setHierarchyLevel(0);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(undefined);

        // Try to load user permissions via RBAC API
        try {
          const permissions = await rbacService.getUserPermissions(user.id);
          setUserPermissions(permissions);

          const summary = await rbacService.getUserPermissionSummary(user.id);
          setUserRoles(summary.all_roles);
          setHierarchyLevel(summary.highest_hierarchy_level);
          
          console.log('✅ RBAC: Successfully loaded permissions from API for user:', user.id);
        } catch (apiError: any) {
          // Fallback to using auth context data if RBAC API not available
          console.log('⚠️ RBAC API not available, using fallback role-based permissions for user:', user.role);
          
          // Only log actual errors, not expected 403s for insufficient permissions
          if (apiError?.response?.status !== 403) {
            console.warn('RBAC API error:', apiError?.message);
          }
          
          // Use basic role-based permissions from auth context
          const roleBasedPermissions = getRoleBasedPermissions(user.role);
          setUserPermissions(roleBasedPermissions);
          setUserRoles([user.role]);
          setHierarchyLevel(getRoleHierarchyLevel(user.role));
          
          console.log('✅ RBAC: Using fallback permissions for role:', user.role, 'permissions:', roleBasedPermissions.length);
        }

        setIsLoading(false);
      } catch (err) {
        setError('Failed to load permissions');
        setIsLoading(false);
      }
    };

    loadUserPermissions();
  }, [isAuthenticated, user?.id]);

  // Helper functions
  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    return userRoles.includes(role);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => userPermissions.includes(permission));
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => userRoles.includes(role));
  };

  const hasHierarchyLevel = (level: number): boolean => {
    return hierarchyLevel >= level;
  };

  const contextValue: PermissionContextType = {
    userPermissions,
    userRoles,
    hierarchyLevel,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAnyRole,
    hasHierarchyLevel,
    isLoading,
    error
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

/**
 * Hook to access permission context
 */
export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

/**
 * Role-Based Component
 * Controls visibility of child components based on permissions/roles
 */
export const RoleBasedComponent: React.FC<RoleBasedVisibilityProps> = ({
  children,
  requiredPermission,
  requiredRole,
  requiredHierarchyLevel,
  anyPermissions,
  anyRoles,
  fallback = null,
  loadingComponent = null,
  inverse = false
}) => {
  const {
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAnyRole,
    hasHierarchyLevel,
    isLoading
  } = usePermissions();

  // Show loading component while permissions are being loaded
  if (isLoading && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  // Don't render anything while loading if no loading component provided
  if (isLoading) {
    return null;
  }

  // Check all conditions
  let shouldShow = true;

  // Check required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    shouldShow = false;
  }

  // Check required role
  if (requiredRole && !hasRole(requiredRole)) {
    shouldShow = false;
  }

  // Check required hierarchy level
  if (requiredHierarchyLevel !== undefined && !hasHierarchyLevel(requiredHierarchyLevel)) {
    shouldShow = false;
  }

  // Check any permissions (OR condition)
  if (anyPermissions && anyPermissions.length > 0 && !hasAnyPermission(anyPermissions)) {
    shouldShow = false;
  }

  // Check any roles (OR condition)
  if (anyRoles && anyRoles.length > 0 && !hasAnyRole(anyRoles)) {
    shouldShow = false;
  }

  // Apply inverse logic if specified
  if (inverse) {
    shouldShow = !shouldShow;
  }

  return shouldShow ? <>{children}</> : <>{fallback}</>;
};

/**
 * Higher-Order Component for role-based visibility
 */
export function withRoleBasedVisibility<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<RoleBasedVisibilityProps, 'children'>
) {
  const ComponentWithRoleBasedVisibility = (props: P) => {
    return (
      <RoleBasedComponent {...options}>
        <WrappedComponent {...props} />
      </RoleBasedComponent>
    );
  };

  ComponentWithRoleBasedVisibility.displayName = 
    `withRoleBasedVisibility(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithRoleBasedVisibility;
}

/**
 * Hook for conditional rendering based on permissions
 */
export const useRoleBasedVisibility = () => {
  const permissions = usePermissions();

  const canShow = (options: Omit<RoleBasedVisibilityProps, 'children'>) => {
    const {
      requiredPermission,
      requiredRole,
      requiredHierarchyLevel,
      anyPermissions,
      anyRoles,
      inverse = false
    } = options;

    let shouldShow = true;

    // Check all conditions
    if (requiredPermission && !permissions.hasPermission(requiredPermission)) {
      shouldShow = false;
    }

    if (requiredRole && !permissions.hasRole(requiredRole)) {
      shouldShow = false;
    }

    if (requiredHierarchyLevel !== undefined && !permissions.hasHierarchyLevel(requiredHierarchyLevel)) {
      shouldShow = false;
    }

    if (anyPermissions && anyPermissions.length > 0 && !permissions.hasAnyPermission(anyPermissions)) {
      shouldShow = false;
    }

    if (anyRoles && anyRoles.length > 0 && !permissions.hasAnyRole(anyRoles)) {
      shouldShow = false;
    }

    return inverse ? !shouldShow : shouldShow;
  };

  return {
    ...permissions,
    canShow
  };
};

/**
 * Permission-based Button Component
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  requiredPermission?: string;
  requiredRole?: string;
  requiredHierarchyLevel?: number;
  anyPermissions?: string[];
  anyRoles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  requiredPermission,
  requiredRole,
  requiredHierarchyLevel,
  anyPermissions,
  anyRoles,
  fallback,
  children,
  ...buttonProps
}) => {
  return (
    <RoleBasedComponent
      requiredPermission={requiredPermission}
      requiredRole={requiredRole}
      requiredHierarchyLevel={requiredHierarchyLevel}
      anyPermissions={anyPermissions}
      anyRoles={anyRoles}
      fallback={fallback}
    >
      <button {...buttonProps}>
        {children}
      </button>
    </RoleBasedComponent>
  );
};

/**
 * Permission-based Link Component
 */
interface PermissionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  requiredPermission?: string;
  requiredRole?: string;
  requiredHierarchyLevel?: number;
  anyPermissions?: string[];
  anyRoles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionLink: React.FC<PermissionLinkProps> = ({
  requiredPermission,
  requiredRole,
  requiredHierarchyLevel,
  anyPermissions,
  anyRoles,
  fallback,
  children,
  ...linkProps
}) => {
  return (
    <RoleBasedComponent
      requiredPermission={requiredPermission}
      requiredRole={requiredRole}
      requiredHierarchyLevel={requiredHierarchyLevel}
      anyPermissions={anyPermissions}
      anyRoles={anyRoles}
      fallback={fallback}
    >
      <a {...linkProps}>
        {children}
      </a>
    </RoleBasedComponent>
  );
};

/**
 * Admin-only Component
 */
export const AdminOnly: React.FC<{ 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ children, fallback }) => (
  <RoleBasedComponent requiredHierarchyLevel={4} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

/**
 * Manager and above Component
 */
export const ManagerAndAbove: React.FC<{ 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ children, fallback }) => (
  <RoleBasedComponent requiredHierarchyLevel={3} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

/**
 * User and above Component
 */
export const UserAndAbove: React.FC<{ 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ children, fallback }) => (
  <RoleBasedComponent requiredHierarchyLevel={2} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

/**
 * System Admin Only Component
 */
export const SystemAdminOnly: React.FC<{ 
  children: React.ReactNode; 
  fallback?: React.ReactNode 
}> = ({ children, fallback }) => (
  <RoleBasedComponent requiredRole="super_admin" fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

/**
 * Component for showing different content based on user role
 */
interface RoleBasedContentProps {
  superAdmin?: React.ReactNode;
  admin?: React.ReactNode;
  manager?: React.ReactNode;
  user?: React.ReactNode;
  viewer?: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleBasedContent: React.FC<RoleBasedContentProps> = ({
  superAdmin,
  admin,
  manager,
  user,
  viewer,
  fallback
}) => {
  const { userRoles } = usePermissions();

  // Check roles in hierarchy order (highest first)
  if (userRoles.includes('super_admin') && superAdmin) {
    return <>{superAdmin}</>;
  }
  if (userRoles.includes('admin') && admin) {
    return <>{admin}</>;
  }
  if (userRoles.includes('manager') && manager) {
    return <>{manager}</>;
  }
  if (userRoles.includes('user') && user) {
    return <>{user}</>;
  }
  if (userRoles.includes('viewer') && viewer) {
    return <>{viewer}</>;
  }

  return <>{fallback}</>;
};

/**
 * Navigation Item with Permission Check
 */
interface PermissionNavItemProps {
  to: string;
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  requiredHierarchyLevel?: number;
  anyPermissions?: string[];
  anyRoles?: string[];
  className?: string;
  activeClassName?: string;
}

export const PermissionNavItem: React.FC<PermissionNavItemProps> = ({
  to,
  children,
  requiredPermission,
  requiredRole,
  requiredHierarchyLevel,
  anyPermissions,
  anyRoles,
  className = '',
  activeClassName = ''
}) => {
  return (
    <RoleBasedComponent
      requiredPermission={requiredPermission}
      requiredRole={requiredRole}
      requiredHierarchyLevel={requiredHierarchyLevel}
      anyPermissions={anyPermissions}
      anyRoles={anyRoles}
    >
      <a
        href={to}
        className={`${className} ${window.location.pathname === to ? activeClassName : ''}`}
      >
        {children}
      </a>
    </RoleBasedComponent>
  );
};

/**
 * Protected Section Component
 */
interface ProtectedSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  requiredHierarchyLevel?: number;
  anyPermissions?: string[];
  anyRoles?: string[];
  showAccessDenied?: boolean;
}

export const ProtectedSection: React.FC<ProtectedSectionProps> = ({
  title,
  description,
  children,
  requiredPermission,
  requiredRole,
  requiredHierarchyLevel,
  anyPermissions,
  anyRoles,
  showAccessDenied = false
}) => {
  const accessDeniedContent = showAccessDenied ? (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <div className="text-gray-400 mb-2">
        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">
        You don't have permission to access this section.
      </p>
    </div>
  ) : null;

  return (
    <RoleBasedComponent
      requiredPermission={requiredPermission}
      requiredRole={requiredRole}
      requiredHierarchyLevel={requiredHierarchyLevel}
      anyPermissions={anyPermissions}
      anyRoles={anyRoles}
      fallback={accessDeniedContent}
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
        {children}
      </div>
    </RoleBasedComponent>
  );
};

// Export all components and hooks
export default RoleBasedComponent;