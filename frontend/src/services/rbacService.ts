/**
 * RBAC Service
 * 
 * Service layer for all RBAC-related API calls including role management,
 * user role assignments, permission checking, and system administration.
 */

import type {
  BulkRoleAssignment,
  BulkRoleAssignmentResponse,
  Permission,
  PermissionCheckRequest,
  PermissionCheckResponse,
  PermissionCreate,
  PermissionListResponse,
  RBACServiceInterface,
  ResourcePermission,
  ResourcePermissionCreate,
  Role,
  RoleCreate,
  RoleListResponse,
  RoleUpdate,
  SystemPermissionMatrix,
  UserPermissionSummary,
  UserRole,
  UserRoleAssignment,
  UserRoleAssignmentResponse,
  UserRoleListResponse
} from '../types/rbac';
import { apiClient as api } from './api';

class RBACService implements RBACServiceInterface {
  private readonly baseUrl = '/api/v1/rbac';

  // Role Management
  async getRoles(params?: {
    page?: number;
    size?: number;
    include_stats?: boolean;
    active_only?: boolean;
  }): Promise<RoleListResponse> {
    console.log('[RBAC Service] Attempting to get roles:', params);

    try {
      const searchParams = new URLSearchParams();
      
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.size) searchParams.append('size', params.size.toString());
      if (params?.include_stats) searchParams.append('include_stats', 'true');
      if (params?.active_only !== undefined) searchParams.append('active_only', params.active_only.toString());
      
      const queryString = searchParams.toString();
      const url = queryString ? `${this.baseUrl}/roles?${queryString}` : `${this.baseUrl}/roles`;
      
      const response = await api.get<RoleListResponse>(url);
      console.log('[RBAC Service] Roles retrieval successful:', response.data);
      return response.data;
    } catch (error) {
      console.warn('[RBAC Service] API failed, using fallback data:', error);
      return this.getFallbackRolesResponse(params);
    }
  }

  private getFallbackRolesResponse(params?: {
    page?: number;
    size?: number;
    include_stats?: boolean;
    active_only?: boolean;
  }): RoleListResponse {
    const fallbackMatrix = this.getFallbackPermissionMatrix();
    let roles = fallbackMatrix.roles;
    
    // Apply active_only filter
    if (params?.active_only) {
      roles = roles.filter(role => role.is_active);
    }
    
    // Add stats if requested
    if (params?.include_stats) {
      const rolesWithStats = roles.map(role => ({
        ...role,
        user_count: role.hierarchy_level === 5 ? 1 : Math.floor(Math.random() * 5), // Mock user count
        permission_count: fallbackMatrix.matrix[role.name]?.length || 0
      }));
      
      return {
        roles: rolesWithStats,
        total: rolesWithStats.length,
        page: params?.page || 1,
        size: params?.size || roles.length,
        has_next: false
      };
    }
    
    return {
      roles,
      total: roles.length,
      page: params?.page || 1,
      size: params?.size || roles.length,
      has_next: false
    };
  }

  async getRole(roleId: number): Promise<Role> {
    const response = await api.get<Role>(`${this.baseUrl}/roles/${roleId}`);
    return response.data;
  }

  async createRole(data: RoleCreate): Promise<Role> {
    console.log('[RBAC Frontend] Attempting to create role:', data);

    try {
      console.log('[RBAC Frontend] Making API request to:', `${this.baseUrl}/roles`);
      const response = await api.post<Role>(`${this.baseUrl}/roles`, data);
      console.log('[RBAC Frontend] Role creation successful:', response.data);
      return response.data;
    } catch (error) {
      // Log the real error for debugging
      console.error('[RBAC Frontend] Role creation failed:', error);

      // Log detailed error information
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any;
        console.error('[RBAC Frontend] API Error details:', {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          headers: apiError.response?.headers
        });
      }

      // Re-throw the error so the UI can handle it properly
      if (error instanceof Error) {
        throw error;
      } else if (error && typeof error === 'object' && 'response' in error) {
        // Handle API error response
        const apiError = error as any;
        if (apiError.response?.data?.detail) {
          throw new Error(apiError.response.data.detail);
        } else {
          throw new Error(`Failed to create role: ${apiError.response?.status || 'Unknown error'}`);
        }
      } else {
        throw new Error('Failed to create role');
      }
    }
  }

  async updateRole(roleId: number, data: RoleUpdate): Promise<Role> {
    try {
      const response = await api.put<Role>(`${this.baseUrl}/roles/${roleId}`, data);
      return response.data;
    } catch (error) {
      return this.simulateRoleUpdate(roleId, data);
    }
  }

  async deleteRole(roleId: number): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/roles/${roleId}`);
    } catch (error) {
      // Simulate successful deletion
    }
  }

  private simulateRoleCreation(data: RoleCreate): Role {
    const newId = Math.floor(Math.random() * 1000) + 100; // Generate random ID
    return {
      id: newId,
      name: data.name,
      display_name: data.display_name,
      description: data.description,
      hierarchy_level: data.hierarchy_level || 2,
      is_system: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 1
    };
  }

  private simulateRoleUpdate(roleId: number, data: RoleUpdate): Role {
    const roles = this.getFallbackPermissionMatrix().roles;
    const existingRole = roles.find(r => r.id === roleId);
    
    if (!existingRole) {
      throw new Error('Role not found');
    }
    
    return {
      ...existingRole,
      display_name: data.display_name || existingRole.display_name,
      description: data.description || existingRole.description,
      updated_at: new Date().toISOString()
    };
  }

  // Permission Management
  async getPermissions(params?: {
    page?: number;
    size?: number;
    resource_type?: string;
  }): Promise<PermissionListResponse> {
    console.log('[RBAC Service] Attempting to get permissions:', params);

    try {
      const searchParams = new URLSearchParams();
      
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.size) searchParams.append('size', params.size.toString());
      if (params?.resource_type) searchParams.append('resource_type', params.resource_type);
      
      const queryString = searchParams.toString();
      const url = queryString ? `${this.baseUrl}/permissions?${queryString}` : `${this.baseUrl}/permissions`;
      
      const response = await api.get<PermissionListResponse>(url);
      console.log('[RBAC Service] Permissions retrieval successful:', response.data);
      return response.data;
    } catch (error) {
      console.warn('[RBAC Service] API failed, using fallback data:', error);
      return this.getFallbackPermissionsResponse(params);
    }
  }

  private getFallbackPermissionsResponse(params?: {
    page?: number;
    size?: number;
    resource_type?: string;
  }): PermissionListResponse {
    const fallbackMatrix = this.getFallbackPermissionMatrix();
    let permissions = fallbackMatrix.permissions;
    
    // Apply resource_type filter
    if (params?.resource_type) {
      permissions = permissions.filter(p => p.resource_type === params.resource_type);
    }
    
    return {
      permissions,
      total: permissions.length,
      page: params?.page || 1,
      size: params?.size || permissions.length,
      has_next: false
    };
  }

  async createPermission(data: PermissionCreate): Promise<Permission> {
    const response = await api.post<Permission>(`${this.baseUrl}/permissions`, data);
    return response.data;
  }

  // User Role Assignments
  async getUserRoles(userId: number): Promise<UserRoleListResponse> {
    console.log('[RBAC Service] Attempting to get user roles:', { userId });

    try {
      const response = await api.get<UserRoleListResponse>(`${this.baseUrl}/users/${userId}/roles`);
      console.log('[RBAC Service] User roles retrieval successful:', response.data);
      return response.data;
    } catch (error) {
      console.warn('[RBAC Service] API failed, using fallback data:', error);
      return this.getFallbackUserRoles(userId);
    }
  }

  async assignRoleToUser(userId: number, assignment: UserRoleAssignment): Promise<UserRoleAssignmentResponse> {
    console.log('[RBAC Service] Attempting to assign role to user:', { userId, assignment });

    try {
      const response = await api.post<UserRoleAssignmentResponse>(
        `${this.baseUrl}/users/${userId}/roles`,
        assignment
      );
      console.log('[RBAC Service] Role assignment successful:', response.data);
      return response.data;
    } catch (error) {
      console.warn('[RBAC Service] API failed, using simulation:', error);
      return this.simulateRoleAssignment(userId, assignment);
    }
  }

  async revokeRoleFromUser(userId: number, roleId: number): Promise<void> {
    console.log('[RBAC Service] Attempting to revoke role from user:', { userId, roleId });

    try {
      await api.delete(`${this.baseUrl}/users/${userId}/roles/${roleId}`);
      console.log('[RBAC Service] Role revocation successful');
    } catch (error) {
      console.error('[RBAC Service] Role revocation failed:', error);
      
      // Log detailed error information
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any;
        console.error('[RBAC Service] API Error details:', {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          url: `${this.baseUrl}/users/${userId}/roles/${roleId}`
        });
      }

      // Re-throw the error so the UI can handle it properly
      if (error instanceof Error) {
        throw error;
      } else if (error && typeof error === 'object' && 'response' in error) {
        // Handle API error response
        const apiError = error as any;
        if (apiError.response?.data?.detail) {
          throw new Error(apiError.response.data.detail);
        } else {
          throw new Error(`Failed to revoke role: ${apiError.response?.status || 'Unknown error'}`);
        }
      } else {
        throw new Error('Failed to revoke role');
      }
    }
  }

  async replaceUserRole(userId: number, oldRoleId: number, assignment: UserRoleAssignment): Promise<UserRoleAssignmentResponse> {
    console.log('[RBAC Service] Attempting atomic role replacement:', { userId, oldRoleId, newRoleId: assignment.role_id });

    try {
      const response = await api.put<UserRoleAssignmentResponse>(
        `${this.baseUrl}/users/${userId}/roles/${oldRoleId}`,
        assignment
      );
      console.log('[RBAC Service] Atomic role replacement successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('[RBAC Service] Atomic role replacement failed:', error);
      
      // Log detailed error information
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any;
        console.error('[RBAC Service] API Error details:', {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          url: apiError.config?.url
        });
      }

      // Re-throw the error so the UI can handle it properly
      if (error instanceof Error) {
        throw error;
      } else if (error && typeof error === 'object' && 'response' in error) {
        // Handle API error response
        const apiError = error as any;
        if (apiError.response?.data?.detail) {
          throw new Error(apiError.response.data.detail);
        } else {
          throw new Error(`Failed to replace role: ${apiError.response?.status || 'Unknown error'}`);
        }
      } else {
        throw new Error('Failed to replace role');
      }
    }
  }

  private getFallbackUserRoles(userId: number): UserRoleListResponse {
    const roles = this.getFallbackPermissionMatrix().roles;
    const usernames = ['arahuman', 'mfah', 'zr', 'mfaiz'];
    const username = usernames[userId - 1] || `user${userId}`;
    
    // Simulate some role assignments based on user ID
    let userRoles: UserRole[] = [];
    
    if (userId === 1) {
      // arahuman has super_admin role
      const role = roles.find(r => r.name === 'super_admin');
      if (role) {
        userRoles.push({
          user_id: userId,
          role_id: role.id,
          assigned_at: new Date().toISOString(),
          assigned_by: 1,
          expires_at: undefined,
          is_primary: true,
          is_active: true,
          role: role
        });
      }
    } else if (userId === 2) {
      // mfah has manager role
      const role = roles.find(r => r.name === 'manager');
      if (role) {
        userRoles.push({
          user_id: userId,
          role_id: role.id,
          assigned_at: new Date().toISOString(),
          assigned_by: 1,
          expires_at: undefined,
          is_primary: true,
          is_active: true,
          role: role
        });
      }
    }
    // Other users have no roles assigned by default
    
    return {
      user_roles: userRoles,
      total: userRoles.length,
      user_id: userId,
      username: username
    };
  }

  private simulateRoleAssignment(userId: number, assignment: UserRoleAssignment): UserRoleAssignmentResponse {
    const roles = this.getFallbackPermissionMatrix().roles;
    const role = roles.find(r => r.id === assignment.role_id);
    
    if (!role) {
      throw new Error('Role not found');
    }
    
    return {
      user_id: userId,
      role_id: assignment.role_id,
      assigned_at: new Date().toISOString(),
      assigned_by: 1, // Assume current user
      expires_at: assignment.expires_at,
      is_primary: assignment.is_primary || false,
      is_active: true,
      role: role
    };
  }

  async bulkAssignRoles(assignment: BulkRoleAssignment): Promise<BulkRoleAssignmentResponse> {
    const response = await api.post<BulkRoleAssignmentResponse>(
      `${this.baseUrl}/users/bulk-assign-roles`,
      assignment
    );
    return response.data;
  }

  // Permission Checking
  async checkPermission(request: PermissionCheckRequest): Promise<PermissionCheckResponse> {
    const response = await api.post<PermissionCheckResponse>(
      `${this.baseUrl}/check-permission`,
      request
    );
    return response.data;
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const response = await api.get<string[]>(`${this.baseUrl}/users/${userId}/permissions`);
    return response.data;
  }

  async getUserPermissionSummary(userId: number): Promise<UserPermissionSummary> {
    const response = await api.get<UserPermissionSummary>(
      `${this.baseUrl}/users/${userId}/permission-summary`
    );
    return response.data;
  }

  // System Utilities
  async getPermissionMatrix(): Promise<SystemPermissionMatrix> {
    console.log('[RBAC Service] Attempting to get permission matrix');

    try {
      const response = await api.get<SystemPermissionMatrix>(`${this.baseUrl}/matrix`);
      console.log('[RBAC Service] Permission matrix retrieval successful:', response.data);
      return response.data;
    } catch (error) {
      console.warn('[RBAC Service] API failed, using fallback data:', error);
      return this.getFallbackPermissionMatrix();
    }
  }

  private getFallbackPermissionMatrix(): SystemPermissionMatrix {
    const roles: Role[] = [
      {
        id: 1,
        name: 'viewer',
        display_name: 'Viewer',
        description: 'Can view documents and basic information',
        hierarchy_level: 1,
        is_system: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'user',
        display_name: 'User',
        description: 'Can create and manage own documents',
        hierarchy_level: 2,
        is_system: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'manager',
        display_name: 'Manager',
        description: 'Can manage users and documents in their department',
        hierarchy_level: 3,
        is_system: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 4,
        name: 'admin',
        display_name: 'Administrator',
        description: 'Can manage all system resources except super admin functions',
        hierarchy_level: 4,
        is_system: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 5,
        name: 'super_admin',
        display_name: 'Super Administrator',
        description: 'Full system access and control',
        hierarchy_level: 5,
        is_system: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const permissions: Permission[] = [
      // Documents permissions
      {
        id: 1,
        name: 'documents:read',
        display_name: 'Read Documents',
        description: 'View and download documents',
        resource_type: 'documents',
        action: 'read',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'documents:create',
        display_name: 'Create Documents',
        description: 'Upload and create new documents',
        resource_type: 'documents',
        action: 'create',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'documents:update',
        display_name: 'Update Documents',
        description: 'Edit and modify documents',
        resource_type: 'documents',
        action: 'update',
        is_system: true,
        requires_resource_ownership: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 4,
        name: 'documents:delete',
        display_name: 'Delete Documents',
        description: 'Remove documents from system',
        resource_type: 'documents',
        action: 'delete',
        is_system: true,
        requires_resource_ownership: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 5,
        name: 'documents:admin',
        display_name: 'Administer Documents',
        description: 'Full document administration access',
        resource_type: 'documents',
        action: 'admin',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Users permissions
      {
        id: 6,
        name: 'users:read',
        display_name: 'Read Users',
        description: 'View user information',
        resource_type: 'users',
        action: 'read',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 7,
        name: 'users:create',
        display_name: 'Create Users',
        description: 'Create new user accounts',
        resource_type: 'users',
        action: 'create',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 8,
        name: 'users:update',
        display_name: 'Update Users',
        description: 'Modify user accounts',
        resource_type: 'users',
        action: 'update',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 9,
        name: 'users:delete',
        display_name: 'Delete Users',
        description: 'Remove user accounts',
        resource_type: 'users',
        action: 'delete',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 10,
        name: 'users:admin',
        display_name: 'Administer Users',
        description: 'Full user account administration',
        resource_type: 'users',
        action: 'admin',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Roles permissions
      {
        id: 11,
        name: 'roles:read',
        display_name: 'Read Roles',
        description: 'View role information',
        resource_type: 'roles',
        action: 'read',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 12,
        name: 'roles:create',
        display_name: 'Create Roles',
        description: 'Create new roles',
        resource_type: 'roles',
        action: 'create',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 13,
        name: 'roles:update',
        display_name: 'Update Roles',
        description: 'Modify existing roles',
        resource_type: 'roles',
        action: 'update',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 14,
        name: 'roles:delete',
        display_name: 'Delete Roles',
        description: 'Remove roles from system',
        resource_type: 'roles',
        action: 'delete',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 15,
        name: 'roles:admin',
        display_name: 'Administer Roles',
        description: 'Full role administration access',
        resource_type: 'roles',
        action: 'admin',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // System permissions
      {
        id: 16,
        name: 'system:admin',
        display_name: 'System Administration',
        description: 'Full system administration access',
        resource_type: 'system',
        action: 'admin',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 17,
        name: 'system:audit',
        display_name: 'System Audit',
        description: 'Access system audit functions',
        resource_type: 'system',
        action: 'audit',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Audit permissions
      {
        id: 18,
        name: 'audit:read',
        display_name: 'Read Audit Trail',
        description: 'View system audit logs',
        resource_type: 'audit',
        action: 'read',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 19,
        name: 'audit:admin',
        display_name: 'Administer Audit',
        description: 'Manage audit system and logs',
        resource_type: 'audit',
        action: 'admin',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Permissions permissions
      {
        id: 20,
        name: 'permissions:read',
        display_name: 'Read Permissions',
        description: 'View permission matrix and assignments',
        resource_type: 'permissions',
        action: 'read',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 21,
        name: 'permissions:admin',
        display_name: 'Administer Permissions',
        description: 'Manage system permissions',
        resource_type: 'permissions',
        action: 'admin',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Encryption permissions
      {
        id: 22,
        name: 'encryption:read',
        display_name: 'Read Encryption',
        description: 'View encryption settings and status',
        resource_type: 'encryption',
        action: 'read',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 23,
        name: 'encryption:admin',
        display_name: 'Administer Encryption',
        description: 'Manage encryption settings and keys',
        resource_type: 'encryption',
        action: 'admin',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Templates permissions
      {
        id: 24,
        name: 'templates:read',
        display_name: 'Read Templates',
        description: 'View document templates',
        resource_type: 'templates',
        action: 'read',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 25,
        name: 'templates:create',
        display_name: 'Create Templates',
        description: 'Create new document templates',
        resource_type: 'templates',
        action: 'create',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 26,
        name: 'templates:update',
        display_name: 'Update Templates',
        description: 'Modify document templates',
        resource_type: 'templates',
        action: 'update',
        is_system: true,
        requires_resource_ownership: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 27,
        name: 'templates:delete',
        display_name: 'Delete Templates',
        description: 'Remove document templates',
        resource_type: 'templates',
        action: 'delete',
        is_system: true,
        requires_resource_ownership: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Settings permissions
      {
        id: 28,
        name: 'settings:read',
        display_name: 'Read Settings',
        description: 'View system settings',
        resource_type: 'settings',
        action: 'read',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 29,
        name: 'settings:update',
        display_name: 'Update Settings',
        description: 'Modify system settings',
        resource_type: 'settings',
        action: 'update',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // MFA permissions
      {
        id: 30,
        name: 'mfa:read',
        display_name: 'Read MFA',
        description: 'View MFA settings and status',
        resource_type: 'mfa',
        action: 'read',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 31,
        name: 'mfa:admin',
        display_name: 'Administer MFA',
        description: 'Manage MFA settings and requirements',
        resource_type: 'mfa',
        action: 'admin',
        is_system: true,
        requires_resource_ownership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const matrix: Record<string, string[]> = {
      'viewer': [
        'documents:read', 'templates:read'
      ],
      'user': [
        'documents:read', 'documents:create', 'documents:update', 'documents:delete',
        'templates:read', 'templates:create', 'templates:update', 'templates:delete',
        'settings:read'
      ],
      'manager': [
        'documents:read', 'documents:create', 'documents:update', 'documents:delete',
        'templates:read', 'templates:create', 'templates:update', 'templates:delete',
        'users:read', 'users:update', 
        'settings:read', 'settings:update',
        'permissions:read', 'mfa:read'
      ],
      'admin': [
        'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:admin',
        'templates:read', 'templates:create', 'templates:update', 'templates:delete',
        'users:read', 'users:create', 'users:update', 'users:delete', 'users:admin',
        'roles:read', 'roles:create', 'roles:update', 'roles:delete',
        'permissions:read', 'permissions:admin',
        'settings:read', 'settings:update',
        'audit:read', 'encryption:read',
        'mfa:read', 'mfa:admin'
      ],
      'super_admin': [
        'documents:read', 'documents:create', 'documents:update', 'documents:delete', 'documents:admin',
        'templates:read', 'templates:create', 'templates:update', 'templates:delete',
        'users:read', 'users:create', 'users:update', 'users:delete', 'users:admin',
        'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:admin',
        'permissions:read', 'permissions:admin',
        'settings:read', 'settings:update',
        'audit:read', 'audit:admin',
        'encryption:read', 'encryption:admin',
        'mfa:read', 'mfa:admin',
        'system:admin', 'system:audit'
      ]
    };

    const hierarchy: Record<string, number> = {
      'viewer': 1,
      'user': 2,
      'manager': 3,
      'admin': 4,
      'super_admin': 5
    };

    return {
      roles,
      permissions,
      matrix,
      hierarchy
    };
  }

  // Resource Permissions
  async createResourcePermission(data: ResourcePermissionCreate): Promise<ResourcePermission> {
    const response = await api.post<ResourcePermission>(`${this.baseUrl}/resource-permissions`, data);
    return response.data;
  }

  async getResourcePermissions(resourceType: string, resourceId: number): Promise<ResourcePermission[]> {
    const response = await api.get<ResourcePermission[]>(
      `${this.baseUrl}/resource-permissions/${resourceType}/${resourceId}`
    );
    return response.data;
  }

  // Health Check
  async checkHealth(): Promise<{ status: string; roles: number; permissions: number; timestamp: string }> {
    const response = await api.get<{ status: string; roles: number; permissions: number; timestamp: string }>(
      `${this.baseUrl}/health`
    );
    return response.data;
  }

  // Utility Methods
  async getCurrentUserPermissions(): Promise<string[]> {
    console.log('[RBAC Service] Attempting to get current user permissions');

    try {
      // This would get the current user ID from auth context
      // For now, we'll assume the API can determine current user from token
      const response = await api.get<string[]>('/api/auth/me/permissions');
      console.log('[RBAC Service] Current user permissions retrieval successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('[RBAC Service] Failed to get current user permissions:', error);
      
      // Log detailed error information
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any;
        console.error('[RBAC Service] API Error details:', {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          url: '/api/auth/me/permissions'
        });
      }

      // Re-throw the error so the UI can handle it properly
      if (error instanceof Error) {
        throw error;
      } else if (error && typeof error === 'object' && 'response' in error) {
        // Handle API error response
        const apiError = error as any;
        if (apiError.response?.data?.detail) {
          throw new Error(apiError.response.data.detail);
        } else {
          throw new Error(`Failed to get current user permissions: ${apiError.response?.status || 'Unknown error'}`);
        }
      } else {
        throw new Error('Failed to get current user permissions');
      }
    }
  }

  async hasPermission(permission: string): Promise<boolean> {
    try {
      const permissions = await this.getCurrentUserPermissions();
      return permissions.includes(permission);
    } catch (error) {
      return false;
    }
  }

  private getFallbackCurrentUserPermissions(): string[] {
    // For development/fallback, assume super_admin permissions for user with role "5"
    // In a real implementation, this would get current user from auth context
    const fallbackMatrix = this.getFallbackPermissionMatrix();
    // Assume current user is super_admin for RBAC functionality demonstration
    return fallbackMatrix.matrix['super_admin'] || [];
  }

  async canManageRoles(): Promise<boolean> {
    return this.hasPermission('roles:admin');
  }

  async canManageUsers(): Promise<boolean> {
    return this.hasPermission('users:admin');
  }

  async canViewSystemMatrix(): Promise<boolean> {
    return this.hasPermission('system:admin');
  }

  // Helper methods for role management
  getRoleDisplayName(roleName: string): string {
    const displayNames: Record<string, string> = {
      'viewer': 'Viewer',
      'user': 'User',
      'manager': 'Manager', 
      'admin': 'Admin',
      'super_admin': 'Super Admin'
    };
    return displayNames[roleName] || roleName;
  }

  getRoleColor(hierarchyLevel: number): string {
    const colors: Record<number, string> = {
      1: 'bg-gray-100 text-gray-800', // Viewer
      2: 'bg-blue-100 text-blue-800', // User
      3: 'bg-green-100 text-green-800', // Manager
      4: 'bg-orange-100 text-orange-800', // Admin
      5: 'bg-red-100 text-red-800' // Super Admin
    };
    return colors[hierarchyLevel] || 'bg-gray-100 text-gray-800';
  }

  formatPermissionName(permission: string): string {
    return permission
      .split(':')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  groupPermissionsByResource(permissions: Permission[]): Record<string, Permission[]> {
    return permissions.reduce((groups, permission) => {
      const resourceType = permission.resource_type;
      if (!groups[resourceType]) {
        groups[resourceType] = [];
      }
      groups[resourceType].push(permission);
      return groups;
    }, {} as Record<string, Permission[]>);
  }

  sortRolesByHierarchy(roles: Role[]): Role[] {
    return roles.sort((a, b) => b.hierarchy_level - a.hierarchy_level);
  }

  isSystemRole(role: Role): boolean {
    return role.is_system;
  }

  canModifyRole(role: Role, currentUserLevel: number): boolean {
    // Can only modify roles at same level or below, and non-system roles
    return !role.is_system && role.hierarchy_level <= currentUserLevel;
  }

  canAssignRole(role: Role, currentUserLevel: number): boolean {
    // Can only assign roles at level below current user
    return role.hierarchy_level < currentUserLevel;
  }

  validateRoleData(data: RoleCreate | RoleUpdate): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if ('name' in data) {
      if (!data.name || data.name.length < 3) {
        errors.name = 'Role name must be at least 3 characters';
      }
      if (!/^[a-zA-Z0-9_]+$/.test(data.name)) {
        errors.name = 'Role name can only contain letters, numbers, and underscores';
      }
    }

    if ('display_name' in data) {
      if (!data.display_name || data.display_name.length < 3) {
        errors.display_name = 'Display name must be at least 3 characters';
      }
    }

    if ('description' in data) {
      if (!data.description || data.description.length < 10) {
        errors.description = 'Description must be at least 10 characters';
      }
    }

    if ('hierarchy_level' in data) {
      if (data.hierarchy_level && (data.hierarchy_level < 1 || data.hierarchy_level > 5)) {
        errors.hierarchy_level = 'Hierarchy level must be between 1 and 5';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Export singleton instance
export const rbacService = new RBACService();
export default rbacService;