/**
 * Role-Based Action Buttons Component for SecureVault
 *
 * This component provides a collection of action buttons that automatically
 * show/hide and enable/disable based on user roles and permissions.
 * It's designed to be used throughout the application for consistent
 * role-based UI behavior.
 */

import React from 'react';
import {
  Edit,
  Trash2,
  Download,
  Share,
  Eye,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Shield,
  Settings,
  Upload,
  Copy,
  Archive,
  RotateCcw,
  MoreHorizontal,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key
} from 'lucide-react';
import {
  RoleBasedComponent,
  usePermissions,
  PermissionButton,
  AdminOnly,
  ManagerAndAbove,
  UserAndAbove,
  SystemAdminOnly
} from './RoleBasedComponent';

// Types for different action button configurations
interface BaseActionProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  tooltip?: string;
}

interface DocumentActionProps extends BaseActionProps {
  documentId: number;
  ownerId?: number;
  isEncrypted?: boolean;
  isShared?: boolean;
}

interface UserActionProps extends BaseActionProps {
  userId: number;
  targetUserHierarchyLevel?: number;
  isActive?: boolean;
}

interface SystemActionProps extends BaseActionProps {
  systemFunction: string;
  criticalAction?: boolean;
}

// Base button component with role-based styling
const ActionButton: React.FC<BaseActionProps & {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  requiredHierarchyLevel?: number;
}> = ({
  icon: Icon,
  children,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  size = 'md',
  variant = 'secondary',
  tooltip,
  requiredPermission,
  requiredRole,
  requiredHierarchyLevel
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <PermissionButton
      requiredPermission={requiredPermission}
      requiredRole={requiredRole}
      requiredHierarchyLevel={requiredHierarchyLevel}
      onClick={onClick}
      disabled={disabled || loading}
      title={tooltip}
      className={`
        inline-flex items-center space-x-2 rounded-lg font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {loading ? (
        <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${iconSizes[size]}`} />
      ) : (
        <Icon className={iconSizes[size]} />
      )}
      <span>{children}</span>
    </PermissionButton>
  );
};

// Document-related action buttons
export const DocumentActions: React.FC<DocumentActionProps & {
  actions?: ('view' | 'edit' | 'delete' | 'download' | 'share' | 'archive')[];
}> = ({
  documentId,
  ownerId,
  isEncrypted = false,
  isShared = false,
  actions = ['view', 'edit', 'delete', 'download', 'share'],
  ...baseProps
}) => {
  const { hierarchyLevel, hasPermission } = usePermissions();
  const isOwner = baseProps.onClick !== undefined; // Simplified ownership check

  return (
    <div className="flex items-center space-x-2">
      {actions.includes('view') && (
        <ActionButton
          icon={Eye}
          requiredPermission="documents:read"
          tooltip="View document"
          size="sm"
          {...baseProps}
        >
          View
        </ActionButton>
      )}

      {actions.includes('edit') && (
        <ActionButton
          icon={Edit}
          requiredPermission="documents:update"
          tooltip={isOwner ? "Edit document" : "Edit document (owner or manager access required)"}
          size="sm"
          variant="primary"
          {...baseProps}
        >
          Edit
        </ActionButton>
      )}

      {actions.includes('download') && (
        <ActionButton
          icon={Download}
          requiredPermission="documents:read"
          tooltip={isEncrypted ? "Download (requires decryption)" : "Download document"}
          size="sm"
          {...baseProps}
        >
          {isEncrypted ? 'Decrypt & Download' : 'Download'}
        </ActionButton>
      )}

      {actions.includes('share') && (
        <ManagerAndAbove fallback={null}>
          <ActionButton
            icon={Share}
            requiredPermission="documents:update"
            tooltip="Share document with other users"
            size="sm"
            {...baseProps}
          >
            Share
          </ActionButton>
        </ManagerAndAbove>
      )}

      {actions.includes('archive') && (
        <UserAndAbove fallback={null}>
          <ActionButton
            icon={Archive}
            requiredPermission="documents:update"
            tooltip="Archive document"
            size="sm"
            variant="warning"
            {...baseProps}
          >
            Archive
          </ActionButton>
        </UserAndAbove>
      )}

      {actions.includes('delete') && (
        <ActionButton
          icon={Trash2}
          requiredPermission="documents:delete"
          tooltip="Delete document"
          size="sm"
          variant="danger"
          {...baseProps}
        >
          Delete
        </ActionButton>
      )}
    </div>
  );
};

// User-related action buttons
export const UserActions: React.FC<UserActionProps & {
  actions?: ('view' | 'edit' | 'activate' | 'deactivate' | 'delete' | 'resetPassword' | 'assignRole')[];
}> = ({
  userId,
  targetUserHierarchyLevel = 1,
  isActive = true,
  actions = ['view', 'edit', 'activate', 'deactivate'],
  ...baseProps
}) => {
  const { hierarchyLevel } = usePermissions();
  const canManageUser = hierarchyLevel > targetUserHierarchyLevel;

  return (
    <div className="flex items-center space-x-2">
      {actions.includes('view') && (
        <ActionButton
          icon={Eye}
          requiredPermission="users:read"
          tooltip="View user profile"
          size="sm"
          {...baseProps}
        >
          View
        </ActionButton>
      )}

      {actions.includes('edit') && canManageUser && (
        <ActionButton
          icon={Edit}
          requiredPermission="users:update"
          tooltip="Edit user information"
          size="sm"
          variant="primary"
          {...baseProps}
        >
          Edit
        </ActionButton>
      )}

      {actions.includes('activate') && !isActive && canManageUser && (
        <ActionButton
          icon={UserPlus}
          requiredPermission="users:update"
          tooltip="Activate user account"
          size="sm"
          variant="success"
          {...baseProps}
        >
          Activate
        </ActionButton>
      )}

      {actions.includes('deactivate') && isActive && canManageUser && (
        <ActionButton
          icon={UserMinus}
          requiredPermission="users:update"
          tooltip="Deactivate user account"
          size="sm"
          variant="warning"
          {...baseProps}
        >
          Deactivate
        </ActionButton>
      )}

      {actions.includes('resetPassword') && canManageUser && (
        <ActionButton
          icon={Key}
          requiredPermission="users:update"
          tooltip="Force password reset"
          size="sm"
          {...baseProps}
        >
          Reset Password
        </ActionButton>
      )}

      {actions.includes('assignRole') && (
        <AdminOnly fallback={null}>
          <ActionButton
            icon={Shield}
            requiredPermission="roles:assign"
            tooltip="Assign roles to user"
            size="sm"
            {...baseProps}
          >
            Manage Roles
          </ActionButton>
        </AdminOnly>
      )}

      {actions.includes('delete') && canManageUser && targetUserHierarchyLevel < 4 && (
        <AdminOnly fallback={null}>
          <ActionButton
            icon={Trash2}
            requiredPermission="users:delete"
            tooltip="Delete user account (cannot be undone)"
            size="sm"
            variant="danger"
            {...baseProps}
          >
            Delete
          </ActionButton>
        </AdminOnly>
      )}
    </div>
  );
};

// System administration action buttons
export const SystemActions: React.FC<SystemActionProps & {
  actions?: ('settings' | 'backup' | 'restore' | 'maintenance' | 'logs' | 'security')[];
}> = ({
  systemFunction,
  criticalAction = false,
  actions = ['settings', 'logs'],
  ...baseProps
}) => {
  return (
    <div className="flex items-center space-x-2">
      {actions.includes('settings') && (
        <AdminOnly fallback={null}>
          <ActionButton
            icon={Settings}
            requiredPermission="system:admin"
            tooltip="System settings"
            size="sm"
            {...baseProps}
          >
            Settings
          </ActionButton>
        </AdminOnly>
      )}

      {actions.includes('logs') && (
        <AdminOnly fallback={null}>
          <ActionButton
            icon={Eye}
            requiredPermission="audit:read"
            tooltip="View system logs"
            size="sm"
            {...baseProps}
          >
            View Logs
          </ActionButton>
        </AdminOnly>
      )}

      {actions.includes('backup') && (
        <SystemAdminOnly fallback={null}>
          <ActionButton
            icon={Download}
            requiredRole="super_admin"
            tooltip="Create system backup"
            size="sm"
            variant="warning"
            {...baseProps}
          >
            Backup
          </ActionButton>
        </SystemAdminOnly>
      )}

      {actions.includes('restore') && (
        <SystemAdminOnly fallback={null}>
          <ActionButton
            icon={RotateCcw}
            requiredRole="super_admin"
            tooltip="Restore from backup"
            size="sm"
            variant="danger"
            {...baseProps}
          >
            Restore
          </ActionButton>
        </SystemAdminOnly>
      )}

      {actions.includes('maintenance') && (
        <SystemAdminOnly fallback={null}>
          <ActionButton
            icon={Settings}
            requiredRole="super_admin"
            tooltip="System maintenance mode"
            size="sm"
            variant={criticalAction ? 'danger' : 'warning'}
            {...baseProps}
          >
            Maintenance
          </ActionButton>
        </SystemAdminOnly>
      )}

      {actions.includes('security') && (
        <AdminOnly fallback={null}>
          <ActionButton
            icon={Shield}
            requiredPermission="system:admin"
            tooltip="Security settings"
            size="sm"
            {...baseProps}
          >
            Security
          </ActionButton>
        </AdminOnly>
      )}
    </div>
  );
};

// Quick action buttons for common operations
export const QuickActions: React.FC<{
  context: 'document' | 'user' | 'system';
  contextId?: number;
  onAction?: (action: string, id?: number) => void;
  size?: 'sm' | 'md' | 'lg';
}> = ({ context, contextId, onAction, size = 'sm' }) => {
  const handleAction = (action: string) => {
    onAction?.(action, contextId);
  };

  if (context === 'document') {
    return (
      <div className="flex items-center space-x-1">
        <UserAndAbove fallback={null}>
          <button
            onClick={() => handleAction('upload')}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Upload new document"
          >
            <Upload className="w-4 h-4" />
          </button>
        </UserAndAbove>

        <button
          onClick={() => handleAction('search')}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
          title="Search documents"
        >
          <Eye className="w-4 h-4" />
        </button>

        <ManagerAndAbove fallback={null}>
          <button
            onClick={() => handleAction('manage')}
            className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Manage documents"
          >
            <Settings className="w-4 h-4" />
          </button>
        </ManagerAndAbove>
      </div>
    );
  }

  if (context === 'user') {
    return (
      <div className="flex items-center space-x-1">
        <ManagerAndAbove fallback={null}>
          <button
            onClick={() => handleAction('view_users')}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="View users"
          >
            <Eye className="w-4 h-4" />
          </button>
        </ManagerAndAbove>

        <AdminOnly fallback={null}>
          <button
            onClick={() => handleAction('create_user')}
            className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Create new user"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </AdminOnly>

        <AdminOnly fallback={null}>
          <button
            onClick={() => handleAction('manage_roles')}
            className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
            title="Manage roles"
          >
            <Shield className="w-4 h-4" />
          </button>
        </AdminOnly>
      </div>
    );
  }

  if (context === 'system') {
    return (
      <div className="flex items-center space-x-1">
        <AdminOnly fallback={null}>
          <button
            onClick={() => handleAction('system_status')}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="System status"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </AdminOnly>

        <AdminOnly fallback={null}>
          <button
            onClick={() => handleAction('system_logs')}
            className="p-1 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
            title="System logs"
          >
            <Eye className="w-4 h-4" />
          </button>
        </AdminOnly>

        <SystemAdminOnly fallback={null}>
          <button
            onClick={() => handleAction('critical_settings')}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Critical system settings"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </SystemAdminOnly>
      </div>
    );
  }

  return null;
};

// Bulk action buttons for managing multiple items
export const BulkActions: React.FC<{
  selectedCount: number;
  context: 'documents' | 'users';
  onAction?: (action: string) => void;
}> = ({ selectedCount, context, onAction }) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-sm text-blue-800 font-medium">
        {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
      </span>

      <div className="flex items-center space-x-2 ml-4">
        {context === 'documents' && (
          <>
            <UserAndAbove fallback={null}>
              <ActionButton
                icon={Archive}
                requiredPermission="documents:update"
                onClick={() => onAction?.('archive')}
                size="sm"
                variant="warning"
              >
                Archive
              </ActionButton>
            </UserAndAbove>

            <ActionButton
              icon={Trash2}
              requiredPermission="documents:delete"
              onClick={() => onAction?.('delete')}
              size="sm"
              variant="danger"
            >
              Delete
            </ActionButton>
          </>
        )}

        {context === 'users' && (
          <>
            <AdminOnly fallback={null}>
              <ActionButton
                icon={UserPlus}
                requiredPermission="users:update"
                onClick={() => onAction?.('activate')}
                size="sm"
                variant="success"
              >
                Activate
              </ActionButton>
            </AdminOnly>

            <AdminOnly fallback={null}>
              <ActionButton
                icon={UserMinus}
                requiredPermission="users:update"
                onClick={() => onAction?.('deactivate')}
                size="sm"
                variant="warning"
              >
                Deactivate
              </ActionButton>
            </AdminOnly>

            <AdminOnly fallback={null}>
              <ActionButton
                icon={Key}
                requiredPermission="users:update"
                onClick={() => onAction?.('reset_passwords')}
                size="sm"
              >
                Reset Passwords
              </ActionButton>
            </AdminOnly>
          </>
        )}
      </div>
    </div>
  );
};

export { ActionButton };
export default DocumentActions;