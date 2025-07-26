/**
 * Mobile-Responsive Role Management Component
 * 
 * Adaptive RBAC interface that provides optimized experiences
 * for different screen sizes and touch interfaces.
 */

import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Monitor,
  Grid,
  List,
  Settings
} from 'lucide-react';

import RoleManagementInterface from './RoleManagementInterface';
import UserRoleAssignmentInterface from './UserRoleAssignmentInterface';
import PermissionMatrixDisplay from './PermissionMatrixDisplay';
import BulkUserRoleOperations from './BulkUserRoleOperations';
import RoleInheritanceVisualization from './RoleInheritanceVisualization';
import PermissionAuditTrailViewer from './PermissionAuditTrailViewer';
import { RoleBasedComponent } from './RoleBasedComponent';

interface MobileResponsiveRoleManagementProps {
  initialView?: 'roles' | 'assignments' | 'matrix' | 'audit' | 'hierarchy';
  showNavigation?: boolean;
  compactMode?: boolean;
}

interface ViewConfig {
  id: 'roles' | 'assignments' | 'matrix' | 'audit' | 'hierarchy';
  label: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  mobileOptimized: boolean;
  requiredPermission?: string;
  props?: Record<string, any>;
}

const MobileResponsiveRoleManagement: React.FC<MobileResponsiveRoleManagementProps> = ({
  initialView = 'roles',
  showNavigation = true,
  compactMode = false
}) => {
  const [currentView, setCurrentView] = useState(initialView);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // Responsive breakpoint detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close mobile nav on view change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [currentView]);

  // View configurations
  const views: ViewConfig[] = [
    {
      id: 'roles',
      label: 'Role Management',
      icon: Settings,
      component: RoleManagementInterface,
      mobileOptimized: true,
      requiredPermission: 'roles:read',
      props: {
        showStats: screenSize !== 'mobile',
        allowCreate: true,
        allowEdit: true,
        allowDelete: true,
        compact: screenSize === 'mobile'
      }
    },
    {
      id: 'assignments',
      label: 'User Assignments',
      icon: List,
      component: UserRoleAssignmentInterface,
      mobileOptimized: true,
      requiredPermission: 'users:read',
      props: {
        showBulkOperations: screenSize !== 'mobile',
        compact: screenSize === 'mobile',
        onUserSelect: (userIds: number[]) => setSelectedUserIds(userIds)
      }
    },
    {
      id: 'matrix',
      label: 'Permission Matrix',
      icon: Grid,
      component: PermissionMatrixDisplay,
      mobileOptimized: true,
      requiredPermission: 'permissions:read',
      props: {
        interactive: true,
        showHierarchy: screenSize !== 'mobile',
        compact: screenSize === 'mobile',
        mobileView: screenSize === 'mobile' ? 'summary' : 'matrix'
      }
    },
    {
      id: 'hierarchy',
      label: 'Role Hierarchy',
      icon: ChevronRight,
      component: RoleInheritanceVisualization,
      mobileOptimized: true,
      requiredPermission: 'roles:read',
      props: {
        interactive: true,
        showPermissions: screenSize !== 'mobile',
        compact: screenSize === 'mobile'
      }
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: List,
      component: PermissionAuditTrailViewer,
      mobileOptimized: true,
      requiredPermission: 'audit:read',
      props: {
        maxEvents: screenSize === 'mobile' ? 25 : 100,
        compact: screenSize === 'mobile',
        showExport: screenSize !== 'mobile'
      }
    }
  ];

  const currentViewConfig = views.find(v => v.id === currentView);
  const CurrentComponent = currentViewConfig?.component;

  // Mobile navigation
  const MobileNavigation = () => (
    <div className={`fixed inset-0 z-50 lg:hidden ${isMobileNavOpen ? '' : 'hidden'}`}>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileNavOpen(false)} />
      <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
        <div className="absolute top-0 right-0 -mr-12 pt-2">
          <button
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            onClick={() => setIsMobileNavOpen(false)}
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
        
        <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
          <div className="px-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">RBAC Management</h2>
            <nav className="space-y-1">
              {views.map((view) => (
                <RoleBasedComponent key={view.id} requiredPermission={view.requiredPermission}>
                  <button
                    onClick={() => setCurrentView(view.id)}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left ${
                      currentView === view.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <view.icon className="mr-3 h-5 w-5" />
                    {view.label}
                  </button>
                </RoleBasedComponent>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop/Tablet navigation
  const DesktopNavigation = () => (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="px-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">RBAC Management</h2>
            <nav className="space-y-1">
              {views.map((view) => (
                <RoleBasedComponent key={view.id} requiredPermission={view.requiredPermission}>
                  <button
                    onClick={() => setCurrentView(view.id)}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left ${
                      currentView === view.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <view.icon className="mr-3 h-5 w-5" />
                    {view.label}
                  </button>
                </RoleBasedComponent>
              ))}
            </nav>
          </div>
        </div>

        {/* Screen size indicator */}
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex items-center text-xs text-gray-500">
            {screenSize === 'mobile' ? (
              <Smartphone className="h-4 w-4 mr-1" />
            ) : (
              <Monitor className="h-4 w-4 mr-1" />
            )}
            {screenSize.charAt(0).toUpperCase() + screenSize.slice(1)} View
          </div>
        </div>
      </div>
    </div>
  );

  // Tab navigation for tablet
  const TabletNavigation = () => (
    <div className="hidden md:block lg:hidden border-b border-gray-200 bg-white">
      <nav className="-mb-px flex space-x-8 px-4">
        {views.map((view) => (
          <RoleBasedComponent key={view.id} requiredPermission={view.requiredPermission}>
            <button
              onClick={() => setCurrentView(view.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === view.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <view.icon className="h-4 w-4 inline mr-2" />
              {view.label}
            </button>
          </RoleBasedComponent>
        ))}
      </nav>
    </div>
  );

  // Mobile header with hamburger menu
  const MobileHeader = () => (
    <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="ml-3 text-lg font-medium text-gray-900">
            {currentViewConfig?.label}
          </h1>
        </div>
        
        {/* Quick actions for mobile */}
        <div className="flex items-center space-x-2">
          {selectedUserIds.length > 0 && currentView === 'assignments' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {selectedUserIds.length} selected
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation components */}
      {showNavigation && (
        <>
          <MobileNavigation />
          <DesktopNavigation />
          <TabletNavigation />
          <MobileHeader />
        </>
      )}

      {/* Main content */}
      <div className={`${showNavigation ? 'lg:pl-64' : ''}`}>
        <div className={`${screenSize === 'mobile' ? 'px-4 py-4' : 'px-6 py-6'}`}>
          {CurrentComponent && (
            <RoleBasedComponent requiredPermission={currentViewConfig?.requiredPermission}>
              <div className={`${compactMode || screenSize === 'mobile' ? 'space-y-4' : 'space-y-6'}`}>
                <CurrentComponent {...(currentViewConfig?.props || {})} />
              </div>
            </RoleBasedComponent>
          )}
        </div>
      </div>

      {/* Mobile-specific enhancements */}
      {screenSize === 'mobile' && (
        <>
          {/* Floating action button for quick actions */}
          {currentView === 'roles' && (
            <div className="fixed bottom-6 right-6 z-40">
              <RoleBasedComponent requiredPermission="roles:create">
                <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </RoleBasedComponent>
            </div>
          )}

          {/* Bottom sheet for bulk operations */}
          {selectedUserIds.length > 0 && currentView === 'assignments' && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {selectedUserIds.length} users selected
                </span>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md">
                    Bulk Assign
                  </button>
                  <button 
                    onClick={() => setSelectedUserIds([])}
                    className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Responsive utilities indicator (development only) */}
      {import.meta.env.DEV && (
        <div className="fixed top-2 right-2 z-50 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {screenSize} ({window.innerWidth}px)
        </div>
      )}
    </div>
  );
};

/**
 * Mobile-Optimized RBAC Component Wrapper
 * Automatically adjusts component behavior based on screen size
 */
interface ResponsiveRBACWrapperProps {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<any>;
  mobileProps?: Record<string, any>;
  desktopProps?: Record<string, any>;
}

export const ResponsiveRBACWrapper: React.FC<ResponsiveRBACWrapperProps> = ({
  children,
  fallbackComponent: FallbackComponent,
  mobileProps = {},
  desktopProps = {}
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // On very small screens, show fallback if provided
  if (isMobile && FallbackComponent) {
    return <FallbackComponent {...mobileProps} />;
  }

  // Clone children with responsive props
  const enhancedChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      const props = isMobile ? mobileProps : desktopProps;
      return React.cloneElement(child, { ...props, ...child.props });
    }
    return child;
  });

  return <>{enhancedChildren}</>;
};

/**
 * Touch-Optimized Button Component
 * Larger touch targets for mobile interfaces
 */
interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[2.5rem]',
    md: 'px-4 py-3 text-sm min-h-[3rem]',
    lg: 'px-6 py-4 text-base min-h-[3.5rem]'
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass} ${className}`}
    >
      {children}
    </button>
  );
};

export default MobileResponsiveRoleManagement;