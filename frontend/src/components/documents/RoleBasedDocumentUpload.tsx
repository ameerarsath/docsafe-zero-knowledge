/**
 * Role-Based Document Upload Component for SecureVault
 *
 * This component wraps the DocumentUpload component with role-based access controls:
 * - Viewer: No upload access (completely hidden)
 * - User: Basic upload functionality to own folders
 * - Manager: Upload to any folder with additional controls
 * - Admin/Super_Admin: Full upload access with advanced features
 */

import React, { useState } from 'react';
import { Upload, Lock, Shield, AlertCircle } from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import {
  RoleBasedComponent,
  usePermissions,
  AdminOnly,
  ManagerAndAbove,
  UserAndAbove
} from '../rbac/RoleBasedComponent';

interface RoleBasedDocumentUploadProps {
  parentFolderId?: number | null;
  onUploadComplete?: (documents: any[]) => void;
  onClose?: () => void;
  className?: string;
}

export const RoleBasedDocumentUpload: React.FC<RoleBasedDocumentUploadProps> = (props) => {
  const { userRoles, hierarchyLevel, hasPermission } = usePermissions();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Role-specific configuration
  const getRoleConfig = () => {
    if (hierarchyLevel >= 4) { // Admin/Super_Admin
      return {
        maxFiles: 50,
        maxFileSize: 500 * 1024 * 1024, // 500MB
        showAdvancedOptions: true,
        canUploadToAnyFolder: true,
        canBulkUpload: true
      };
    } else if (hierarchyLevel >= 3) { // Manager
      return {
        maxFiles: 20,
        maxFileSize: 200 * 1024 * 1024, // 200MB
        showAdvancedOptions: true,
        canUploadToAnyFolder: true,
        canBulkUpload: false
      };
    } else if (hierarchyLevel >= 2) { // User
      return {
        maxFiles: 10,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        showAdvancedOptions: false,
        canUploadToAnyFolder: false,
        canBulkUpload: false
      };
    } else { // Viewer
      return null; // No upload access
    }
  };

  const roleConfig = getRoleConfig();

  // Viewer role - no access to upload functionality
  if (!roleConfig) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <Lock className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Not Available</h3>
        <p className="text-gray-600 mb-4">
          Your current role (Viewer) does not have permission to upload documents.
        </p>
        <button
          onClick={() => setShowUpgradePrompt(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Shield className="w-4 h-4 mr-2" />
          Request Access
        </button>

        {/* Upgrade Prompt Modal */}
        {showUpgradePrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-center">
                <Shield className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Upload Access</h3>
                <p className="text-gray-600 mb-4">
                  To upload documents, you need at least "User" role permissions. Please contact your administrator to upgrade your account.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUpgradePrompt(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement admin contact functionality
                      alert('Please contact your administrator at admin@company.com');
                      setShowUpgradePrompt(false);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Contact Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Role-specific upload restrictions notice */}
      <UserAndAbove>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900">Upload Permissions</h4>
              <div className="mt-1 text-sm text-blue-700">
                {hierarchyLevel >= 4 && (
                  <p>Administrator access: Upload up to {roleConfig.maxFiles} files ({Math.round(roleConfig.maxFileSize / (1024 * 1024))}MB each) to any location</p>
                )}
                {hierarchyLevel === 3 && (
                  <p>Manager access: Upload up to {roleConfig.maxFiles} files ({Math.round(roleConfig.maxFileSize / (1024 * 1024))}MB each) with folder management</p>
                )}
                {hierarchyLevel === 2 && (
                  <p>User access: Upload up to {roleConfig.maxFiles} files ({Math.round(roleConfig.maxFileSize / (1024 * 1024))}MB each) to your folders</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </UserAndAbove>

      {/* Main Document Upload Component with role-based restrictions */}
      <DocumentUpload
        {...props}
        maxFiles={roleConfig.maxFiles}
        maxFileSize={roleConfig.maxFileSize}
        className={`${props.className || ''} ${!roleConfig.showAdvancedOptions ? 'simple-mode' : ''}`}
      />

      {/* Advanced Upload Options - Admin/Manager Only */}
      <ManagerAndAbove>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Advanced Upload Options
          </h4>

          <div className="space-y-4">
            {/* Bulk Upload Toggle */}
            <AdminOnly>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enable Bulk Upload</label>
                  <p className="text-xs text-gray-500">Upload multiple files simultaneously with progress tracking</p>
                </div>
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  defaultChecked={roleConfig.canBulkUpload}
                />
              </div>
            </AdminOnly>

            {/* Folder Management */}
            {roleConfig.canUploadToAnyFolder && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Upload to Any Folder</label>
                  <p className="text-xs text-gray-500">Select any folder in the system as upload destination</p>
                </div>
                <span className="text-xs text-green-600 font-medium">Enabled</span>
              </div>
            )}

            {/* Auto-categorization - Admin Only */}
            <AdminOnly>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto-categorization</label>
                  <p className="text-xs text-gray-500">Automatically categorize documents based on content</p>
                </div>
                <select className="text-xs border border-gray-300 rounded px-2 py-1">
                  <option>Disabled</option>
                  <option>By File Type</option>
                  <option>By Content Analysis</option>
                  <option>By AI Classification</option>
                </select>
              </div>
            </AdminOnly>

            {/* Security Level - Manager and above */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Default Security Level</label>
                <p className="text-xs text-gray-500">Set default encryption and access level for uploads</p>
              </div>
              <select className="text-xs border border-gray-300 rounded px-2 py-1">
                <option>Standard</option>
                <option>High</option>
                <AdminOnly>
                  <option>Maximum</option>
                </AdminOnly>
              </select>
            </div>
          </div>
        </div>
      </ManagerAndAbove>

      {/* Upload Quota Display - All roles */}
      <UserAndAbove>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Upload Quota: {roleConfig.maxFiles} files, {Math.round(roleConfig.maxFileSize / (1024 * 1024))}MB each
            </div>
            <div className="text-xs text-gray-500">
              Role: {userRoles.join(', ')} (Level {hierarchyLevel})
            </div>
          </div>
        </div>
      </UserAndAbove>
    </div>
  );
};

export default RoleBasedDocumentUpload;