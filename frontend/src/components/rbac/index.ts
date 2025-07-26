/**
 * RBAC Components Index
 * 
 * Centralized exports for all RBAC-related components, making it easy
 * to import and use throughout the application.
 */

// Core RBAC Components
export { default as RoleManagementInterface } from './RoleManagementInterface';
export { default as UserRoleAssignmentInterface } from './UserRoleAssignmentInterface';
export { default as PermissionMatrixDisplay } from './PermissionMatrixDisplay';

// Role-based Visibility Components
export {
  default as RoleBasedComponent,
  PermissionProvider,
  usePermissions,
  useRoleBasedVisibility,
  withRoleBasedVisibility,
  PermissionButton,
  PermissionLink,
  AdminOnly,
  ManagerAndAbove,
  UserAndAbove,
  SystemAdminOnly,
  RoleBasedContent,
  PermissionNavItem,
  ProtectedSection
} from './RoleBasedComponent';

// Access Control Components
export {
  default as AccessDeniedPage,
  InlineAccessDenied,
  RBACErrorBoundary,
  withRBACErrorBoundary
} from './AccessDeniedPage';

// User Role Indicators
export {
  RoleBadge,
  UserRoleDisplay,
  PermissionIndicator,
  CurrentUserRoleIndicator,
  RoleStatusIndicator
} from './UserRoleIndicators';

// Bulk Operations Component (Task 3.2.7)
export { default as BulkUserRoleOperations } from './BulkUserRoleOperations';

// Role Inheritance Visualization (Task 3.2.8)
export { default as RoleInheritanceVisualization } from './RoleInheritanceVisualization';

// Permission Audit Trail Viewer (Task 3.2.9) - COMPLETED
export { default as PermissionAuditTrailViewer } from './PermissionAuditTrailViewer';

// Mobile-Responsive Role Management (Task 3.2.10) - COMPLETED
export { 
  default as MobileResponsiveRoleManagement,
  ResponsiveRBACWrapper,
  TouchButton
} from './MobileResponsiveRoleManagement';

// Type exports for convenience
export type {
  Role,
  Permission,
  UserRole,
  RoleCreate,
  RoleUpdate,
  UserRoleAssignment,
  BulkRoleAssignment,
  PermissionCheckRequest,
  PermissionCheckResponse,
  SystemPermissionMatrix,
  RoleManagementProps,
  UserRoleAssignmentProps,
  PermissionMatrixProps,
  AccessDeniedProps
} from '../../types/rbac';

// Service exports for convenience
export { rbacService } from '../../services/rbacService';

/**
 * Quick Start Usage Guide:
 * 
 * // Role Management (Admin Interface)
 * import { RoleManagementInterface } from '@/components/rbac';
 * <RoleManagementInterface showStats={true} allowCreate={true} />
 * 
 * // User Role Assignment
 * import { UserRoleAssignmentInterface } from '@/components/rbac';
 * <UserRoleAssignmentInterface showBulkOperations={true} />
 * 
 * // Permission Matrix
 * import { PermissionMatrixDisplay } from '@/components/rbac';
 * <PermissionMatrixDisplay interactive={true} showHierarchy={true} />
 * 
 * // Role-based Visibility
 * import { RoleBasedComponent, AdminOnly } from '@/components/rbac';
 * <AdminOnly><AdminPanel /></AdminOnly>
 * <RoleBasedComponent requiredPermission="users:create">
 *   <CreateUserButton />
 * </RoleBasedComponent>
 * 
 * // Access Control
 * import { AccessDeniedPage, PermissionButton } from '@/components/rbac';
 * <PermissionButton requiredRole="admin">Admin Action</PermissionButton>
 * 
 * // User Role Indicators
 * import { RoleBadge, CurrentUserRoleIndicator } from '@/components/rbac';
 * <RoleBadge role="admin" isPrimary={true} />
 * <CurrentUserRoleIndicator variant="compact" />
 * 
 * // Permission Provider (Wrap your app)
 * import { PermissionProvider } from '@/components/rbac';
 * <PermissionProvider>
 *   <App />
 * </PermissionProvider>
 * 
 * // Using Hooks
 * import { usePermissions, useRoleBasedVisibility } from '@/components/rbac';
 * const { hasPermission, userRoles } = usePermissions();
 * const { canShow } = useRoleBasedVisibility();
 * 
 * if (hasPermission('users:create')) {
 *   // Show create user button
 * }
 * 
 * if (canShow({ requiredRole: 'admin' })) {
 *   // Show admin content
 * }
 */