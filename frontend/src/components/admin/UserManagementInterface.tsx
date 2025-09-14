/**
 * User Management Interface Component for SecureVault Admin
 * 
 * Comprehensive user management with:
 * - User list with advanced search and filtering
 * - User creation and editing forms with validation
 * - Bulk user operations (activate, deactivate, reset passwords)
 * - User activity monitoring and statistics
 * - Role assignment and permission management
 * - Export functionality for user data
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Filter,
  RefreshCw,
  UserCheck,
  UserX,
  Key,
  Shield,
  MoreHorizontal,
  Calendar,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings
} from 'lucide-react';
import {
  adminService,
  User,
  UserCreate,
  UserUpdate,
  UserActivity,
  BulkOperation
} from '../../services/adminService';
import { LoadingSpinner } from '../ui';

interface Props {
  onUserSelect?: (user: User) => void;
  onBulkOperation?: (operation: string, userIds: number[]) => void;
}

type ViewMode = 'list' | 'grid' | 'cards';
type FilterMode = 'all' | 'active' | 'inactive' | 'verified' | 'unverified';

export default function UserManagementInterface({ onUserSelect, onBulkOperation }: Props) {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Modal states
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingActivity, setViewingActivity] = useState<User | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  
  // Form state
  const [userForm, setUserForm] = useState<UserCreate>({
    username: '',
    email: '',
    password: '',
    encryption_password: '',
    is_active: true,
    is_verified: false
  });

  /**
   * Extract user-friendly error message and field errors from various error formats
   */
  const extractErrorMessage = useCallback((err: any, defaultMessage: string): string => {
    console.log('Error object received:', err); // Debug logging
    
    // Clear previous field errors first
    setFieldErrors({});
    
    if (typeof err === 'string') {
      return err;
    }
    
    // Handle direct error detail from API response
    if (err?.detail && typeof err.detail === 'string') {
      // Check for field-specific error patterns in the detail message
      const detail = err.detail;
      if (detail.includes('username') && (detail.includes('already exists') || detail.includes('already taken') || detail.includes('unique'))) {
        setFieldErrors({ username: 'This username is already taken. Please choose a different username.' });
        return detail;
      }
      if (detail.includes('email') && (detail.includes('already exists') || detail.includes('already taken') || detail.includes('unique'))) {
        setFieldErrors({ email: 'This email address is already registered. Please use a different email.' });
        return detail;
      }
      if (detail.includes('Username or email already exists')) {
        // We need to determine which field is the problem - let's check both
        setFieldErrors({ 
          username: 'Username may already be taken',
          email: 'Email may already be registered'
        });
        return detail;
      }
      return detail;
    }
    
    if (err?.message && typeof err.message === 'string') {
      return err.message;
    }
    
    if (err?.error?.detail) {
      return err.error.detail;
    }
    
    if (err?.response?.data?.detail) {
      return err.response.data.detail;
    }
    
    // Handle validation errors and field-specific errors
    if (err?.response?.data?.field_errors) {
      const apiFieldErrors = err.response.data.field_errors;
      const newFieldErrors: {[key: string]: string} = {};
      
      Object.entries(apiFieldErrors).forEach(([field, errors]: [string, any]) => {
        const errorArray = Array.isArray(errors) ? errors : [errors];
        newFieldErrors[field] = errorArray.join(', ');
      });
      
      setFieldErrors(newFieldErrors);
      
      const errorMessages = Object.entries(apiFieldErrors)
        .map(([field, errors]: [string, any]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
        .join('; ');
      return errorMessages || defaultMessage;
    }
    
    // Handle status code specific messages with context-aware responses
    if (err?.status_code || err?.response?.status) {
      const statusCode = err.status_code || err.response?.status;
      switch (statusCode) {
        case 400:
          // Check if it's a user creation conflict
          if (defaultMessage.includes('create user') || defaultMessage.includes('Failed to create user')) {
            return 'Invalid user data. Please check that all required fields are filled correctly.';
          }
          return 'Invalid request. Please check your input and try again.';
        case 401:
          return 'You are not authorized to perform this action. Please login again.';
        case 403:
          return 'Access denied. You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 409:
          // Check if it's specifically about user creation
          if (defaultMessage.includes('create user') || defaultMessage.includes('Failed to create user')) {
            // Set generic field errors for username/email conflicts
            setFieldErrors({ 
              username: 'This username may already be taken',
              email: 'This email may already be registered'
            });
            return 'User already exists. A user with this username or email is already registered.';
          }
          return 'A conflict occurred. This item may already exist.';
        case 422:
          // Check if we have specific validation details
          if (defaultMessage.includes('create user')) {
            return 'User creation failed. Please check that the username and email are unique and passwords meet requirements.';
          }
          return 'Validation failed. Please check your input and try again.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Internal server error. Please try again later or contact support.';
        default:
          return `Server error (${statusCode}). Please try again later.`;
      }
    }
    
    // Network or other errors
    if (err?.code === 'NETWORK_ERROR' || err?.message?.includes('Network Error')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }
    
    // Look for common error patterns in the error object
    const errorString = JSON.stringify(err);
    if (errorString.includes('already exists') || errorString.includes('already registered')) {
      setFieldErrors({ 
        username: 'This username may already be taken',
        email: 'This email may already be registered'
      });
      return 'User already exists. A user with this username or email is already registered.';
    }
    if (errorString.includes('duplicate') || errorString.includes('unique constraint')) {
      setFieldErrors({ 
        username: 'Username must be unique',
        email: 'Email must be unique'
      });
      return 'User already exists. Username or email must be unique.';
    }
    if (errorString.includes('validation')) {
      return 'Validation failed. Please check your input and try again.';
    }
    
    return defaultMessage;
  }, []);

  /**
   * Fetch users from API
   */
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params: any = {
        page: currentPage,
        size: pageSize
      };
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      if (filterMode === 'active') params.is_active = true;
      if (filterMode === 'inactive') params.is_active = false;
      
      const response = await adminService.getUsers(params);
      setUsers(response.users);
      setTotalUsers(response.total);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to load users'));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, filterMode, extractErrorMessage]);

  // Load users on component mount and dependency changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  /**
   * Handle search submission
   */
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Handle user selection
   */
  const handleUserSelect = useCallback((userId: number) => {
    setSelectedUsers(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(userId)) {
        newSelection.delete(userId);
      } else {
        newSelection.add(userId);
      }
      
      // Update selectAll state based on new selection
      setSelectAll(newSelection.size === users.length && users.length > 0);
      
      return newSelection;
    });
  }, [users.length]);

  /**
   * Handle select all toggle
   */
  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedUsers(new Set());
      setSelectAll(false);
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
      setSelectAll(true);
    }
  }, [selectAll, users]);

  /**
   * Handle user creation
   */
  const handleCreateUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic client-side validation
    if (!userForm.username.trim()) {
      setError('Username is required');
      return;
    }
    if (!userForm.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!userForm.password) {
      setError('Login password is required');
      return;
    }
    if (!userForm.encryption_password) {
      setError('Encryption password is required for zero-knowledge security');
      return;
    }
    if (userForm.password === userForm.encryption_password) {
      setError('Login password and encryption password must be different for security');
      return;
    }
    
    try {
      setError(null); // Clear any previous errors
      setSuccess(null); // Clear any previous success messages
      setFieldErrors({}); // Clear any previous field errors
      await adminService.createUser(userForm);
      
      // Success - close modal and refresh list
      setShowCreateUser(false);
      setUserForm({
        username: '',
        email: '',
        password: '',
        encryption_password: '',
        is_active: true,
        is_verified: false
      });
      setSuccess(`User "${userForm.username}" has been created successfully with zero-knowledge encryption enabled.`);
      fetchUsers();
      
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to create user'));
    }
  }, [userForm, fetchUsers, extractErrorMessage]);

  /**
   * Handle user update
   */
  const handleUpdateUser = useCallback(async (userId: number, updateData: UserUpdate) => {
    try {
      setError(null); // Clear any previous errors
      setSuccess(null); // Clear any previous success messages
      await adminService.updateUser(userId, updateData);
      setEditingUser(null);
      setSuccess('User information updated successfully.');
      fetchUsers();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to update user'));
    }
  }, [fetchUsers, extractErrorMessage]);

  /**
   * Handle user deletion
   */
  const handleDeleteUser = useCallback(async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      setError(null); // Clear any previous errors
      setSuccess(null); // Clear any previous success messages
      await adminService.deleteUser(userId);
      setSuccess('User deleted successfully.');
      fetchUsers();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to delete user'));
    }
  }, [fetchUsers, extractErrorMessage]);

  /**
   * Handle bulk operations
   */
  const handleBulkOperation = useCallback(async (operation: BulkOperation['operation']) => {
    if (selectedUsers.size === 0) {
      setError('No users selected for bulk operation');
      return;
    }
    
    const operationLabels = {
      activate: 'activate',
      deactivate: 'deactivate', 
      force_password_reset: 'reset passwords for',
      enable_mfa: 'enable MFA for'
    };
    
    const confirmMessage = `Are you sure you want to ${operationLabels[operation]} ${selectedUsers.size} user(s)?`;
    if (!confirm(confirmMessage)) return;
    
    try {
      setError(null); // Clear any previous errors
      setSuccess(null); // Clear any previous success messages
      const result = await adminService.bulkUserOperation({
        operation,
        user_ids: Array.from(selectedUsers)
      });
      
      // Show results based on success/failure
      if (result.failed && result.failed.length > 0) {
        const failedCount = result.failed.length;
        const successCount = result.successful.length;
        if (successCount > 0) {
          setError(`Bulk operation partially completed: ${successCount} successful, ${failedCount} failed. Some users may not have been processed.`);
        } else {
          setError(`Bulk operation failed for all ${failedCount} users. Please check user permissions and try again.`);
        }
      } else {
        const userCount = result.successful.length;
        setSuccess(`Successfully ${operationLabels[operation]} ${userCount} user${userCount !== 1 ? 's' : ''}.`);
      }
      
      // Store selected users before clearing for callback
      const processedUserIds = Array.from(selectedUsers);
      
      setSelectedUsers(new Set());
      setSelectAll(false);
      fetchUsers();
      onBulkOperation?.(operation, processedUserIds);
    } catch (err: any) {
      setError(extractErrorMessage(err, `Failed to perform bulk ${operationLabels[operation]} operation`));
    }
  }, [selectedUsers, fetchUsers, onBulkOperation, extractErrorMessage]);

  /**
   * Handle user activity view
   */
  const handleViewActivity = useCallback(async (user: User) => {
    try {
      setError(null); // Clear any previous errors
      setViewingActivity(user);
      const activity = await adminService.getUserActivity(user.id);
      setUserActivity(activity);
    } catch (err: any) {
      setError(extractErrorMessage(err, `Failed to load activity for user ${user.username}`));
      setViewingActivity(null); // Close modal on error
    }
  }, [extractErrorMessage]);

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Get user status badge
   */
  const getUserStatusBadge = (user: User) => {
    if (!user.is_active) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Inactive</span>;
    }
    if (!user.is_verified) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Unverified</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Active</span>;
  };

  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage user accounts, permissions, and activity</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setShowCreateUser(true);
              setFieldErrors({}); // Clear field errors when opening modal
              setError(null); // Clear general errors
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </button>
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name, email, or username..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </form>

          {/* Filters */}
          <div className="flex items-center space-x-3">
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Users</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="text-sm text-blue-800">
              {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkOperation('activate')}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkOperation('deactivate')}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Deactivate
              </button>
              <button
                onClick={() => handleBulkOperation('force_password_reset')}
                className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
              >
                Reset Passwords
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
              aria-label="Dismiss error"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Success</span>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-400 hover:text-green-600 transition-colors"
              aria-label="Dismiss success message"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <p className="text-green-700 mt-1">{success}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MFA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleUserSelect(user.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.username}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getUserStatusBadge(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? formatDate(user.last_login) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_mfa_enabled ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewActivity(user)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Activity"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-gray-600 hover:text-gray-800"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {users.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {error ? 'Unable to load users' : 'No users found'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {error ? (
                    'There was an error loading users. Please try refreshing the page.'
                  ) : searchQuery || filterMode !== 'all' ? (
                    'No users match your current search or filters. Try adjusting your criteria.'
                  ) : (
                    'No users have been created yet. Get started by creating your first user.'
                  )}
                </p>
                {!error && (
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First User
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
                        {' '}-{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * pageSize, totalUsers)}
                        </span>
                        {' '}of{' '}
                        <span className="font-medium">{totalUsers}</span>
                        {' '}results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateUser} className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => {
                      setUserForm(prev => ({ ...prev, username: e.target.value }));
                      // Clear field error when user starts typing
                      if (fieldErrors.username) {
                        setFieldErrors(prev => ({ ...prev, username: '' }));
                      }
                    }}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.username ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {fieldErrors.username && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {fieldErrors.username}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => {
                      setUserForm(prev => ({ ...prev, email: e.target.value }));
                      // Clear field error when user starts typing
                      if (fieldErrors.email) {
                        setFieldErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Login Password</label>
                  <input
                    type="password"
                    required
                    value={userForm.password}
                    onChange={(e) => {
                      setUserForm(prev => ({ ...prev, password: e.target.value }));
                      // Clear field error when user starts typing
                      if (fieldErrors.password) {
                        setFieldErrors(prev => ({ ...prev, password: '' }));
                      }
                    }}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {fieldErrors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Encryption Password 
                    <span className="text-xs text-gray-500 ml-1">(for zero-knowledge document encryption)</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={userForm.encryption_password}
                    onChange={(e) => {
                      setUserForm(prev => ({ ...prev, encryption_password: e.target.value }));
                      // Clear field error when user starts typing
                      if (fieldErrors.encryption_password) {
                        setFieldErrors(prev => ({ ...prev, encryption_password: '' }));
                      }
                    }}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.encryption_password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter encryption password for secure document storage"
                  />
                  {fieldErrors.encryption_password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {fieldErrors.encryption_password}
                    </p>
                  )}
                </div>
                
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userForm.is_active}
                      onChange={(e) => setUserForm(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userForm.is_verified}
                      onChange={(e) => setUserForm(prev => ({ ...prev, is_verified: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Verified</span>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUser(false);
                    setFieldErrors({}); // Clear field errors when closing modal
                    setError(null); // Clear general errors
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const updateData: UserUpdate = {
                email: formData.get('email') as string,
                is_active: formData.get('is_active') === 'on',
                is_verified: formData.get('is_verified') === 'on'
              };
              if (formData.get('password')) {
                updateData.password = formData.get('password') as string;
              }
              handleUpdateUser(editingUser.id, updateData);
            }} className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User: {editingUser.username}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingUser.email}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    name="password"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={editingUser.is_active}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_verified"
                      defaultChecked={editingUser.is_verified}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Verified</span>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Activity Modal */}
      {viewingActivity && userActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  User Activity: {viewingActivity.username}
                </h3>
                <button
                  onClick={() => {
                    setViewingActivity(null);
                    setUserActivity(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Total Actions</div>
                    <div className="text-xl font-bold text-gray-900">
                      {userActivity.statistics.total_actions}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Documents Accessed</div>
                    <div className="text-xl font-bold text-gray-900">
                      {userActivity.statistics.documents_accessed}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
                  <div className="space-y-2">
                    {userActivity.recent_activity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${activity.success ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-sm text-gray-900">{activity.action}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(activity.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}