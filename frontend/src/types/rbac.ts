/**
 * RBAC (Role-Based Access Control) Type Definitions
 * 
 * This file contains TypeScript interfaces and types for the RBAC system,
 * including roles, permissions, user assignments, and API responses.
 */

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  hierarchy_level: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  permissions?: Permission[];
}

export interface RoleWithStats extends Role {
  user_count: number;
  permission_count: number;
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string;
  resource_type: string;
  action: string;
  is_system: boolean;
  requires_resource_ownership: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  user_id: number;
  role_id: number;
  assigned_at: string;
  assigned_by?: number;
  expires_at?: string;
  is_primary: boolean;
  is_active: boolean;
  role: Role;
}

export interface ResourcePermission {
  id: number;
  resource_type: string;
  resource_id: number;
  subject_type: 'user' | 'role';
  subject_id: number;
  permission: string;
  granted: boolean;
  granted_at: string;
  granted_by: number;
  expires_at?: string;
  conditions?: Record<string, any>;
}

// API Request/Response Types
export interface RoleCreate {
  name: string;
  display_name: string;
  description: string;
  hierarchy_level?: number;
  permissions?: string[];
}

export interface RoleUpdate {
  display_name?: string;
  description?: string;
  permissions?: string[];
}

export interface RoleListResponse {
  roles: Role[] | RoleWithStats[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
}

export interface PermissionCreate {
  name: string;
  display_name: string;
  description: string;
  resource_type: string;
  action: string;
  requires_resource_ownership?: boolean;
}

export interface PermissionUpdate {
  display_name?: string;
  description?: string;
  requires_resource_ownership?: boolean;
}

export interface PermissionListResponse {
  permissions: Permission[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
}

export interface UserRoleAssignment {
  user_id: number;
  role_id: number;
  is_primary?: boolean;
  expires_at?: string;
}

export interface UserRoleAssignmentResponse extends UserRole {
  // Includes all UserRole fields
}

export interface UserRoleListResponse {
  user_roles: UserRole[];
  total: number;
  user_id: number;
  username: string;
}

export interface BulkRoleAssignment {
  user_ids: number[];
  role_name: string;
  is_primary?: boolean;
  expires_at?: string;
}

export interface BulkRoleAssignmentResponse {
  successful: number[];
  failed: Array<{
    user_id: number;
    error: string;
  }>;
  total_processed: number;
}

export interface PermissionCheckRequest {
  user_id: number;
  permission: string;
  resource_type?: string;
  resource_id?: number;
}

export interface PermissionCheckResponse {
  granted: boolean;
  reason: string;
  source: 'role' | 'resource' | 'none';
}

export interface UserPermissionSummary {
  user_id: number;
  username: string;
  primary_role?: string;
  all_roles: string[];
  permission_count: number;
  highest_hierarchy_level: number;
  last_login?: string;
}

export interface SystemPermissionMatrix {
  roles: Role[];
  permissions: Permission[];
  matrix: Record<string, string[]>;
  hierarchy: Record<string, number>;
}

export interface ResourcePermissionCreate {
  resource_type: string;
  resource_id: number;
  subject_type: 'user' | 'role';
  subject_id: number;
  permission: string;
  granted: boolean;
  expires_at?: string;
  conditions?: Record<string, any>;
}

export interface ResourcePermissionUpdate {
  granted?: boolean;
  expires_at?: string;
  conditions?: Record<string, any>;
}

export interface RBACError {
  detail: string;
  error_code?: string;
  field_errors?: Record<string, string[]>;
}

// Role hierarchy constants
export const ROLE_HIERARCHY = {
  VIEWER: 1,
  USER: 2,
  MANAGER: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5
} as const;

export const ROLE_NAMES = {
  [ROLE_HIERARCHY.VIEWER]: 'Viewer',
  [ROLE_HIERARCHY.USER]: 'User', 
  [ROLE_HIERARCHY.MANAGER]: 'Manager',
  [ROLE_HIERARCHY.ADMIN]: 'Admin',
  [ROLE_HIERARCHY.SUPER_ADMIN]: 'Super Admin'
} as const;

// Permission action constants
export const PERMISSION_ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ADMIN: 'admin'
} as const;

// Resource type constants
export const RESOURCE_TYPES = {
  DOCUMENTS: 'documents',
  USERS: 'users',
  ROLES: 'roles',
  SYSTEM: 'system',
  FOLDERS: 'folders'
} as const;

// UI State types
export interface RoleManagementState {
  roles: Role[];
  selectedRole?: Role;
  isLoading: boolean;
  error?: string;
  showCreateDialog: boolean;
  showEditDialog: boolean;
  showDeleteDialog: boolean;
  filters: {
    search: string;
    hierarchy_level?: number;
    active_only: boolean;
  };
  pagination: {
    page: number;
    size: number;
    total: number;
    has_next: boolean;
  };
}

export interface UserRoleAssignmentState {
  users: Array<{
    id: number;
    username: string;
    email: string;
    account_locked: boolean;
    last_login: string | null;
    roles: UserRole[];
  }>;
  selectedUser?: number;
  availableRoles: Role[];
  isLoading: boolean;
  error?: string;
  showAssignDialog: boolean;
  showBulkDialog: boolean;
  bulkSelection: number[];
}

export interface PermissionMatrixState {
  roles: Role[];
  permissions: Permission[];
  matrix: Record<string, string[]>;
  hierarchy: Record<string, number>;
  isLoading: boolean;
  error?: string;
  filters: {
    resource_type?: string;
    role_hierarchy?: number;
  };
}

// Form validation types
export interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  hierarchy_level: number;
  permissions: string[];
}

export interface RoleFormErrors {
  name?: string;
  display_name?: string;
  description?: string;
  hierarchy_level?: string;
  permissions?: string;
}

// Component props types
export interface RoleManagementProps {
  showStats?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  onRoleSelect?: (role: Role) => void;
}

export interface UserRoleAssignmentProps {
  userId?: number;
  showBulkOperations?: boolean;
  onAssignmentChange?: () => void;
}

export interface PermissionMatrixProps {
  interactive?: boolean;
  showHierarchy?: boolean;
  highlightRole?: string;
  onPermissionClick?: (role: string, permission: string) => void;
  compact?: boolean;
  mobileView?: 'matrix' | 'summary' | 'hierarchy';
}

export interface AccessDeniedProps {
  requiredPermission?: string;
  requiredRole?: string;
  message?: string;
  showReturnButton?: boolean;
  onReturnClick?: () => void;
}

// Utility types
export type RoleHierarchyLevel = typeof ROLE_HIERARCHY[keyof typeof ROLE_HIERARCHY];
export type PermissionAction = typeof PERMISSION_ACTIONS[keyof typeof PERMISSION_ACTIONS];
export type ResourceType = typeof RESOURCE_TYPES[keyof typeof RESOURCE_TYPES];
export type SubjectType = 'user' | 'role';

// API service types
export interface RBACServiceInterface {
  // Role management
  getRoles(params?: {
    page?: number;
    size?: number;
    include_stats?: boolean;
    active_only?: boolean;
  }): Promise<RoleListResponse>;
  
  getRole(roleId: number): Promise<Role>;
  createRole(data: RoleCreate): Promise<Role>;
  updateRole(roleId: number, data: RoleUpdate): Promise<Role>;
  deleteRole(roleId: number): Promise<void>;
  
  // Permission management
  getPermissions(params?: {
    page?: number;
    size?: number;
    resource_type?: string;
  }): Promise<PermissionListResponse>;
  
  createPermission(data: PermissionCreate): Promise<Permission>;
  
  // User role assignments
  getUserRoles(userId: number): Promise<UserRoleListResponse>;
  assignRoleToUser(userId: number, assignment: UserRoleAssignment): Promise<UserRoleAssignmentResponse>;
  revokeRoleFromUser(userId: number, roleId: number): Promise<void>;
  bulkAssignRoles(assignment: BulkRoleAssignment): Promise<BulkRoleAssignmentResponse>;
  
  // Permission checking
  checkPermission(request: PermissionCheckRequest): Promise<PermissionCheckResponse>;
  getUserPermissions(userId: number): Promise<string[]>;
  getUserPermissionSummary(userId: number): Promise<UserPermissionSummary>;
  
  // System utilities
  getPermissionMatrix(): Promise<SystemPermissionMatrix>;
  
  // Resource permissions
  createResourcePermission(data: ResourcePermissionCreate): Promise<ResourcePermission>;
  getResourcePermissions(resourceType: string, resourceId: number): Promise<ResourcePermission[]>;
  
  // Health check
  checkHealth(): Promise<{ status: string; roles: number; permissions: number; timestamp: string }>;
}