/**
 * Main Application Layout Component
 * 
 * Provides consistent navigation, sidebar, and layout structure for all pages
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useSecurityStatus } from '../../hooks/useSecurity';
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
  Trash2
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  permission?: string;
  adminOnly?: boolean;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Documents', href: '/documents', icon: FileText },
  { 
    name: 'Trash', 
    href: '/trash', 
    icon: Trash2,
    children: [
      { name: 'Manage Items', href: '/trash', icon: Settings },
      { name: 'Empty Trash', href: '/trash?action=empty', icon: Trash2 },
      { name: 'Recover All', href: '/trash?action=recover-all', icon: RefreshCw }
    ]
  },
  { 
    name: 'User Management', 
    href: '/admin/users', 
    icon: UserCog, 
    adminOnly: true,
    children: [
      { name: 'Users Overview', href: '/admin/users', icon: Users },
      { name: 'Role Management', href: '/admin/rbac/roles', icon: Shield },
      { name: 'User Assignments', href: '/admin/rbac/assignments', icon: Users },
      { name: 'Permission Matrix', href: '/admin/rbac/matrix', icon: Grid },
      { name: 'Role Hierarchy', href: '/admin/rbac/hierarchy', icon: RefreshCw }
    ]
  },
  { 
    name: 'Security', 
    href: '/security', 
    icon: Lock, 
    adminOnly: true,
    children: [
      { name: 'Security Dashboard', href: '/security/dashboard', icon: Activity },
      { name: 'Security Headers', href: '/security/headers', icon: Shield },
      { name: 'Event Monitoring', href: '/security/monitoring', icon: Eye },
      { name: 'Key Management', href: '/security/keys', icon: Lock },
      { name: 'Admin Dashboard', href: '/admin/dashboard', icon: Database },
      { name: 'System Monitoring', href: '/admin/monitoring', icon: Database },
      { name: 'Audit Logs', href: '/admin/audit', icon: AuditIcon },
      { name: 'RBAC Audit Trail', href: '/admin/rbac/audit-trail', icon: Eye },
      { name: 'MFA Settings', href: '/settings/mfa', icon: Settings }
    ]
  },
];

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const { user, logout, hasRole, getRoleName } = useAuth();
  const { canAccessAdmin, hasPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const securityStatus = useSecurityStatus();

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

  // Auto-expand parent menu if child is active
  React.useEffect(() => {
    const newExpanded = new Set(expandedMenus);
    navigation.forEach(item => {
      if (item.children && item.children.some(child => isActive(child.href))) {
        newExpanded.add(item.name);
      }
    });
    setExpandedMenus(newExpanded);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter navigation based on user permissions with stricter role checking
  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly) {
      // Only show admin items to actual admin/manager roles (hierarchy level 3+)
      const isManagerOrAbove = user?.role && ['super_admin', 'admin', 'manager', '5', '4', '3'].includes(user.role);
      return isManagerOrAbove && canAccessAdmin();
    }
    if (item.permission) {
      return hasPermission(item.permission);
    }
    return true;
  });

  // Generate breadcrumbs from current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(segment => segment);
    const breadcrumbs = [{ name: 'Dashboard', href: '/dashboard' }];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Map segments to readable names
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

      const name = segmentMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      if (currentPath !== '/dashboard') {
        breadcrumbs.push({ name, href: currentPath });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

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

        {/* User info */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500">{user?.role && getRoleName(user.role)}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-6 px-3 overflow-y-auto">
          <div className="space-y-2 pb-4">
            {filteredNavigation.map((item, index) => {
              // Check if this is the first admin item to add the section label
              const isFirstAdminItem = item.adminOnly &&
                index > 0 &&
                !filteredNavigation.slice(0, index).some(prevItem => prevItem.adminOnly);

              return (
              <div key={item.name}>
                {/* Add section labels for admin items */}
                {isFirstAdminItem && (
                  <div className="pt-4 pb-2">
                    <div className="border-t border-gray-200 mb-4"></div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
                      Administration
                    </h3>
                  </div>
                )}
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
                    {item.children.map((child) => (
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
                    ))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </nav>

        {/* Logout button at bottom - always visible */}
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

            {/* Right side - Search, user info, etc. */}
            <div className="flex items-center space-x-4">
              {/* Search button - Role-based access */}
              {user?.role && ['super_admin', 'admin', 'manager', 'user', 'viewer'].includes(user.role) ? (
                <Link 
                  to="/documents" 
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Search Documents"
                >
                  <Search className="h-5 w-5" />
                </Link>
              ) : (
                <button 
                  className="text-gray-300 cursor-not-allowed" 
                  disabled
                  title="Search not available for your role"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
              
              {/* Notifications button - DISABLED (as requested) */}
              <button 
                className="text-gray-300 cursor-not-allowed" 
                disabled
                title="Notifications feature is not available"
              >
                <Bell className="h-5 w-5" />
              </button>

              {/* MFA Status indicator */}
              {user?.mfa_enabled ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <Shield className="h-3 w-3 mr-1" />
                  MFA Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Shield className="h-3 w-3 mr-1" />
                  MFA Disabled
                </span>
              )}

              {/* Security Status indicator */}
              <div 
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                  securityStatus.status === 'secure'
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : securityStatus.status === 'warning'
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
                title={`Security Status: ${securityStatus.message}${
                  securityStatus.violationsCount > 0 
                    ? ` (${securityStatus.violationsCount} violations)` 
                    : ''
                }${
                  securityStatus.suspiciousActivitiesCount > 0 
                    ? ` (${securityStatus.suspiciousActivitiesCount} suspicious activities)` 
                    : ''
                }`}
                onClick={() => {
                  if (user?.is_admin || ['super_admin', 'admin', '5', '4'].includes(user?.role || '')) {
                    navigate('/security');
                  }
                }}
              >
                {securityStatus.status === 'secure' ? (
                  <Shield className="h-3 w-3 mr-1" />
                ) : securityStatus.status === 'warning' ? (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                Security
                {(securityStatus.violationsCount > 0 || securityStatus.suspiciousActivitiesCount > 0) && (
                  <span className="ml-1 bg-white bg-opacity-50 rounded-full px-1">
                    {securityStatus.violationsCount + securityStatus.suspiciousActivitiesCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Page title section - only show if title/subtitle provided and not redundant with breadcrumb */}
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
}