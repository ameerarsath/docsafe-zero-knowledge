/**
 * Enhanced Application Layout with Comprehensive Role-Based Navigation
 *
 * This is an improved version of AppLayout that properly implements role-based UI controls
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText,
  Settings,
  Shield,
  User,
  LogOut,
  Menu,
  X,
  Home,
  ChevronRight,
  ChevronDown,
  Bell,
  Search,
  Users,
  Grid,
  RefreshCw,
  FileText as AuditIcon,
  UserCog,
  Lock,
  Eye,
  Activity,
  AlertTriangle,
  Database,
  FileCheck,
  Trash2,
  Upload,
  BarChart,
  Key,
  Monitor
} from 'lucide-react';
import {
  PermissionProvider,
  usePermissions,
  useRoleBasedVisibility,
  RoleBasedComponent,
  AdminOnly,
  ManagerAndAbove,
  UserAndAbove,
  SystemAdminOnly
} from '../rbac/RoleBasedComponent';

interface EnhancedAppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  requiredPermission?: string;
  requiredRole?: string;
  requiredHierarchyLevel?: number;
  children?: NavigationItem[];
}

// Role-based navigation structure
const getNavigationItems = (): NavigationItem[] => [
  // Core items - available to all authenticated users
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: FileText,
    requiredPermission: 'documents:read'
  },

  // User-level items
  {
    name: 'Upload',
    href: '/upload',
    icon: Upload,
    requiredHierarchyLevel: 2
  },
  {
    name: 'Trash',
    href: '/trash',
    icon: Trash2,
    requiredHierarchyLevel: 2
  },

  // Manager-level items
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart,
    requiredHierarchyLevel: 3
  },

  // Admin-level items
  {
    name: 'User Management',
    href: '/admin/users',
    icon: UserCog,
    requiredHierarchyLevel: 4,
    children: [
      {
        name: 'Users Overview',
        href: '/admin/users',
        icon: Users,
        requiredPermission: 'users:read'
      },
      {
        name: 'Role Management',
        href: '/admin/rbac/roles',
        icon: Shield,
        requiredPermission: 'roles:read'
      },
      {
        name: 'User Assignments',
        href: '/admin/rbac/assignments',
        icon: Users,
        requiredPermission: 'roles:assign'
      },
      {
        name: 'Permission Matrix',
        href: '/admin/rbac/matrix',
        icon: Grid,
        requiredPermission: 'system:read'
      },
      {
        name: 'Role Hierarchy',
        href: '/admin/rbac/hierarchy',
        icon: RefreshCw,
        requiredPermission: 'roles:read'
      }
    ]
  },
  {
    name: 'System Administration',
    href: '/admin/system',
    icon: Database,
    requiredHierarchyLevel: 4,
    children: [
      {
        name: 'System Dashboard',
        href: '/admin/dashboard',
        icon: Monitor,
        requiredPermission: 'system:admin'
      },
      {
        name: 'System Monitoring',
        href: '/admin/monitoring',
        icon: Activity,
        requiredPermission: 'system:admin'
      },
      {
        name: 'Audit Logs',
        href: '/admin/audit',
        icon: AuditIcon,
        requiredPermission: 'system:audit'
      }
    ]
  },

  // Security items - Admin and above
  {
    name: 'Security Center',
    href: '/security',
    icon: Lock,
    requiredHierarchyLevel: 4,
    children: [
      {
        name: 'Security Dashboard',
        href: '/security/dashboard',
        icon: Activity,
        requiredPermission: 'system:security'
      },
      {
        name: 'Security Headers',
        href: '/security/headers',
        icon: Shield,
        requiredPermission: 'system:security'
      },
      {
        name: 'Key Management',
        href: '/security/keys',
        icon: Key,
        requiredPermission: 'encryption:manage'
      },
      {
        name: 'Event Monitoring',
        href: '/security/monitoring',
        icon: Eye,
        requiredPermission: 'system:security'
      }
    ]
  }
];

const EnhancedLayoutContent: React.FC<EnhancedAppLayoutProps> = ({ children, title, subtitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const { user, logout, getRoleName } = useAuth();
  const {
    hasPermission,
    hierarchyLevel,
    userRoles,
    canShow,
    isLoading
  } = useRoleBasedVisibility();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const isParentActive = (item: NavigationItem) => {
    if (isActive(item.href)) return true;
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return false;
  };

  const toggleMenu = (menuName: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuName)) {
      newExpanded.delete(menuName);
    } else {
      newExpanded.add(menuName);
    }
    setExpandedMenus(newExpanded);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter navigation based on role-based visibility
  const getVisibleNavigation = () => {
    return getNavigationItems().filter(item => {
      return canShow({
        requiredPermission: item.requiredPermission,
        requiredRole: item.requiredRole,
        requiredHierarchyLevel: item.requiredHierarchyLevel
      });
    });
  };

  const filteredNavigation = getVisibleNavigation();

  // Group navigation items by section
  const getNavigationSections = () => {
    const sections: { title: string; items: NavigationItem[] }[] = [];

    // Core section (Dashboard, Documents)
    const coreItems = filteredNavigation.filter(item =>
      ['Dashboard', 'Documents', 'Upload', 'Trash'].includes(item.name)
    );
    if (coreItems.length > 0) {
      sections.push({ title: 'Documents', items: coreItems });
    }

    // Management section (Reports, User Management)
    const managementItems = filteredNavigation.filter(item =>
      ['Reports', 'User Management'].includes(item.name)
    );
    if (managementItems.length > 0) {
      sections.push({ title: 'Management', items: managementItems });
    }

    // Administration section (System Admin, Security)
    const adminItems = filteredNavigation.filter(item =>
      ['System Administration', 'Security Center'].includes(item.name)
    );
    if (adminItems.length > 0) {
      sections.push({ title: 'Administration', items: adminItems });
    }

    return sections;
  };

  const navigationSections = getNavigationSections();

  // Generate breadcrumbs
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(segment => segment);
    const breadcrumbs = [{ name: 'Dashboard', href: '/dashboard' }];

    const segmentMap: { [key: string]: string } = {
      'admin': 'User Management',
      'rbac': 'RBAC',
      'settings': 'Settings',
      'mfa': 'Multi-Factor Authentication',
      'documents': 'Documents',
      'trash': 'Trash',
      'roles': 'Role Management',
      'assignments': 'User Assignments',
      'matrix': 'Permission Matrix',
      'hierarchy': 'Role Hierarchy',
      'audit': 'Audit Trail',
      'monitoring': 'System Monitoring',
      'dashboard': 'Dashboard',
      'users': 'Users Overview',
      'security': 'Security',
      'headers': 'Security Headers',
      'keys': 'Key Management'
    };

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const name = segmentMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

      if (currentPath !== '/dashboard') {
        breadcrumbs.push({ name, href: currentPath });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex lg:flex-col lg:h-screen`}>

        {/* Logo/Brand */}
        <div className="flex items-center justify-between h-16 px-6 bg-blue-600">
          <Link to="/dashboard" className="flex items-center">
            <Shield className="h-8 w-8 text-white" />
            <span className="ml-2 text-xl font-bold text-white">SecureVault</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-blue-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User info with role-based styling */}
        <div className={`px-6 py-4 border-b border-gray-200 ${
          hierarchyLevel >= 5 ? 'bg-red-50' :
          hierarchyLevel >= 4 ? 'bg-purple-50' :
          hierarchyLevel >= 3 ? 'bg-blue-50' :
          hierarchyLevel >= 2 ? 'bg-green-50' : 'bg-gray-50'
        }`}>
          <div className="flex items-center">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              hierarchyLevel >= 5 ? 'bg-red-100' :
              hierarchyLevel >= 4 ? 'bg-purple-100' :
              hierarchyLevel >= 3 ? 'bg-blue-100' :
              hierarchyLevel >= 2 ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <User className={`h-6 w-6 ${
                hierarchyLevel >= 5 ? 'text-red-600' :
                hierarchyLevel >= 4 ? 'text-purple-600' :
                hierarchyLevel >= 3 ? 'text-blue-600' :
                hierarchyLevel >= 2 ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-gray-500">{userRoles.join(', ')}</p>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                  hierarchyLevel >= 5 ? 'bg-red-100 text-red-800' :
                  hierarchyLevel >= 4 ? 'bg-purple-100 text-purple-800' :
                  hierarchyLevel >= 3 ? 'bg-blue-100 text-blue-800' :
                  hierarchyLevel >= 2 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  L{hierarchyLevel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-6 px-3 overflow-y-auto">
          <div className="space-y-6 pb-4">
            {navigationSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    // Double-check visibility for each item
                    const isVisible = canShow({
                      requiredPermission: item.requiredPermission,
                      requiredRole: item.requiredRole,
                      requiredHierarchyLevel: item.requiredHierarchyLevel
                    });

                    if (!isVisible) return null;

                    return (
                      <div key={item.name}>
                        {/* Main navigation item */}
                        {item.children ? (
                          <button
                            onClick={() => toggleMenu(item.name)}
                            className={`group flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              isParentActive(item)
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <item.icon className={`mr-3 h-5 w-5 ${
                              isParentActive(item) ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                            <span className="flex-1 text-left">{item.name}</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${
                              expandedMenus.has(item.name) ? 'rotate-180' : ''
                            }`} />
                          </button>
                        ) : (
                          <Link
                            to={item.href}
                            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              isActive(item.href)
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <item.icon className={`mr-3 h-5 w-5 ${
                              isActive(item.href) ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                            {item.name}
                          </Link>
                        )}

                        {/* Submenu items */}
                        {item.children && expandedMenus.has(item.name) && (
                          <div className="ml-6 mt-1 space-y-1">
                            {item.children.map((child) => {
                              // Check visibility for child items
                              const isChildVisible = canShow({
                                requiredPermission: child.requiredPermission,
                                requiredRole: child.requiredRole,
                                requiredHierarchyLevel: child.requiredHierarchyLevel
                              });

                              if (!isChildVisible) return null;

                              return (
                                <Link
                                  key={child.name}
                                  to={child.href}
                                  className={`group flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                                    isActive(child.href)
                                      ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  }`}
                                >
                                  <child.icon className={`mr-3 h-4 w-4 ${
                                    isActive(child.href) ? 'text-blue-600' : 'text-gray-400'
                                  }`} />
                                  {child.name}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Show empty state if no sections are visible */}
            {navigationSections.length === 0 && (
              <div className="px-3 py-8 text-center">
                <Lock className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  No navigation items available for your role.
                </p>
              </div>
            )}
          </div>
        </nav>

        {/* Logout button at bottom */}
        <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-500" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          {/* Top navigation bar */}
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((breadcrumb, index) => (
                <React.Fragment key={breadcrumb.href}>
                  {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                  <Link
                    to={breadcrumb.href}
                    className={`${
                      index === breadcrumbs.length - 1
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {breadcrumb.name}
                  </Link>
                </React.Fragment>
              ))}
            </nav>

            {/* Right side - User info and role display */}
            <div className="flex items-center space-x-4">
              {/* Role indicator */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                hierarchyLevel >= 5 ? 'bg-red-100 text-red-800' :
                hierarchyLevel >= 4 ? 'bg-purple-100 text-purple-800' :
                hierarchyLevel >= 3 ? 'bg-blue-100 text-blue-800' :
                hierarchyLevel >= 2 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                <Shield className="h-3 w-3 mr-1" />
                {userRoles.join(', ')} (L{hierarchyLevel})
              </div>

              {/* MFA Status */}
              {user?.mfa_enabled ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <Shield className="h-3 w-3 mr-1" />
                  MFA Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  MFA Disabled
                </span>
              )}
            </div>
          </div>

          {/* Page title section */}
          {(title || subtitle) && title !== breadcrumbs[breadcrumbs.length - 1]?.name && (
            <div className="border-t border-gray-100">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Page content */}
        <main className="flex-1 min-h-screen bg-gray-50">
          <div className="h-full px-2 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// Main component with PermissionProvider wrapper
export const EnhancedAppLayout: React.FC<EnhancedAppLayoutProps> = (props) => {
  return (
    <PermissionProvider>
      <EnhancedLayoutContent {...props} />
    </PermissionProvider>
  );
};

export default EnhancedAppLayout;