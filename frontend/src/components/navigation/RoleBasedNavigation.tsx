/**
 * Role-Based Navigation Component for SecureVault
 *
 * This component provides navigation menus that adapt based on user roles:
 * - Viewer: Basic document viewing and profile management
 * - User: Document management and personal settings
 * - Manager: Team management and reporting features
 * - Admin: User management and system administration
 * - Super_Admin: Complete system control and security features
 */

import React, { useState } from 'react';
import {
  Home,
  FileText,
  Users,
  Settings,
  Shield,
  BarChart,
  Key,
  Monitor,
  Database,
  AlertTriangle,
  Search,
  Upload,
  Download,
  Folder,
  Lock,
  UserCheck,
  Activity,
  Bell,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react';
import {
  RoleBasedComponent,
  usePermissions,
  AdminOnly,
  ManagerAndAbove,
  UserAndAbove,
  SystemAdminOnly,
  PermissionNavItem
} from '../rbac/RoleBasedComponent';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  requiredPermission?: string;
  requiredRole?: string;
  requiredHierarchyLevel?: number;
  children?: NavigationItem[];
  badge?: string | number;
  description?: string;
}

interface RoleBasedNavigationProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  className?: string;
  mode?: 'sidebar' | 'header' | 'mobile';
}

export const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({
  currentPath = '',
  onNavigate,
  onLogout,
  className = '',
  mode = 'sidebar'
}) => {
  const { userRoles, hierarchyLevel, hasPermission, userPermissions } = usePermissions();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Define navigation structure based on roles
  const navigationSections: { title: string; items: NavigationItem[] }[] = [
    // Dashboard - All authenticated users
    {
      title: 'Dashboard',
      items: [
        {
          id: 'home',
          label: 'Dashboard',
          icon: Home,
          href: '/dashboard',
          description: 'Overview and recent activity'
        }
      ]
    },

    // Documents - Role-based access
    {
      title: 'Documents',
      items: [
        {
          id: 'documents',
          label: 'My Documents',
          icon: FileText,
          href: '/documents',
          description: 'View and manage your documents'
        },
        {
          id: 'search',
          label: 'Search',
          icon: Search,
          href: '/search',
          description: 'Search through documents'
        },
        {
          id: 'upload',
          label: 'Upload',
          icon: Upload,
          href: '/upload',
          requiredHierarchyLevel: 2,
          description: 'Upload new documents'
        },
        {
          id: 'folders',
          label: 'Folder Management',
          icon: Folder,
          href: '/folders',
          requiredHierarchyLevel: 2,
          description: 'Organize documents in folders'
        },
        {
          id: 'trash',
          label: 'Trash',
          icon: Download,
          href: '/trash',
          requiredHierarchyLevel: 2,
          description: 'Recover deleted documents'
        }
      ]
    },

    // Management - Manager and above
    {
      title: 'Management',
      items: [
        {
          id: 'team',
          label: 'Team Overview',
          icon: Users,
          href: '/team',
          requiredHierarchyLevel: 3,
          description: 'View team members and activity'
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: BarChart,
          href: '/reports',
          requiredHierarchyLevel: 3,
          description: 'Generate usage and activity reports'
        },
        {
          id: 'user-management',
          label: 'User Management',
          icon: UserCheck,
          href: '/admin/users',
          requiredHierarchyLevel: 4,
          description: 'Manage user accounts and permissions'
        },
        {
          id: 'rbac',
          label: 'Roles & Permissions',
          icon: Shield,
          href: '/admin/rbac',
          requiredHierarchyLevel: 4,
          description: 'Configure roles and permissions'
        }
      ]
    },

    // Administration - Admin and above
    {
      title: 'Administration',
      items: [
        {
          id: 'system',
          label: 'System Monitor',
          icon: Monitor,
          href: '/admin/system',
          requiredHierarchyLevel: 4,
          description: 'Monitor system health and performance'
        },
        {
          id: 'audit',
          label: 'Audit Trail',
          icon: Activity,
          href: '/admin/audit',
          requiredHierarchyLevel: 4,
          description: 'View system audit logs'
        },
        {
          id: 'security',
          label: 'Security Center',
          icon: Lock,
          href: '/admin/security',
          requiredHierarchyLevel: 4,
          description: 'Security monitoring and controls'
        },
        {
          id: 'database',
          label: 'Database Management',
          icon: Database,
          href: '/admin/database',
          requiredRole: 'super_admin',
          description: 'Database maintenance and backups'
        }
      ]
    },

    // Personal - All users
    {
      title: 'Personal',
      items: [
        {
          id: 'profile',
          label: 'Profile Settings',
          icon: User,
          href: '/profile',
          description: 'Manage your profile and preferences'
        },
        {
          id: 'security-settings',
          label: 'Security Settings',
          icon: Key,
          href: '/security',
          description: 'Manage passwords and encryption'
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          href: '/notifications',
          description: 'Configure notification preferences'
        }
      ]
    }
  ];

  // Render navigation item
  const renderNavItem = (item: NavigationItem, isChild = false) => {
    // Check if user has access to this item
    const canAccess =
      (!item.requiredPermission || hasPermission(item.requiredPermission)) &&
      (!item.requiredRole || userRoles.includes(item.requiredRole)) &&
      (!item.requiredHierarchyLevel || hierarchyLevel >= item.requiredHierarchyLevel);

    if (!canAccess) {
      return null;
    }

    const isActive = item.href === currentPath;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);

    const handleClick = () => {
      if (hasChildren) {
        toggleSection(item.id);
      } else if (item.href) {
        onNavigate?.(item.href);
      } else if (item.onClick) {
        item.onClick();
      }
    };

    return (
      <div key={item.id} className="mb-1">
        <button
          onClick={handleClick}
          className={`
            w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors
            ${isChild ? 'ml-6 pl-2' : ''}
            ${isActive
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }
          `}
          title={item.description}
        >
          <div className="flex items-center space-x-3">
            <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className="font-medium">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                {item.badge}
              </span>
            )}
          </div>
          {hasChildren && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          )}
        </button>

        {/* Child items */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  // Sidebar mode
  if (mode === 'sidebar') {
    return (
      <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">SecureVault</h1>
              <p className="text-xs text-gray-500">
                {userRoles.join(', ')} • Level {hierarchyLevel}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-6">
            {navigationSections.map(section => {
              // Check if any items in this section are accessible
              const accessibleItems = section.items.filter(item =>
                (!item.requiredPermission || hasPermission(item.requiredPermission)) &&
                (!item.requiredRole || userRoles.includes(item.requiredRole)) &&
                (!item.requiredHierarchyLevel || hierarchyLevel >= item.requiredHierarchyLevel)
              );

              if (accessibleItems.length === 0) {
                return null;
              }

              return (
                <div key={section.title}>
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map(item => renderNavItem(item))}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-2">
            <button
              onClick={() => onNavigate?.('/help')}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-gray-400" />
              <span>Help & Support</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Header mode
  if (mode === 'header') {
    return (
      <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-semibold text-gray-900">SecureVault</h1>
              </div>
            </div>

            {/* Main Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <UserAndAbove>
                <PermissionNavItem to="/documents" className="text-gray-700 hover:text-gray-900">
                  Documents
                </PermissionNavItem>
              </UserAndAbove>

              <ManagerAndAbove>
                <PermissionNavItem to="/reports" requiredHierarchyLevel={3} className="text-gray-700 hover:text-gray-900">
                  Reports
                </PermissionNavItem>
              </ManagerAndAbove>

              <AdminOnly>
                <PermissionNavItem to="/admin" requiredHierarchyLevel={4} className="text-gray-700 hover:text-gray-900">
                  Admin
                </PermissionNavItem>
              </AdminOnly>
            </nav>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-200">
                    {userRoles.join(', ')} • Level {hierarchyLevel}
                  </div>
                  <button
                    onClick={() => {
                      onNavigate?.('/profile');
                      setShowUserMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      onNavigate?.('/security');
                      setShowUserMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Security Settings
                  </button>
                  <div className="border-t border-gray-200">
                    <button
                      onClick={() => {
                        onLogout?.();
                        setShowUserMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Mobile mode - simplified navigation
  return (
    <div className={`bg-white ${className}`}>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <UserAndAbove>
            <button
              onClick={() => onNavigate?.('/documents')}
              className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <FileText className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Documents</span>
            </button>
          </UserAndAbove>

          <UserAndAbove>
            <button
              onClick={() => onNavigate?.('/upload')}
              className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <Upload className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Upload</span>
            </button>
          </UserAndAbove>

          <ManagerAndAbove>
            <button
              onClick={() => onNavigate?.('/reports')}
              className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <BarChart className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Reports</span>
            </button>
          </ManagerAndAbove>

          <AdminOnly>
            <button
              onClick={() => onNavigate?.('/admin')}
              className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <Shield className="w-6 h-6 text-gray-600 mb-1" />
              <span className="text-xs text-gray-700">Admin</span>
            </button>
          </AdminOnly>

          <button
            onClick={() => onNavigate?.('/profile')}
            className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <User className="w-6 h-6 text-gray-600 mb-1" />
            <span className="text-xs text-gray-700">Profile</span>
          </button>

          <button
            onClick={onLogout}
            className="flex flex-col items-center p-3 bg-red-50 rounded-lg hover:bg-red-100"
          >
            <LogOut className="w-6 h-6 text-red-600 mb-1" />
            <span className="text-xs text-red-700">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleBasedNavigation;