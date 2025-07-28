/**
 * Access Denied Page Component
 * 
 * Provides user-friendly error pages and handling for RBAC access denials.
 * Includes different variants for various access denial scenarios.
 */

import React from 'react';
import {
  ShieldAlert,
  Lock,
  AlertTriangle,
  Info,
  ArrowLeft,
  Home,
  HelpCircle,
  User,
  Key,
  Clock
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from './RoleBasedComponent';
import type { AccessDeniedProps } from '../../types/rbac';

interface AccessDeniedPageProps extends AccessDeniedProps {
  variant?: 'permission' | 'role' | 'hierarchy' | 'authentication' | 'generic';
  showDetails?: boolean;
  showSuggestions?: boolean;
  showContactInfo?: boolean;
}

const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  variant = 'generic',
  requiredPermission,
  requiredRole,
  message,
  showReturnButton = true,
  showDetails = true,
  showSuggestions = true,
  showContactInfo = true,
  onReturnClick
}) => {
  const { user } = useAuth();
  const { userRoles, hierarchyLevel, userPermissions } = usePermissions();

  const getIcon = () => {
    switch (variant) {
      case 'permission':
        return <Key className="mx-auto h-16 w-16 text-red-400" />;
      case 'role':
        return <User className="mx-auto h-16 w-16 text-red-400" />;
      case 'hierarchy':
        return <ShieldAlert className="mx-auto h-16 w-16 text-red-400" />;
      case 'authentication':
        return <Lock className="mx-auto h-16 w-16 text-red-400" />;
      default:
        return <AlertTriangle className="mx-auto h-16 w-16 text-red-400" />;
    }
  };

  const getTitle = () => {
    switch (variant) {
      case 'permission':
        return 'Permission Required';
      case 'role':
        return 'Role Required';
      case 'hierarchy':
        return 'Insufficient Access Level';
      case 'authentication':
        return 'Authentication Required';
      default:
        return 'Access Denied';
    }
  };

  const getDefaultMessage = () => {
    switch (variant) {
      case 'permission':
        return requiredPermission
          ? `You need the "${requiredPermission}" permission to access this resource.`
          : 'You don\'t have the required permission to access this resource.';
      case 'role':
        return requiredRole
          ? `You need the "${requiredRole}" role to access this resource.`
          : 'You don\'t have the required role to access this resource.';
      case 'hierarchy':
        return 'Your current access level is insufficient for this resource.';
      case 'authentication':
        return 'Please log in to access this resource.';
      default:
        return 'You don\'t have permission to access this resource.';
    }
  };

  const getSuggestions = () => {
    const suggestions = [];

    switch (variant) {
      case 'permission':
        suggestions.push({
          icon: <HelpCircle className="h-5 w-5 text-blue-500" />,
          title: 'Request Permission',
          description: 'Contact your administrator to request the required permission.',
          action: showContactInfo ? 'Contact Admin' : undefined
        });
        break;
      case 'role':
        suggestions.push({
          icon: <User className="h-5 w-5 text-blue-500" />,
          title: 'Request Role Assignment',
          description: 'Ask your administrator to assign you the required role.',
          action: showContactInfo ? 'Contact Admin' : undefined
        });
        break;
      case 'hierarchy':
        suggestions.push({
          icon: <ShieldAlert className="h-5 w-5 text-blue-500" />,
          title: 'Access Level Upgrade',
          description: 'Your current access level may need to be upgraded.',
          action: showContactInfo ? 'Contact Admin' : undefined
        });
        break;
      case 'authentication':
        suggestions.push({
          icon: <Lock className="h-5 w-5 text-blue-500" />,
          title: 'Log In',
          description: 'Please log in with your credentials to continue.',
          action: 'Go to Login'
        });
        break;
    }

    // Add common suggestions
    suggestions.push({
      icon: <Clock className="h-5 w-5 text-gray-500" />,
      title: 'Try Again Later',
      description: 'Permissions may take some time to update. Try refreshing the page.',
      action: 'Refresh Page'
    });

    return suggestions;
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'Go to Login':
        window.location.href = '/login';
        break;
      case 'Refresh Page':
        window.location.reload();
        break;
      case 'Contact Admin':
        // This could open a contact form or email client
        window.location.href = 'mailto:admin@securevault.local?subject=Access Request';
        break;
    }
  };

  const handleReturn = () => {
    if (onReturnClick) {
      onReturnClick();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Icon and Title */}
          <div className="text-center">
            {getIcon()}
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              {getTitle()}
            </h2>
            <p className="mt-2 text-lg text-gray-600">
              {message || getDefaultMessage()}
            </p>
          </div>

          {/* User Details */}
          {showDetails && user && (
            <div className="mt-8 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Your Current Access</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">User</dt>
                  <dd className="text-gray-900">{user.username}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Access Level</dt>
                  <dd className="text-gray-900">Level {hierarchyLevel}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Current Roles</dt>
                  <dd className="text-gray-900">
                    {userRoles.length > 0 ? userRoles.join(', ') : 'No roles assigned'}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Permissions</dt>
                  <dd className="text-gray-900">{userPermissions.length} total</dd>
                </div>
              </div>
            </div>
          )}

          {/* Required Access */}
          {showDetails && (requiredPermission || requiredRole) && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-3">Required Access</h3>
              <div className="text-sm text-red-700">
                {requiredPermission && (
                  <div className="flex items-center">
                    <Key className="h-4 w-4 mr-2" />
                    <span>Permission: <code className="bg-red-100 px-1 rounded">{requiredPermission}</code></span>
                  </div>
                )}
                {requiredRole && (
                  <div className="flex items-center mt-2">
                    <User className="h-4 w-4 mr-2" />
                    <span>Role: <code className="bg-red-100 px-1 rounded">{requiredRole}</code></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">What can you do?</h3>
              <div className="space-y-4">
                {getSuggestions().map((suggestion, index) => (
                  <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {suggestion.icon}
                    </div>
                    <div className="ml-3 flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {suggestion.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {suggestion.description}
                      </p>
                      {suggestion.action && (
                        <button
                          onClick={() => handleAction(suggestion.action!)}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-500 font-medium"
                        >
                          {suggestion.action} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Information */}
          {showContactInfo && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex items-center">
                <Info className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">Need Help?</h3>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                If you believe you should have access to this resource, please contact your system administrator.
              </p>
              <div className="mt-3 text-sm">
                <a
                  href="mailto:admin@securevault.local"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  admin@securevault.local
                </a>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row-reverse gap-3">
            {variant === 'authentication' && (
              <button
                onClick={() => handleAction('Go to Login')}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Lock className="h-4 w-4 mr-2" />
                Go to Login
              </button>
            )}
            
            {showReturnButton && (
              <button
                onClick={handleReturn}
                className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </button>
            )}
            
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Inline Access Denied Component
 * For showing access denied messages within existing layouts
 */
interface InlineAccessDeniedProps {
  title?: string;
  message?: string;
  requiredPermission?: string;
  requiredRole?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export const InlineAccessDenied: React.FC<InlineAccessDeniedProps> = ({
  title = 'Access Denied',
  message,
  requiredPermission,
  requiredRole,
  showDetails = false,
  compact = false
}) => {
  const { user } = useAuth();
  const { userRoles, hierarchyLevel } = usePermissions();

  const defaultMessage = requiredPermission
    ? `You need the "${requiredPermission}" permission to access this feature.`
    : requiredRole
    ? `You need the "${requiredRole}" role to access this feature.`
    : 'You don\'t have permission to access this feature.';

  if (compact) {
    return (
      <div className="text-center py-6">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{message || defaultMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message || defaultMessage}</p>
          </div>
          
          {showDetails && user && (
            <div className="mt-4 text-xs text-red-600">
              <p>Your access: Level {hierarchyLevel} ({userRoles.join(', ') || 'No roles'})</p>
              {requiredPermission && (
                <p>Required permission: <code>{requiredPermission}</code></p>
              )}
              {requiredRole && (
                <p>Required role: <code>{requiredRole}</code></p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Error Boundary for RBAC-related errors
 */
interface RBACErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class RBACErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<any> },
  RBACErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<any> }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): RBACErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || AccessDeniedPage;
      return (
        <FallbackComponent
          variant="generic"
          message="An error occurred while checking your permissions. Please try again or contact support."
          showDetails={false}
          showSuggestions={true}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with RBAC error boundary
 */
export function withRBACErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: React.ComponentType<any>
) {
  const ComponentWithErrorBoundary = (props: P) => {
    return (
      <RBACErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </RBACErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = 
    `withRBACErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithErrorBoundary;
}

export default AccessDeniedPage;