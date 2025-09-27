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
  ArrowRight,
  Download,
  History,
  Filter,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  Copy,
  Edit,
  Shield,
  UserCheck,
  Save,
  Loader2,
  Info,
  FileText,
  Lock,
  Unlock,
  RotateCw,
  Wifi,
  WifiOff
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
  const [state, setState] = useState<UserRoleAssignmentState & { lastError?: any }>({
    users: [] as UserWithRoles[],
    selectedUser: userId,
    availableRoles: [],
    isLoading: true,
    error: undefined,
    showAssignDialog: false,
    showBulkDialog: false,
    bulkSelection: [],
    lastError: undefined
  });

  // Retry mechanism for failed operations
  const retryFailedOperation = async (retryAttempt: number = 1, maxRetries: number = 3) => {
    const errorContext = state.lastError;
    
    if (!errorContext || !errorContext.canRetry) {
      console.warn('❌ No retryable error context available');
      return false;
    }

    if (retryAttempt > maxRetries) {
      console.error(`❌ Maximum retry attempts (${maxRetries}) exceeded`);
      setState(prev => ({
        ...prev,
        error: `Operation failed after ${maxRetries} attempts. ${errorContext.recoveryActions?.join('. ') || 'Please contact support.'}`
      }));
      return false;
    }

    console.log(`🔄 Retry attempt ${retryAttempt}/${maxRetries} for role assignment...`);
    
    try {
      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryAttempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Clear previous error
      setState(prev => ({ ...prev, error: undefined }));

      // Restore the failed operation context
      setEditingAssignment(errorContext.originalAssignment);
      setEditSelectedRole(errorContext.selectedRole);
      setEditExpiry(errorContext.expiry);
      setEditReason(errorContext.reason);
      setIsEditingSaving(true);

      // Retry the operation with error marker
      const retryError = new Error('Retry attempt');
      (retryError as any).isRetry = true;
      
      await handleSaveEditAssignment();
      
      console.log(`✅ Retry attempt ${retryAttempt} successful`);
      return true;
    } catch (error: any) {
      console.error(`❌ Retry attempt ${retryAttempt} failed:`, error);
      
      // If it's the last retry, give up
      if (retryAttempt >= maxRetries) {
        setState(prev => ({
          ...prev,
          error: `Operation failed after ${maxRetries} retry attempts. Original error: ${errorContext.originalError || 'Unknown'}. Please try refreshing the page or contact support.`
        }));
        return false;
      }
      
      // Try again
      return retryFailedOperation(retryAttempt + 1, maxRetries);
    } finally {
      setIsEditingSaving(false);
    }
  };

  // SingleRoleDisplay Component
  const SingleRoleDisplay: React.FC<{
    user: UserWithRoles;
    userRole: any;
    getRoleBadgeColor: (role: any) => string;
    handleEditAssignment: (userId: string, role: any) => void;
    handleRevokeRole: (userId: string, roleId: string) => void;
  }> = ({ user, userRole, getRoleBadgeColor, handleEditAssignment, handleRevokeRole }) => {
    const isExpiring = userRole.expires_at && new Date(userRole.expires_at) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const isExpired = userRole.expires_at && new Date(userRole.expires_at) < new Date();
    
    return (
      <div className="group relative">
        {/* Main Role Badge */}
        <div className="flex items-center space-x-2">
          <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border-2 shadow-sm transition-all duration-200 ${getRoleBadgeColor(userRole)} group-hover:shadow-md`}>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="font-semibold">{userRole.role.display_name}</span>
              <span className="text-xs opacity-75">(Level {userRole.role.hierarchy_level})</span>
              
              {/* Status indicators */}
              <div className="flex items-center space-x-1 ml-2">
                {!userRole.is_active && (
                  <div className="bg-red-500 bg-opacity-20 rounded-full p-1" title="Inactive role">
                    <X className="h-3 w-3 text-red-600" />
                  </div>
                )}
                {userRole.expires_at && (
                  <div className={`bg-opacity-20 rounded-full p-1 ${isExpired ? 'bg-red-500' : isExpiring ? 'bg-yellow-500' : 'bg-blue-500'}`} title="Role has expiry date">
                    <Clock className={`h-3 w-3 ${isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-blue-600'}`} />
                  </div>
                )}
              </div>
            </div>
            
          </div>

          {/* Status Badges */}
          <div className="flex items-center space-x-1">
            {isExpiring && !isExpired && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expiring Soon
              </span>
            )}
            
            {isExpired && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                Expired
              </span>
            )}
          </div>
        </div>
        
        {/* Enhanced Professional Tooltip */}
        <div className="absolute bottom-full left-0 mb-2 px-4 py-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-20 min-w-max transition-opacity duration-200">
          <div className="space-y-2">
            <div className="border-b border-gray-700 pb-2">
              <div className="font-semibold text-white">{userRole.role.display_name}</div>
              <div className="text-gray-300">Level {userRole.role.hierarchy_level} • Single Role Policy</div>
            </div>
            
            <div className="space-y-1 text-gray-300">
              <div className="flex items-center space-x-1 text-blue-400">
                <Shield className="h-3 w-3" />
                <span>Single Role Assignment</span>
              </div>
              {!userRole.is_active && (
                <div className="flex items-center space-x-1 text-red-400">
                  <X className="h-3 w-3" />
                  <span>Inactive</span>
                </div>
              )}
              {userRole.assigned_at && (
                <div><strong>Assigned:</strong> {new Date(userRole.assigned_at).toLocaleDateString()}</div>
              )}
              {userRole.expires_at && (
                <div className={isExpired ? 'text-red-400' : isExpiring ? 'text-yellow-400' : 'text-gray-300'}>
                  <strong>Expires:</strong> {new Date(userRole.expires_at).toLocaleDateString()}
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-700 pt-2 text-gray-400 text-xs">
              Use actions column to edit or remove role
            </div>
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expiring' | 'expired' | 'no_expiry'>('all');
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [assignmentExpiry, setAssignmentExpiry] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [bulkRole, setBulkRole] = useState<string>('');
  const [bulkExpiry, setBulkExpiry] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedUserHistory, setSelectedUserHistory] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Edit role assignment state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<any>(null);
  const [editingAssignment, setEditingAssignment] = useState<{
    userId: number;
    roleId: number;
    currentExpiry?: string;
    currentIsPrimary: boolean;
    roleName: string;
    userName: string;
  } | null>(null);
  const [editExpiry, setEditExpiry] = useState<string>('');
  // Removed editIsPrimary - single role policy means all roles are primary
  const [editSelectedRole, setEditSelectedRole] = useState<number | null>(null);
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [editReason, setEditReason] = useState<string>('');
  const [editValidationErrors, setEditValidationErrors] = useState<string[]>([]);

  // Load users and their role assignments
  const loadUsers = useCallback(async (forceRefresh = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      // Load users from the admin API with cache busting for forced refresh
      const { adminService } = await import('../../services/adminService');
      const queryParams = { 
        size: 100,
        ...(forceRefresh && { _t: Date.now() }) // Add timestamp to force cache refresh
      };
      const userResponse = await adminService.getUsers(queryParams);
      
      // Load roles for each user
      const usersWithRoles: UserWithRoles[] = await Promise.all(
        userResponse.users.map(async (user) => {
          try {
            const userRoles = await rbacService.getUserRoles(user.id);
            return {
              id: user.id,
              username: user.username,
              email: user.email,
              account_locked: !user.is_active,
              last_login: user.last_login,
              roles: userRoles.user_roles
            };
          } catch (error) {
            // If we can't load roles for this user, return with empty roles
            console.warn(`Failed to load roles for user ${user.username}:`, error);
            return {
              id: user.id,
              username: user.username,
              email: user.email,
              account_locked: !user.is_active,
              last_login: user.last_login,
              roles: []
            };
          }
        })
      );

      console.log(`📊 Loaded ${usersWithRoles.length} users with roles:`, usersWithRoles);
      setState(prev => ({
        ...prev,
        users: usersWithRoles,
        isLoading: false
      }));
    } catch (error: any) {
      let errorMessage = 'Failed to load users and role assignments';
      
      if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view user role assignments.';
      } else if (error?.status === 404) {
        errorMessage = 'User management API not found. Please contact your administrator.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred while loading users. Please try again later.';
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

  // Handle role assignment (single role per user)
  const handleAssignRole = async () => {
    if (!state.selectedUser || !selectedRole) return;

    const user = state.users.find(u => u.id === state.selectedUser);
    const newRoleName = state.availableRoles.find(r => r.id === selectedRole)?.display_name || 'role';
    const hasExistingRole = user?.roles && user.roles.length > 0;

    // If user has existing role, show confirmation for replacement
    if (hasExistingRole) {
      const currentRole = user.roles[0];
      setConfirmDialogData({
        type: 'replace',
        title: 'Replace User Role',
        message: `Replace ${user?.username}'s current role "${currentRole.role.display_name}" with "${newRoleName}"?`,
        details: {
          user: user?.username,
          currentRole: currentRole.role.display_name,
          newRole: newRoleName,
          isPrimary: isPrimary,
          expires: assignmentExpiry ? new Date(assignmentExpiry).toLocaleDateString() : 'Never',
          reason: 'Role replacement (single role policy)'
        },
        onConfirm: () => performRoleReplacement(state.selectedUser!, selectedRole, currentRole.role_id)
      });
      setShowConfirmDialog(true);
      return;
    }

    // If no existing role, proceed with normal assignment
    try {
      const assignment: UserRoleAssignment = {
        user_id: state.selectedUser,
        role_id: selectedRole,
        is_primary: true, // Always primary since it's the only role
        expires_at: assignmentExpiry || undefined
      };

      await rbacService.assignRoleToUser(state.selectedUser, assignment);
      
      setSuccessMessage(`Successfully assigned "${newRoleName}" role to ${user?.username}`);
      
      setState(prev => ({ ...prev, showAssignDialog: false }));
      setSelectedRole(null);
      setAssignmentExpiry('');
      setIsPrimary(false);
      
      await loadUsers();
      onAssignmentChange?.();
    } catch (error: any) {
      let errorMessage = 'Failed to assign role';
      
      if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to assign roles to users.';
      } else if (error?.status === 404) {
        errorMessage = 'User or role not found. They may have been deleted.';
      } else if (error?.status === 409) {
        errorMessage = 'Role assignment conflict. The user may already have this role.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred while assigning role. Please try again later.';
      } else if (error?.message?.includes('Network Error')) {
        errorMessage = 'Network connection failed. Please check your connection and try again.';
      }
      
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  };

  // Perform role replacement (remove old, assign new)
  const performRoleReplacement = async (userId: number, newRoleId: number, oldRoleId: number) => {
    const user = state.users.find(u => u.id === userId);
    const newRoleName = state.availableRoles.find(r => r.id === newRoleId)?.display_name || 'role';
    const oldRoleName = user?.roles.find(r => r.role_id === oldRoleId)?.role.display_name || 'role';

    try {
      // Remove ALL existing roles to enforce single role policy
      if (user && user.roles.length > 0) {
        for (const role of user.roles) {
          await rbacService.revokeRoleFromUser(userId, role.role_id);
        }
      }
      
      // Assign new role
      const assignment: UserRoleAssignment = {
        user_id: userId,
        role_id: newRoleId,
        is_primary: true, // Always primary since it's the only role
        expires_at: assignmentExpiry || undefined
      };

      await rbacService.assignRoleToUser(userId, assignment);
      
      setSuccessMessage(`Successfully replaced "${oldRoleName}" with "${newRoleName}" role for ${user?.username}`);
      
      setState(prev => ({ ...prev, showAssignDialog: false }));
      setSelectedRole(null);
      setAssignmentExpiry('');
      setIsPrimary(false);
      
      await loadUsers();
      onAssignmentChange?.();
    } catch (error: any) {
      let errorMessage = 'Failed to replace role';
      
      if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to modify user roles.';
      } else if (error?.status === 404) {
        errorMessage = 'User or role not found. They may have been deleted.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred while replacing role. Please try again later.';
      }
      
      setState(prev => ({ ...prev, error: errorMessage }));
    }
  };

  // Handle role revocation with confirmation
  const handleRevokeRole = (userId: string, roleId: string) => {
    const user = state.users.find(u => u.id === parseInt(userId));
    const userRole = user?.roles.find(r => r.role_id === parseInt(roleId));
    const roleName = userRole?.role.display_name || 'role';
    const isLastRole = user?.roles.length === 1;
    
    setConfirmDialogData({
      type: 'revoke',
      title: isLastRole ? 'Remove Last Role Assignment' : 'Revoke Role Assignment',
      message: isLastRole 
        ? `Remove the last role "${roleName}" from ${user?.username}? This user will have NO ROLES ASSIGNED.`
        : `Remove the "${roleName}" role from ${user?.username}?`,
      details: {
        user: user?.username,
        currentRole: roleName,
        newRole: isLastRole ? 'NO ROLES ASSIGNED' : 'Removed',
        isPrimary: userRole?.is_primary,
        expires: userRole?.expires_at ? new Date(userRole.expires_at).toLocaleDateString() : 'Never',
        reason: 'Role revocation',
        isLastRole: isLastRole
      },
      onConfirm: () => performRoleRevocation(userId, roleId)
    });
    setShowConfirmDialog(true);
  };

  // Perform actual role revocation
  const performRoleRevocation = async (userId: number, roleId: number) => {
    const user = state.users.find(u => u.id === userId);
    const roleName = user?.roles.find(r => r.role_id === roleId)?.role.display_name || 'role';
    const isLastRole = user?.roles.length === 1;
    
    try {
      await rbacService.revokeRoleFromUser(userId, roleId);
      
      if (isLastRole) {
        setSuccessMessage(`Successfully revoked "${roleName}" role from ${user?.username}. User now has NO ROLES ASSIGNED and may have limited access.`);
      } else {
        setSuccessMessage(`Successfully revoked "${roleName}" role from ${user?.username}`);
      }
      
      await loadUsers();
      onAssignmentChange?.();
    } catch (error: any) {
      let errorMessage = 'Failed to revoke role';
      
      if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to revoke roles from users.';
      } else if (error?.status === 404) {
        errorMessage = 'User or role assignment not found. It may have already been revoked.';
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred while revoking role. Please try again later.';
      }
      
      setState(prev => ({ ...prev, error: errorMessage }));
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
        setSuccessMessage(`Assigned to ${result.successful.length} users, failed for ${result.failed.length} users`);
      } else {
        setSuccessMessage(`Successfully assigned "${bulkRole}" role to ${result.successful.length} users`);
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

  // Handle edit role assignment
  const handleEditAssignment = (userId: string, userRole: any) => {
    const user = state.users.find(u => u.id === parseInt(userId));
    if (!user) return;
    
    setEditingAssignment({
      userId,
      roleId: userRole.role_id,
      currentExpiry: userRole.expires_at,
      currentIsPrimary: userRole.is_primary,
      roleName: userRole.role.display_name,
      userName: user.username
    });
    
    // Set edit form values
    setEditExpiry(userRole.expires_at ? new Date(userRole.expires_at).toISOString().slice(0, 16) : '');
    // Removed setEditIsPrimary - single role policy
    setEditSelectedRole(userRole.role_id); // Set current role as selected
    setEditReason(''); // Reset reason
    setEditValidationErrors([]); // Reset validation errors
    setShowEditDialog(true);
  };

  // Validate edit form
  const validateEditForm = (): string[] => {
    const errors: string[] = [];
    
    if (!editSelectedRole) {
      errors.push('Please select a role');
    }
    
    if (editExpiry) {
      const expiryDate = new Date(editExpiry);
      if (expiryDate <= new Date()) {
        errors.push('Expiry date must be in the future');
      }
    }
    
    if (!editReason.trim()) {
      errors.push('Please provide a reason for this change');
    }
    
    return errors;
  };

  // Handle edit form submission with validation
  const handleEditSubmit = () => {
    const errors = validateEditForm();
    setEditValidationErrors(errors);
    
    if (errors.length === 0) {
      // Show confirmation dialog
      const newRole = state.availableRoles.find(r => r.id === editSelectedRole);
      const isRoleChange = editSelectedRole !== editingAssignment?.roleId;
      
      setConfirmDialogData({
        type: 'edit',
        title: isRoleChange ? 'Confirm Role Change' : 'Confirm Role Update',
        message: isRoleChange 
          ? `Change ${editingAssignment?.userName}'s role from "${editingAssignment?.roleName}" to "${newRole?.display_name}"?`
          : `Update role assignment settings for ${editingAssignment?.userName}?`,
        details: {
          user: editingAssignment?.userName,
          currentRole: editingAssignment?.roleName,
          newRole: newRole?.display_name,
          isPrimary: true, // Always primary with single role policy
          expires: editExpiry ? new Date(editExpiry).toLocaleDateString() : 'Never',
          reason: editReason
        },
        onConfirm: handleSaveEditAssignment
      });
      setShowConfirmDialog(true);
    }
  };

  // Handle save edit assignment
  const handleSaveEditAssignment = async () => {
    if (!editingAssignment || !editSelectedRole) return;

    setIsEditingSaving(true);
    setShowConfirmDialog(false);

    try {
      // Get current user to identify current active role
      const user = state.users.find(u => u.id === editingAssignment.userId);
      
      // Find current active role for atomic replacement
      const activeRoles = user?.roles.filter(role => role.is_active) || [];
      const currentActiveRole = activeRoles.length > 0 ? activeRoles[0] : null;
      
      console.log(`🔄 Performing atomic role replacement for user ${editingAssignment.userId}`);
      console.log(`   Current active role: ${currentActiveRole?.role.display_name || 'None'} (ID: ${currentActiveRole?.role_id || 'N/A'})`);
      
      // Prepare new assignment data
      const newAssignment = {
        user_id: editingAssignment.userId,
        role_id: editSelectedRole,
        is_primary: true, // Always primary with single role policy
        expires_at: editExpiry || undefined
      };
      
      // Use atomic role replacement to prevent race conditions
      if (currentActiveRole) {
        // Replace existing active role atomically
        await rbacService.replaceUserRole(editingAssignment.userId, currentActiveRole.role_id, newAssignment);
        console.log(`   ✅ Atomic role replacement completed successfully`);
      } else {
        // No active role exists, just assign the new role
        await rbacService.assignRoleToUser(editingAssignment.userId, newAssignment);
        console.log(`   ✅ Role assignment completed successfully`);
      }
      
      // Get the new role name for success message
      const selectedRole = state.availableRoles.find(r => r.id === editSelectedRole);
      const newRoleName = selectedRole?.display_name || 'role';
      
      if (editSelectedRole === editingAssignment.roleId) {
        setSuccessMessage(`Successfully updated "${newRoleName}" role assignment for ${editingAssignment.userName}. Reason: ${editReason}`);
      } else {
        setSuccessMessage(`Successfully changed role from "${editingAssignment.roleName}" to "${newRoleName}" for ${editingAssignment.userName}. Reason: ${editReason}`);
      }
      
      // Immediate state update for better UX
      if (selectedRole) {
        setState(prev => ({
          ...prev,
          users: prev.users.map(u => 
            u.id === editingAssignment.userId 
              ? {
                  ...u,
                  roles: [{
                    user_id: u.id,
                    role_id: selectedRole.id,
                    role: selectedRole,
                    is_active: true,
                    is_primary: true,
                    assigned_at: new Date().toISOString(),
                    expires_at: editExpiry || null
                  }]
                }
              : u
          )
        }));
      }
      
      // Reset form
      setShowEditDialog(false);
      setEditingAssignment(null);
      setEditExpiry('');
      setEditSelectedRole(null);
      setEditReason('');
      setEditValidationErrors([]);
      
      // Add a small delay to ensure database transaction is committed, then refresh
      setTimeout(async () => {
        console.log('🔄 Refreshing user data after role change...');
        await loadUsers(true); // Force refresh with cache busting
        onAssignmentChange?.();
        console.log('✅ User data refresh completed');
      }, 500);
    } catch (error: any) {
      console.error('❌ Role assignment failed:', error);
      
      let errorMessage = 'Failed to update role assignment';
      let canRetry = false;
      let recoveryActions: string[] = [];
      
      // Enhanced error handling with recovery options
      if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to edit role assignments.';
        recoveryActions = ['Contact system administrator for permission', 'Check if your session has expired'];
      } else if (error?.status === 404) {
        errorMessage = 'User or role not found. They may have been deleted.';
        recoveryActions = ['Refresh the user list', 'Check if the role still exists'];
      } else if (error?.status === 409) {
        errorMessage = 'Role assignment conflict. The user may already have this role or another concurrent operation is in progress.';
        recoveryActions = ['Refresh user data and try again', 'Wait a moment and retry'];
        canRetry = true;
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred while updating role assignment.';
        recoveryActions = ['Try again in a few moments', 'Check system status'];
        canRetry = true;
      } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
        errorMessage = 'Network connection error. Please check your internet connection.';
        recoveryActions = ['Check internet connection', 'Retry the operation'];
        canRetry = true;
      } else if (error?.status === 422) {
        errorMessage = 'Invalid role assignment data. Please check your inputs.';
        recoveryActions = ['Verify role selection', 'Check expiry date format'];
      } else {
        errorMessage = `Unexpected error: ${error?.message || 'Unknown error occurred'}`;
        recoveryActions = ['Try refreshing the page', 'Contact support if problem persists'];
        canRetry = true;
      }
      
      // Store error details for potential retry
      const errorContext = {
        originalAssignment: editingAssignment,
        selectedRole: editSelectedRole,
        expiry: editExpiry,
        reason: editReason,
        timestamp: new Date().toISOString(),
        canRetry,
        recoveryActions
      };
      
      // Enhanced error state with recovery context
      setState(prev => ({ 
        ...prev, 
        error: `${errorMessage}${recoveryActions.length > 0 ? '\n\nSuggestions:\n• ' + recoveryActions.join('\n• ') : ''}`,
        lastError: errorContext
      }));
      
      // Attempt automatic recovery for certain error types
      if ((error?.status === 409 || error?.status === 500) && !error.isRetry) {
        console.log('🔄 Attempting automatic recovery by refreshing user data...');
        try {
          await loadUsers(true); // Force refresh
          console.log('✅ User data refreshed for error recovery');
        } catch (refreshError) {
          console.error('❌ Error recovery failed:', refreshError);
        }
      }
      
      // Close edit dialog on non-recoverable errors
      if (!canRetry) {
        setShowEditDialog(false);
        setEditingAssignment(null);
        setEditExpiry('');
        setEditSelectedRole(null);
        setEditReason('');
        setEditValidationErrors([]);
      }
    } finally {
      setIsEditingSaving(false);
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

    // Expiry filter
    if (expiryFilter !== 'all') {
      const hasExpiringRoles = user.roles.some(role => {
        if (!role.expires_at) return false;
        const expiryDate = new Date(role.expires_at);
        const daysFromNow = (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        return daysFromNow > 0 && daysFromNow <= 30;
      });
      
      const hasExpiredRoles = user.roles.some(role => {
        if (!role.expires_at) return false;
        return new Date(role.expires_at) < new Date();
      });
      
      const hasRolesWithoutExpiry = user.roles.some(role => !role.expires_at);

      if (expiryFilter === 'expiring' && !hasExpiringRoles) return false;
      if (expiryFilter === 'expired' && !hasExpiredRoles) return false;
      if (expiryFilter === 'no_expiry' && !hasRolesWithoutExpiry) return false;
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

  // Export user-role assignments
  const handleExportAssignments = () => {
    try {
      const exportData = state.users.map(user => ({
        username: user.username,
        email: user.email,
        account_locked: user.account_locked,
        last_login: user.last_login,
        roles: user.roles.map(role => ({
          role_name: role.role.name,
          display_name: role.role.display_name,
          hierarchy_level: role.role.hierarchy_level,
          is_primary: role.is_primary,
          is_active: role.is_active,
          assigned_at: role.assigned_at,
          expires_at: role.expires_at
        }))
      }));

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `user_role_assignments_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      setSuccessMessage('User role assignments exported successfully');
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to export assignments data' }));
    }
  };

  // Calculate analytics
  const getAnalytics = () => {
    const totalUsers = state.users.length;
    const usersWithRoles = state.users.filter(u => u.roles.length > 0).length;
    const usersWithoutRoles = totalUsers - usersWithRoles;
    
    const roleDistribution = state.availableRoles.map(role => ({
      role: role.display_name,
      count: state.users.filter(user => 
        user.roles.some(ur => ur.role.id === role.id && ur.is_active)
      ).length
    })).filter(item => item.count > 0);
    
    const expiringSoon = state.users.flatMap(user => 
      user.roles.filter(role => {
        if (!role.expires_at) return false;
        const expiryDate = new Date(role.expires_at);
        const daysFromNow = (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        return daysFromNow > 0 && daysFromNow <= 30; // Expiring within 30 days
      })
    ).length;

    return {
      totalUsers,
      usersWithRoles,
      usersWithoutRoles,
      roleDistribution,
      expiringSoon
    };
  };

  // Auto-clear success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

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
      {/* Enhanced Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Role Assignment</h1>
          <p className="text-gray-600">Manage role assignments for users</p>
        </div>
        <div className="flex space-x-3">
          {/* Analytics and Export buttons */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </button>
          <button
            onClick={handleExportAssignments}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => loadUsers(true)}
            disabled={state.isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${state.isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {showBulkOperations && state.bulkSelection.length > 0 && (
            <button
              onClick={openBulkDialog}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Users className="w-4 h-4 mr-2" />
              Bulk Assign ({state.bulkSelection.length})
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Success Message */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="bg-green-100 rounded-full p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <h3 className="text-sm font-semibold text-green-800">Operation Successful</h3>
              <div className="mt-1 text-sm text-green-700">{successMessage}</div>
              <div className="mt-2 text-xs text-green-600">
                Changes have been applied and logged for audit purposes.
              </div>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => setSuccessMessage('')}
                className="rounded-md bg-green-50 text-green-400 hover:text-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-green-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Error Alert */}
      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start">
            {/* Enhanced Error Icon */}
            <div className="flex-shrink-0">
              <div className="bg-red-100 rounded-full p-2">
                {state.error.includes('Network') || state.error.includes('connection') ? (
                  <WifiOff className="h-5 w-5 text-red-600" />
                ) : state.error.includes('Access denied') ? (
                  <Lock className="h-5 w-5 text-red-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>

            {/* Enhanced Error Content */}
            <div className="ml-3 w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-red-800">
                  {state.error.includes('Network') ? 'Connection Error' : 
                   state.error.includes('Access denied') ? 'Permission Denied' :
                   state.error.includes('Server error') ? 'Server Error' :
                   'Operation Failed'}
                </h3>
                
                {/* Error Timestamp */}
                <span className="text-xs text-red-500 font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>

              {/* Error Message with Better Formatting */}
              <div className="mt-2 text-sm text-red-700">
                {state.error.split('\n').map((line, index) => (
                  <div key={index} className={index > 0 ? 'mt-1' : ''}>
                    {line}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center space-x-3">
                {state.lastError?.canRetry && (
                  <button
                    onClick={() => retryFailedOperation()}
                    disabled={isEditingSaving}
                    className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isEditingSaving ? (
                      <Loader2 className="animate-spin h-3 w-3 mr-1" />
                    ) : (
                      <RotateCw className="h-3 w-3 mr-1" />
                    )}
                    {isEditingSaving ? 'Retrying...' : 'Retry Operation'}
                  </button>
                )}

                <button
                  onClick={async () => {
                    console.log('🔄 Refreshing user data from error panel...');
                    setState(prev => ({ ...prev, error: undefined }));
                    await loadUsers(true);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh Data
                </button>

                {/* Show Connection Status */}
                <div className="flex items-center text-xs text-red-600">
                  {navigator.onLine ? (
                    <><Wifi className="h-3 w-3 mr-1" />Connected</>
                  ) : (
                    <><WifiOff className="h-3 w-3 mr-1" />Offline</>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Close Button */}
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => setState(prev => ({ ...prev, error: undefined, lastError: undefined }))}
                className="rounded-md bg-red-50 text-red-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50 transition-colors duration-200 p-1"
                title="Close error message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Error ID for Support */}
          <div className="mt-3 pt-3 border-t border-red-200">
            <div className="text-xs text-red-500 font-mono">
              Error ID: {state.lastError?.timestamp ? 
                `${Date.now().toString(36)}-${state.lastError.timestamp.slice(-6)}` : 
                Date.now().toString(36)
              }
            </div>
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Role Assignment Analytics</h2>
            <button
              onClick={() => setShowAnalytics(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {(() => {
            const analytics = getAnalytics();
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Users */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900">{analytics.totalUsers}</p>
                    </div>
                  </div>
                </div>

                {/* Users with Roles */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <ShieldCheck className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">With Roles</p>
                      <p className="text-2xl font-bold text-green-900">{analytics.usersWithRoles}</p>
                    </div>
                  </div>
                </div>

                {/* Users without Roles */}
                <div className={`rounded-lg p-4 ${analytics.usersWithoutRoles > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                  <div className="flex items-center">
                    <div className={`rounded-full p-2 ${analytics.usersWithoutRoles > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                      <XCircle className={`h-6 w-6 ${analytics.usersWithoutRoles > 0 ? 'text-orange-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${analytics.usersWithoutRoles > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                        No Roles Assigned
                      </p>
                      <p className={`text-2xl font-bold ${analytics.usersWithoutRoles > 0 ? 'text-orange-900' : 'text-gray-900'}`}>
                        {analytics.usersWithoutRoles}
                      </p>
                      {analytics.usersWithoutRoles > 0 && (
                        <p className="text-xs text-orange-700 mt-1 font-medium">
                          ⚠️ Requires attention
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expiring Soon */}
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-red-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-600">Expiring Soon</p>
                      <p className="text-2xl font-bold text-red-900">{analytics.expiringSoon}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Role Distribution */}
          {(() => {
            const analytics = getAnalytics();
            return analytics.roleDistribution.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Role Distribution</h3>
                <div className="space-y-2">
                  {analytics.roleDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                      <span className="text-sm font-medium text-gray-700">{item.role}</span>
                      <span className="text-sm text-gray-600">{item.count} users</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
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

          {/* Expiry Filter */}
          <div className="min-w-0 sm:w-36">
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value as 'all' | 'expiring' | 'expired' | 'no_expiry')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Expiry</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="no_expiry">No Expiry</option>
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Clear Filters */}
            {(searchTerm || roleFilter || statusFilter !== 'all' || expiryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('');
                  setStatusFilter('all');
                  setExpiryFilter('all');
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All Filters
              </button>
            )}
            
            {/* Bulk Selection Controls */}
            {showBulkOperations && (
              <>
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
              </>
            )}
          </div>
          
          {/* Selection Count */}
          {showBulkOperations && state.bulkSelection.length > 0 && (
            <span className="text-sm text-gray-600">
              {state.bulkSelection.length} users selected
            </span>
          )}
          
          {/* Filter Status */}
          {(searchTerm || roleFilter || statusFilter !== 'all' || expiryFilter !== 'all') && (
            <span className="text-sm text-gray-500">
              Showing {filteredUsers.length} of {state.users.length} users
            </span>
          )}
        </div>
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
                        <div className="flex items-center space-x-3 py-2">
                          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg">
                            <div className="bg-gray-200 rounded-full p-2">
                              <XCircle className="h-4 w-4 text-gray-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700">No roles assigned</div>
                              <div className="text-xs text-gray-500">User has no active role assignments</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Limited Access</span>
                          </div>
                        </div>
                      ) : (
                        /* Single Role Display - Show active role only */
                        (() => {
                          // Filter for ACTIVE roles only, then show the highest level role (lowest hierarchy number)
                          const activeRoles = user.roles.filter(role => role.is_active);
                          const sortedActiveRoles = activeRoles.sort((a, b) => a.role.hierarchy_level - b.role.hierarchy_level);
                          const primaryRole = sortedActiveRoles.length > 0 ? sortedActiveRoles[0] : user.roles[0];
                          
                          return (
                            <div className="flex items-center space-x-2">
                              <SingleRoleDisplay 
                                user={user} 
                                userRole={primaryRole} 
                                getRoleBadgeColor={getRoleBadgeColor}
                                handleEditAssignment={handleEditAssignment}
                                handleRevokeRole={handleRevokeRole}
                              />
                            </div>
                          );
                        })()
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
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-1">
                      {(() => {
                        const activeRoles = user.roles.filter(role => role.is_active);
                        return activeRoles.length > 0 ? (
                          <>
                            {/* Edit Role Assignment Button */}
                            <button
                              onClick={() => handleEditAssignment(user.id, activeRoles[0])}
                              className="p-1.5 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="Edit role assignment"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {/* Remove Role Button */}
                            <button
                              onClick={() => handleRevokeRole(user.id, activeRoles[0].role_id)}
                              className="p-1.5 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Remove user role"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          /* No Active Role - Show Only Assign Button */
                          <button
                            onClick={() => openAssignDialog(user.id)}
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Assign role to user"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Assign
                          </button>
                        );
                      })()}
                    </div>
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
              {searchTerm || roleFilter || statusFilter !== 'all' || expiryFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'No users available for role assignment.'}
            </p>
          </div>
        )}
      </div>

      {/* Assign Role Dialog - Single Role Policy */}
      {state.showAssignDialog && !showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Assign User Role</h3>
                  <p className="text-sm text-gray-600">Each user can have only one role</p>
                </div>
                <button
                  onClick={() => setState(prev => ({ ...prev, showAssignDialog: false }))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {(() => {
                const user = state.users.find(u => u.id === state.selectedUser);
                const hasExistingRole = user?.roles && user.roles.length > 0;
                
                return (
                  <>
                    {/* User Info */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-md">
                      <div className="text-sm text-blue-800">
                        <div><strong>User:</strong> {user?.username}</div>
                        {hasExistingRole ? (
                          <div className="mt-1">
                            <strong>Current Role:</strong> {user?.roles[0]?.role.display_name}
                            <span className="ml-2 text-orange-700 font-medium">(will be replaced)</span>
                          </div>
                        ) : (
                          <div className="mt-1 text-gray-600">No current role assigned</div>
                        )}
                      </div>
                    </div>

                    {/* Warning for role replacement */}
                    {hasExistingRole && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-800">Role Replacement</p>
                            <p className="text-amber-700 mt-1">
                              This will replace the user's current role. Users can only have one role at a time.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              
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
                  <p className="mt-1 text-xs text-gray-500">
                    This will be the user's only role
                  </p>
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
                      min={new Date().toISOString().slice(0, 16)}
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
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Shield className="h-4 w-4" />
                  <span>
                    {(() => {
                      const user = state.users.find(u => u.id === state.selectedUser);
                      const hasExistingRole = user?.roles && user.roles.length > 0;
                      return hasExistingRole ? 'Replace Role' : 'Assign Role';
                    })()}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Edit Role Assignment Dialog */}
      {showEditDialog && editingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-8 mx-auto p-0 border-0 w-full max-w-2xl shadow-2xl rounded-lg bg-white">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white bg-opacity-20 rounded-full p-2">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Edit Role Assignment</h3>
                    <p className="text-blue-100 text-sm">Modify user permissions and access level</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditDialog(false)}
                  className="text-white hover:text-blue-200 transition-colors p-1"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* User Information Card */}
              <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 rounded-full p-3">
                    <UserCheck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">{editingAssignment.userName}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Shield className="h-4 w-4" />
                        <span>Current Role: <strong>{editingAssignment.roleName}</strong></span>
                      </div>
                      {editingAssignment.currentIsPrimary && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Errors */}
              {editValidationErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800">Please fix the following issues:</h4>
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                        {editValidationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <Shield className="h-4 w-4 inline mr-1" />
                      New Role Assignment
                    </label>
                    <select
                      value={editSelectedRole || ''}
                      onChange={(e) => setEditSelectedRole(parseInt(e.target.value))}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium"
                    >
                      <option value="">Choose a role...</option>
                      {state.availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.display_name} (Level {role.hierarchy_level})
                        </option>
                      ))}
                    </select>
                    {editSelectedRole && editSelectedRole !== editingAssignment.roleId && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center space-x-2 text-amber-800">
                          <Info className="h-4 w-4" />
                          <span className="text-sm font-medium">Role Change Detected</span>
                        </div>
                        <p className="text-xs text-amber-700 mt-1">
                          This will completely replace the user's current role assignment.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Single Role Policy Info */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Single Role Policy
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Each user can have only one role at a time. Changing roles will replace the current assignment.
                    </p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Assignment Expiry
                    </label>
                    <div className="relative">
                      <input
                        type="datetime-local"
                        value={editExpiry}
                        onChange={(e) => setEditExpiry(e.target.value)}
                        className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <Calendar className="absolute right-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="mt-2 space-y-1">
                      {editingAssignment.currentExpiry && (
                        <p className="text-xs text-gray-600">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Current expiry: {new Date(editingAssignment.currentExpiry).toLocaleDateString()}
                        </p>
                      )}
                      {!editExpiry && (
                        <p className="text-xs text-green-600">
                          <Info className="h-3 w-3 inline mr-1" />
                          No expiry - permanent assignment
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Change Reason */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <FileText className="h-4 w-4 inline mr-1" />
                      Reason for Change <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="Explain why this role assignment is being modified..."
                      rows={3}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be logged for audit purposes
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowEditDialog(false)}
                  disabled={isEditingSaving}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={isEditingSaving}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isEditingSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isEditingSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmDialogData && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-[100]">
          <div className="relative top-20 mx-auto p-0 border-0 w-full max-w-lg shadow-2xl rounded-lg bg-white">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-lg px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 rounded-full p-2">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{confirmDialogData.title}</h3>
                  <p className="text-orange-100 text-sm">This action requires confirmation</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 font-medium">{confirmDialogData.message}</p>
              </div>

              {/* Change Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
                <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Change Summary
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">User:</span>
                    <div className="font-medium text-gray-900">{confirmDialogData.details?.user}</div>
                  </div>
                  
                  {confirmDialogData.details?.currentRole !== confirmDialogData.details?.newRole && (
                    <>
                      <div>
                        <span className="text-gray-500">Current Role:</span>
                        <div className="font-medium text-gray-900">{confirmDialogData.details?.currentRole}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">New Role:</span>
                        <div className="font-medium text-blue-600">{confirmDialogData.details?.newRole}</div>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <span className="text-gray-500">Role Type:</span>
                    <div className="font-medium text-gray-900">
                      Primary Role (Single Role Policy)
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-500">Expires:</span>
                    <div className="font-medium text-gray-900">{confirmDialogData.details?.expires}</div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500 text-sm">Reason:</span>
                  <div className="font-medium text-gray-900 text-sm mt-1 p-2 bg-white rounded border">
                    {confirmDialogData.details?.reason}
                  </div>
                </div>
              </div>

              {/* Warning for role changes */}
              {confirmDialogData.details?.currentRole !== confirmDialogData.details?.newRole && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-red-800">Critical Change Warning</p>
                      <p className="text-red-700 mt-1">
                        This will completely replace the user's role and may immediately affect their access permissions. 
                        Ensure this change is intentional and properly authorized.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Special warning for removing last role */}
              {confirmDialogData.details?.isLastRole && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="bg-orange-100 rounded-full p-2">
                      <XCircle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="text-sm">
                      <p className="font-bold text-orange-800">REMOVING LAST ROLE</p>
                      <p className="text-orange-700 mt-1 font-medium">
                        This user will have <strong>NO ROLES ASSIGNED</strong> after this action.
                      </p>
                      <ul className="text-orange-700 mt-2 space-y-1 text-xs">
                        <li>• User may lose access to most system features</li>
                        <li>• User will only have basic login capabilities</li>
                        <li>• You will need to assign a new role to restore access</li>
                        <li>• This action should be used with extreme caution</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmDialogData.onConfirm();
                    setShowConfirmDialog(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center space-x-2"
                >
                  <Shield className="h-4 w-4" />
                  <span>Confirm Change</span>
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