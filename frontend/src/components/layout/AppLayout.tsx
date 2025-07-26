/**
 * Main Application Layout Component
 * 
 * Provides consistent navigation, sidebar, and layout structure for all pages
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
  FileText as AuditIcon
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
  { name: 'MFA Settings', href: '/settings/mfa', icon: Settings },
  { 
    name: 'RBAC Management', 
    href: '/admin', 
    icon: Shield, 
    adminOnly: true,
    children: [
      { name: 'Overview', href: '/admin', icon: Home },
      { name: 'Role Management', href: '/admin/rbac/roles', icon: Shield },
      { name: 'User Assignments', href: '/admin/rbac/assignments', icon: Users },
      { name: 'Permission Matrix', href: '/admin/rbac/matrix', icon: Grid },
      { name: 'Role Hierarchy', href: '/admin/rbac/hierarchy', icon: RefreshCw },
      { name: 'Audit Trail', href: '/admin/rbac/audit', icon: AuditIcon }
    ]
  },
];

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const { user, logout, hasRole, getRoleName } = useAuth();
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

  // Filter navigation based on user permissions
  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly) {
      return user?.is_admin || ['super_admin', 'admin', '5', '4'].includes(user?.role || '');
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
        'admin': 'Administration',
        'rbac': 'RBAC',
        'settings': 'Settings',
        'mfa': 'Multi-Factor Authentication',
        'documents': 'Documents',
        'roles': 'Role Management',
        'assignments': 'User Assignments',
        'matrix': 'Permission Matrix',
        'hierarchy': 'Role Hierarchy',
        'audit': 'Audit Trail'
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
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex lg:flex-col`}>
        
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
        <nav className="flex-1 mt-6 px-3">
          <div className="space-y-1">
            {filteredNavigation.map((item) => (
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
            ))}
          </div>
        </nav>

        {/* Logout button at bottom */}
        <div className="p-3 border-t border-gray-200">
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

            {/* Right side - Search, notifications, etc. */}
            <div className="flex items-center space-x-4">
              {/* Search button (placeholder) */}
              <button className="text-gray-500 hover:text-gray-700">
                <Search className="h-5 w-5" />
              </button>
              
              {/* Notifications button (placeholder) */}
              <button className="text-gray-500 hover:text-gray-700">
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