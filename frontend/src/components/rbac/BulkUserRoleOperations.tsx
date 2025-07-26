/**
 * Bulk User Role Operations Component
 * 
 * Provides bulk operations for user role management including
 * bulk assignment, revocation, and role changes.
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Minus,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  X,
  FileText
} from 'lucide-react';

import { rbacService } from '../../services/rbacService';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { Role, BulkRoleAssignment, BulkRoleAssignmentResponse } from '../../types/rbac';

interface BulkUserRoleOperationsProps {
  selectedUserIds: number[];
  onOperationComplete?: () => void;
  onClose?: () => void;
}

interface BulkOperationResult {
  successful: number[];
  failed: Array<{ user_id: number; error: string }>;
  total_processed: number;
}

const BulkUserRoleOperations: React.FC<BulkUserRoleOperationsProps> = ({
  selectedUserIds,
  onOperationComplete,
  onClose
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [operation, setOperation] = useState<'assign' | 'revoke'>('assign');
  const [expiry, setExpiry] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BulkOperationResult | null>(null);
  const [error, setError] = useState<string>('');

  // Load available roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await rbacService.getRoles({ active_only: true });
        setRoles(response.roles as Role[]);
      } catch (err) {
        setError('Failed to load roles');
      }
    };
    loadRoles();
  }, []);

  const handleBulkAssign = async () => {
    if (!selectedRole || selectedUserIds.length === 0) return;

    setIsLoading(true);
    setError('');
    
    try {
      const assignment: BulkRoleAssignment = {
        user_ids: selectedUserIds,
        role_name: selectedRole,
        expires_at: expiry || undefined
      };

      const response = await rbacService.bulkAssignRoles(assignment);
      setResult(response);
      
      if (response.successful.length > 0) {
        onOperationComplete?.();
      }
    } catch (err) {
      setError('Bulk assignment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkRevoke = async () => {
    if (!selectedRole || selectedUserIds.length === 0) return;

    setIsLoading(true);
    setError('');

    try {
      const successful: number[] = [];
      const failed: Array<{ user_id: number; error: string }> = [];

      // Process each user individually for revocation
      for (const userId of selectedUserIds) {
        try {
          const role = roles.find(r => r.name === selectedRole);
          if (role) {
            await rbacService.revokeRoleFromUser(userId, role.id);
            successful.push(userId);
          }
        } catch (err) {
          failed.push({ user_id: userId, error: 'Revocation failed' });
        }
      }

      setResult({
        successful,
        failed,
        total_processed: selectedUserIds.length
      });

      if (successful.length > 0) {
        onOperationComplete?.();
      }
    } catch (err) {
      setError('Bulk revocation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedRole('');
    setExpiry('');
    setResult(null);
    setError('');
  };

  if (selectedUserIds.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Users Selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Select users to perform bulk role operations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Bulk Role Operations
            </h3>
            <p className="text-sm text-gray-600">
              Manage roles for {selectedUserIds.length} selected users
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="mb-6 space-y-4">
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Operation Completed
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Successfully processed {result.successful.length} of {result.total_processed} users</p>
                    {result.failed.length > 0 && (
                      <p>Failed: {result.failed.length} users</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {result.failed.length > 0 && (
              <div className="rounded-md bg-red-50 p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Failed Operations:</h4>
                <div className="text-xs text-red-700 space-y-1">
                  {result.failed.map((failure) => (
                    <div key={failure.user_id}>
                      User ID {failure.user_id}: {failure.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Perform Another Operation
              </button>
            </div>
          </div>
        )}

        {/* Operation Form */}
        {!result && (
          <div className="space-y-4">
            {/* Operation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operation Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="assign"
                    checked={operation === 'assign'}
                    onChange={(e) => setOperation(e.target.value as 'assign')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Assign Role</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="revoke"
                    checked={operation === 'revoke'}
                    onChange={(e) => setOperation(e.target.value as 'revoke')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Revoke Role</span>
                </label>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a role...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.display_name} (Level {role.hierarchy_level})
                  </option>
                ))}
              </select>
            </div>

            {/* Expiry Date (for assignments only) */}
            {operation === 'assign' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Warning */}
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {operation === 'assign' ? 'Bulk Assignment' : 'Bulk Revocation'} Warning
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This will {operation === 'assign' ? 'assign' : 'revoke'} the selected role 
                      {operation === 'assign' ? ' to' : ' from'} {selectedUserIds.length} users.
                    </p>
                    {operation === 'revoke' && (
                      <p className="mt-1">
                        This action cannot be easily undone. Users will lose access immediately.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={operation === 'assign' ? handleBulkAssign : handleBulkRevoke}
                disabled={!selectedRole || isLoading}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  operation === 'assign'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    {operation === 'assign' ? (
                      <Plus className="h-4 w-4 mr-2" />
                    ) : (
                      <Minus className="h-4 w-4 mr-2" />
                    )}
                    {operation === 'assign' ? 'Assign' : 'Revoke'} Role for {selectedUserIds.length} Users
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Operation Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Operation Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Selected Users</dt>
            <dd className="text-gray-900">{selectedUserIds.length}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Operation</dt>
            <dd className="text-gray-900 capitalize">{operation} Role</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Selected Role</dt>
            <dd className="text-gray-900">
              {selectedRole ? roles.find(r => r.name === selectedRole)?.display_name : 'None'}
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUserRoleOperations;