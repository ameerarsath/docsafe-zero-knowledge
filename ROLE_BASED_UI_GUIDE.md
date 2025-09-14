# Role-Based UI Implementation Guide

This guide explains how to use the comprehensive role-based UI system implemented in SecureVault. The system provides conditional rendering, action buttons, navigation, and layout components that adapt based on user roles and permissions.

## Table of Contents

1. [Overview](#overview)
2. [Role Hierarchy](#role-hierarchy)
3. [Core Components](#core-components)
4. [Implementation Examples](#implementation-examples)
5. [Component Reference](#component-reference)
6. [Testing and Development](#testing-and-development)

## Overview

The role-based UI system in SecureVault provides:

- **Conditional Component Rendering**: Show/hide components based on roles and permissions
- **Adaptive Navigation**: Navigation menus that change based on user access levels
- **Role-Based Actions**: Action buttons that appear only when users have appropriate permissions
- **Dynamic Layouts**: Full application layouts that adapt to different user roles
- **Permission-Based Forms**: Form fields and options that vary by role

### Key Benefits

- **Security**: UI elements for restricted actions are completely hidden from unauthorized users
- **User Experience**: Clean, uncluttered interface showing only relevant features
- **Consistency**: Standardized approach to role-based UI across the application
- **Maintainability**: Centralized permission logic that's easy to update

## Role Hierarchy

SecureVault uses a 5-tier role hierarchy system:

| Level | Role | Description | Key Capabilities |
|-------|------|-------------|------------------|
| 1 | **Viewer** | Read-only access | View shared documents |
| 2 | **User** | Basic user access | Upload, manage own documents |
| 3 | **Manager** | Team management | Manage team documents, view reports |
| 4 | **Admin** | System administration | User management, system configuration |
| 5 | **Super Admin** | Full system control | All capabilities including security settings |

### Permission System

Permissions follow the format `resource:action`:
- `documents:read` - View documents
- `documents:create` - Upload new documents
- `documents:update` - Modify documents
- `documents:delete` - Delete documents
- `users:read` - View user information
- `users:create` - Create new users
- `users:update` - Modify user accounts
- `users:delete` - Delete user accounts
- `roles:read` - View role information
- `roles:create` - Create new roles
- `roles:update` - Modify roles
- `roles:delete` - Delete roles
- `system:admin` - System administration access

## Core Components

### 1. PermissionProvider

Wraps your application to provide permission context:

```tsx
import { PermissionProvider } from '../components/rbac/RoleBasedComponent';

function App() {
  return (
    <PermissionProvider>
      <YourAppContent />
    </PermissionProvider>
  );
}
```

### 2. RoleBasedComponent

The core component for conditional rendering:

```tsx
import { RoleBasedComponent } from '../components/rbac/RoleBasedComponent';

// Show only for users with specific permission
<RoleBasedComponent requiredPermission="documents:create">
  <UploadButton />
</RoleBasedComponent>

// Show only for specific role
<RoleBasedComponent requiredRole="admin">
  <AdminPanel />
</RoleBasedComponent>

// Show only for users at or above hierarchy level
<RoleBasedComponent requiredHierarchyLevel={3}>
  <ManagerFeatures />
</RoleBasedComponent>

// Show fallback content for unauthorized users
<RoleBasedComponent
  requiredPermission="users:create"
  fallback={<p>You don't have permission to create users.</p>}
>
  <CreateUserButton />
</RoleBasedComponent>
```

### 3. Convenience Components

Pre-configured components for common scenarios:

```tsx
import {
  AdminOnly,
  ManagerAndAbove,
  UserAndAbove,
  SystemAdminOnly
} from '../components/rbac/RoleBasedComponent';

// Admin-only features
<AdminOnly>
  <UserManagementPanel />
</AdminOnly>

// Manager and above
<ManagerAndAbove>
  <TeamReports />
</ManagerAndAbove>

// User and above (excludes viewers)
<UserAndAbove>
  <DocumentUpload />
</UserAndAbove>

// Super admin only
<SystemAdminOnly>
  <SystemMaintenance />
</SystemAdminOnly>
```

### 4. usePermissions Hook

Access permission data in your components:

```tsx
import { usePermissions } from '../components/rbac/RoleBasedComponent';

function MyComponent() {
  const {
    userRoles,
    hierarchyLevel,
    hasPermission,
    hasRole,
    userPermissions,
    isLoading
  } = usePermissions();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <p>Your roles: {userRoles.join(', ')}</p>
      <p>Hierarchy level: {hierarchyLevel}</p>

      {hasPermission('documents:create') && (
        <button>Upload Document</button>
      )}

      {hasRole('admin') && (
        <AdminButton />
      )}
    </div>
  );
}
```

## Implementation Examples

### Example 1: Role-Based Document Actions

```tsx
import { DocumentActions } from '../components/rbac/RoleBasedActionButtons';

function DocumentCard({ document, onAction }) {
  return (
    <div className="document-card">
      <h3>{document.name}</h3>
      <DocumentActions
        documentId={document.id}
        isEncrypted={document.isEncrypted}
        ownerId={document.ownerId}
        actions={['view', 'edit', 'delete', 'download', 'share']}
        onClick={(action) => onAction(action, document.id)}
      />
    </div>
  );
}
```

### Example 2: Role-Based Navigation

```tsx
import { RoleBasedNavigation } from '../components/navigation/RoleBasedNavigation';

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <RoleBasedNavigation
        mode="sidebar"
        currentPath={window.location.pathname}
        onNavigate={(path) => navigate(path)}
        onLogout={() => logout()}
      />
      <main>{children}</main>
    </div>
  );
}
```

### Example 3: Role-Based Content

```tsx
import { RoleBasedContent } from '../components/rbac/RoleBasedComponent';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <RoleBasedContent
        viewer={
          <div>
            <h2>Document Viewer</h2>
            <p>Browse available documents</p>
          </div>
        }
        user={
          <div>
            <h2>Document Management</h2>
            <p>Upload and manage your documents</p>
            <UploadButton />
          </div>
        }
        manager={
          <div>
            <h2>Team Dashboard</h2>
            <p>Manage your team's documents and view reports</p>
            <TeamStats />
          </div>
        }
        admin={
          <div>
            <h2>Administration</h2>
            <p>Full system administration capabilities</p>
            <AdminPanel />
          </div>
        }
        superAdmin={
          <div>
            <h2>Super Administration</h2>
            <p>Complete system control</p>
            <SystemControls />
          </div>
        }
        fallback={<p>Access denied</p>}
      />
    </div>
  );
}
```

### Example 4: Role-Based Forms

```tsx
function UserCreateForm() {
  const { hasPermission, hierarchyLevel } = usePermissions();

  return (
    <form>
      <input name="username" required />
      <input name="email" required />

      {/* Only admins can set user as verified */}
      <AdminOnly>
        <label>
          <input type="checkbox" name="isVerified" />
          Pre-verify user account
        </label>
      </AdminOnly>

      {/* Role selection limited by hierarchy */}
      <div>
        <label>Assign Role:</label>
        <select name="role">
          <option value="viewer">Viewer</option>
          <option value="user">User</option>
          {hierarchyLevel >= 4 && (
            <>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
            </>
          )}
          {hierarchyLevel >= 5 && (
            <option value="super_admin">Super Administrator</option>
          )}
        </select>
      </div>

      {/* Advanced settings for higher roles */}
      <ManagerAndAbove>
        <fieldset>
          <legend>Advanced Settings</legend>
          <input type="date" name="expiresAt" />
          <textarea name="notes" placeholder="Admin notes" />
        </fieldset>
      </ManagerAndAbove>
    </form>
  );
}
```

## Component Reference

### RoleBasedComponent Props

| Prop | Type | Description |
|------|------|-------------|
| `requiredPermission` | `string` | Required permission (e.g., "documents:read") |
| `requiredRole` | `string` | Required role name |
| `requiredHierarchyLevel` | `number` | Minimum hierarchy level (1-5) |
| `anyPermissions` | `string[]` | Array of permissions (OR condition) |
| `anyRoles` | `string[]` | Array of roles (OR condition) |
| `fallback` | `React.ReactNode` | Content to show when access denied |
| `loadingComponent` | `React.ReactNode` | Content to show while loading |
| `inverse` | `boolean` | Invert the permission check |

### Action Button Components

#### DocumentActions

```tsx
<DocumentActions
  documentId={number}
  ownerId={number}
  isEncrypted={boolean}
  isShared={boolean}
  actions={['view', 'edit', 'delete', 'download', 'share', 'archive']}
  onClick={(action) => handleAction(action)}
  size="sm" | "md" | "lg"
  disabled={boolean}
  loading={boolean}
/>
```

#### UserActions

```tsx
<UserActions
  userId={number}
  targetUserHierarchyLevel={number}
  isActive={boolean}
  actions={['view', 'edit', 'activate', 'deactivate', 'delete', 'resetPassword', 'assignRole']}
  onClick={(action) => handleAction(action)}
/>
```

#### SystemActions

```tsx
<SystemActions
  systemFunction="monitoring"
  criticalAction={boolean}
  actions={['settings', 'backup', 'restore', 'maintenance', 'logs', 'security']}
  onClick={(action) => handleAction(action)}
/>
```

### Navigation Components

#### RoleBasedNavigation

```tsx
<RoleBasedNavigation
  mode="sidebar" | "header" | "mobile"
  currentPath={string}
  onNavigate={(path) => navigate(path)}
  onLogout={() => logout()}
  className="custom-styles"
/>
```

### Layout Components

#### RoleBasedAppLayout

```tsx
<RoleBasedAppLayout
  currentPath={string}
  onNavigate={(path) => navigate(path)}
  onLogout={() => logout()}
>
  {children}
</RoleBasedAppLayout>
```

## Testing and Development

### Using the Demo Component

The `RoleBasedUIDemo` component provides an interactive testing environment:

```tsx
import { RoleBasedUIDemo } from '../components/demo/RoleBasedUIDemo';

// Add to your development routes
function DevPage() {
  return <RoleBasedUIDemo />;
}
```

### Testing Different Roles

1. **Role Switching**: Use the demo component's role switcher to test different user levels
2. **Permission Testing**: Verify that UI elements appear/disappear correctly
3. **Action Testing**: Confirm that action buttons work appropriately for each role
4. **Navigation Testing**: Check that menu items are filtered correctly

### Development Best Practices

1. **Always Use Permission Checks**: Never rely on just hiding elements - always verify permissions on the backend
2. **Graceful Fallbacks**: Provide helpful messages when access is denied
3. **Loading States**: Handle permission loading gracefully
4. **Consistent Patterns**: Use the provided components consistently across the application
5. **Test All Roles**: Ensure your features work correctly for all user roles

### Error Handling

```tsx
function MyComponent() {
  const { error, isLoading } = usePermissions();

  if (error) {
    return (
      <div className="error-state">
        <p>Unable to load permissions. Please refresh the page.</p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Your role-based content
  return <RoleBasedContent />;
}
```

## Integration with Existing Components

### Enhancing Existing Components

To add role-based features to existing components:

```tsx
// Before: Static component
function DocumentUpload() {
  return (
    <div>
      <input type="file" />
      <button>Upload</button>
    </div>
  );
}

// After: Role-based component
import { UserAndAbove, usePermissions } from '../components/rbac/RoleBasedComponent';

function DocumentUpload() {
  const { hierarchyLevel } = usePermissions();

  // Different file limits based on role
  const maxFiles = hierarchyLevel >= 4 ? 50 : hierarchyLevel >= 3 ? 20 : 10;
  const maxSize = hierarchyLevel >= 4 ? 500 : hierarchyLevel >= 3 ? 200 : 100;

  return (
    <UserAndAbove fallback={<AccessDeniedMessage />}>
      <div>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
        />
        <button>Upload (Max {maxFiles} files, {maxSize}MB each)</button>

        {/* Advanced options for managers and above */}
        <ManagerAndAbove>
          <div>
            <label>
              <input type="checkbox" />
              Auto-categorize documents
            </label>
          </div>
        </ManagerAndAbove>
      </div>
    </UserAndAbove>
  );
}
```

This comprehensive role-based UI system ensures that SecureVault provides a secure, user-friendly experience that adapts to each user's role and permissions, while maintaining a clean and organized codebase.