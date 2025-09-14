/**
 * Role-Based Application Layout Component for SecureVault
 *
 * This component provides a comprehensive layout that adapts based on user roles:
 * - Different navigation menus for different roles
 * - Role-specific header information and actions
 * - Conditional sidebar content
 * - Role-based notifications and alerts
 * - Responsive design that works across devices
 */

import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Bell,
  AlertCircle,
  Shield,
  Users,
  Activity,
  Settings,
  ChevronDown,
  Search,
  HelpCircle
} from 'lucide-react';
import {
  PermissionProvider,
  usePermissions,
  RoleBasedComponent,
  AdminOnly,
  ManagerAndAbove,
  UserAndAbove,
  SystemAdminOnly
} from '../rbac/RoleBasedComponent';
import { RoleBasedNavigation } from '../navigation/RoleBasedNavigation';
import { QuickActions } from '../rbac/RoleBasedActionButtons';

interface RoleBasedAppLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

// Role-based notification types
interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  requiredHierarchyLevel?: number;
  requiredPermission?: string;
  timestamp: Date;
  dismissed?: boolean;
}

const RoleBasedLayoutContent: React.FC<RoleBasedAppLayoutProps> = ({
  children,
  currentPath = '',
  onNavigate,
  onLogout
}) => {
  const { userRoles, hierarchyLevel, hasPermission, userPermissions, isLoading } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Example notifications based on roles
  useEffect(() => {
    const roleBasedNotifications: Notification[] = [
      // Viewer notifications
      {
        id: 'viewer-welcome',
        type: 'info',
        title: 'Welcome to SecureVault',
        message: 'You have read-only access to documents. Contact your administrator for upload permissions.',
        requiredHierarchyLevel: 1,
        timestamp: new Date()
      },

      // User notifications
      {
        id: 'encryption-reminder',
        type: 'warning',
        title: 'Encryption Key Reminder',
        message: 'Remember to keep your encryption password safe. We cannot recover it if lost.',
        requiredHierarchyLevel: 2,
        timestamp: new Date()
      },

      // Manager notifications
      {
        id: 'team-activity',
        type: 'info',
        title: 'Team Activity Summary',
        message: 'Your team has uploaded 15 new documents this week.',
        requiredHierarchyLevel: 3,
        requiredPermission: 'users:read',
        timestamp: new Date()
      },

      // Admin notifications
      {
        id: 'system-health',
        type: 'success',
        title: 'System Status',
        message: 'All systems are running normally. Last backup completed successfully.',
        requiredHierarchyLevel: 4,
        requiredPermission: 'system:admin',
        timestamp: new Date()
      },

      // Super Admin critical notifications
      {
        id: 'security-alert',
        type: 'warning',
        title: 'Security Review Required',
        message: 'Monthly security audit is due. Review access logs and user permissions.',
        requiredHierarchyLevel: 5,
        timestamp: new Date()
      }
    ];

    // Filter notifications based on user permissions
    const visibleNotifications = roleBasedNotifications.filter(notification => {
      const hasHierarchy = !notification.requiredHierarchyLevel || hierarchyLevel >= notification.requiredHierarchyLevel;
      const hasPermissionCheck = !notification.requiredPermission || hasPermission(notification.requiredPermission);
      return hasHierarchy && hasPermissionCheck && !notification.dismissed;
    });

    setNotifications(visibleNotifications);
  }, [hierarchyLevel, hasPermission]);

  // Get role-specific header color scheme
  const getRoleColorScheme = () => {
    if (hierarchyLevel >= 5) return 'bg-red-600 text-white'; // Super Admin - Red
    if (hierarchyLevel >= 4) return 'bg-purple-600 text-white'; // Admin - Purple
    if (hierarchyLevel >= 3) return 'bg-blue-600 text-white'; // Manager - Blue
    if (hierarchyLevel >= 2) return 'bg-green-600 text-white'; // User - Green
    return 'bg-gray-600 text-white'; // Viewer - Gray
  };

  // Role-based stats for the header
  const getRoleStats = () => {
    if (hierarchyLevel >= 5) return { label: 'System Health', value: '99.9%', icon: Shield };
    if (hierarchyLevel >= 4) return { label: 'Active Users', value: '1,247', icon: Users };
    if (hierarchyLevel >= 3) return { label: 'Team Docs', value: '89', icon: Activity };
    if (hierarchyLevel >= 2) return { label: 'My Documents', value: '24', icon: Activity };
    return { label: 'Available Docs', value: '156', icon: Activity };
  };

  const roleStats = getRoleStats();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <RoleBasedNavigation
          currentPath={currentPath}
          onNavigate={(path) => {
            onNavigate?.(path);
            setSidebarOpen(false);
          }}
          onLogout={onLogout}
          mode="sidebar"
        />
      </div>

      {/* Main content area */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className={`sticky top-0 z-30 ${getRoleColorScheme()} shadow-sm`}>
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Left side - Mobile menu button and title */}
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="lg:hidden p-2 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <h1 className="text-lg font-semibold">SecureVault</h1>
                <div className="hidden sm:flex items-center space-x-2 px-2 py-1 bg-black bg-opacity-20 rounded-full text-xs">
                  <Shield className="w-3 h-3" />
                  <span>{userRoles.join(', ')}</span>
                  <span>•</span>
                  <span>Level {hierarchyLevel}</span>
                </div>
              </div>
            </div>

            {/* Center - Search and quick actions */}
            <div className="hidden md:flex items-center space-x-4 flex-1 max-w-lg mx-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white text-opacity-60" />
                <input
                  type="text"
                  placeholder={hierarchyLevel >= 3 ? "Search documents and users..." : "Search documents..."}
                  className="w-full pl-10 pr-4 py-2 bg-black bg-opacity-20 text-white placeholder-white placeholder-opacity-60 rounded-lg focus:bg-opacity-30 focus:outline-none transition-colors"
                />
              </div>

              {/* Quick actions based on role */}
              <div className="flex items-center space-x-2">
                <QuickActions
                  context={hierarchyLevel >= 3 ? 'user' : 'document'}
                  onAction={(action) => {
                    console.log(`Quick action: ${action}`);
                    // Handle quick actions
                  }}
                />
              </div>
            </div>

            {/* Right side - Stats, notifications, and user menu */}
            <div className="flex items-center space-x-4">
              {/* Role-specific stats */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-black bg-opacity-20 rounded-lg">
                <roleStats.icon className="w-4 h-4" />
                <div className="text-sm">
                  <span className="text-white text-opacity-80">{roleStats.label}:</span>
                  <span className="font-semibold ml-1">{roleStats.value}</span>
                </div>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <h3 className="font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-gray-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div key={notification.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-start space-x-3">
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                notification.type === 'error' ? 'bg-red-100 text-red-600' :
                                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                                notification.type === 'success' ? 'bg-green-100 text-green-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                <AlertCircle className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {notification.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="px-4 py-2 border-t border-gray-200">
                        <button
                          onClick={() => setNotifications([])}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Clear all notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Help - All users */}
              <button
                onClick={() => onNavigate?.('/help')}
                className="p-2 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
                title="Help & Support"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Role-specific alert banners */}
          <SystemAdminOnly>
            <div className="bg-red-700 text-red-100 px-4 py-2 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Super Administrator Mode Active - Use with caution</span>
              </div>
            </div>
          </SystemAdminOnly>

          <AdminOnly>
            <RoleBasedComponent requiredHierarchyLevel={4} inverse requiredRole="super_admin">
              <div className="bg-purple-700 text-purple-100 px-4 py-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Administrator Mode - Manage users and system settings</span>
                </div>
              </div>
            </RoleBasedComponent>
          </AdminOnly>
        </header>

        {/* Main content */}
        <main className="min-h-screen">
          {/* Breadcrumb and page actions */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>SecureVault</span>
                <span>•</span>
                <span className="capitalize">{currentPath.replace('/', '') || 'Dashboard'}</span>
              </div>

              {/* Page-specific quick actions */}
              <div className="flex items-center space-x-2">
                {currentPath.includes('/documents') && (
                  <UserAndAbove>
                    <button
                      onClick={() => onNavigate?.('/upload')}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Upload
                    </button>
                  </UserAndAbove>
                )}

                {currentPath.includes('/admin') && (
                  <AdminOnly>
                    <button
                      onClick={() => onNavigate?.('/admin/users')}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Manage Users
                    </button>
                  </AdminOnly>
                )}
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Click outside handler for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// Main component with PermissionProvider wrapper
export const RoleBasedAppLayout: React.FC<RoleBasedAppLayoutProps> = (props) => {
  return (
    <PermissionProvider>
      <RoleBasedLayoutContent {...props} />
    </PermissionProvider>
  );
};

export default RoleBasedAppLayout;