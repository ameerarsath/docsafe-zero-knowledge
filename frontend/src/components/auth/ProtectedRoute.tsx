/**
 * Protected Route Components for SecureVault Frontend
 * 
 * Provides route protection with authentication and role-based access control.
 * Includes loading states, error handling, and automatic redirects.
 */

import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types/auth';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRole?: User['role'];
  adminOnly?: boolean;
  fallbackPath?: string;
}

/**
 * ProtectedRoute component that handles authentication and authorization
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRole,
  adminOnly = false,
  fallbackPath = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    // Redirect to login with return path
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check admin requirement
  if (adminOnly && !isAdmin()) {
    return <AccessDenied message="Administrator privileges required" />;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <AccessDenied 
        message={`${getRoleDisplayName(requiredRole)} role or higher required`} 
      />
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * RequireAuth component - simplified wrapper for authentication only
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requireAuth={true}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * RequireRole component - wrapper for role-based access
 */
export function RequireRole({ 
  children, 
  role 
}: { 
  children: ReactNode; 
  role: User['role']; 
}) {
  return (
    <ProtectedRoute requireAuth={true} requiredRole={role}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * RequireAdmin component - wrapper for admin-only access
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requireAuth={true} adminOnly={true}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * GuestOnly component - only allows unauthenticated users
 */
export function GuestOnly({ 
  children, 
  redirectTo = '/dashboard' 
}: { 
  children: ReactNode; 
  redirectTo?: string; 
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * ConditionalRoute component - renders different content based on auth state
 */
export function ConditionalRoute({
  authenticatedComponent,
  unauthenticatedComponent,
  loadingComponent,
}: {
  authenticatedComponent: ReactNode;
  unauthenticatedComponent: ReactNode;
  loadingComponent?: ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{isAuthenticated ? authenticatedComponent : unauthenticatedComponent}</>;
}

/**
 * AccessDenied component - displays when user lacks required permissions
 */
function AccessDenied({ message }: { message: string }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Access denied icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Access Denied
            </h2>
            
            <p className="mt-2 text-sm text-gray-600">
              {message}
            </p>

            {user && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500">
                  Logged in as: <span className="font-medium">{user.email}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Role: <span className="font-medium">{getRoleDisplayName(user.role)}</span>
                </p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={() => window.history.back()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go Back
              </button>
              
              <button
                onClick={() => logout()}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to get user-friendly role names
 */
function getRoleDisplayName(role: User['role']): string {
  const roleNames: Record<User['role'], string> = {
    'super_admin': 'Super Administrator',
    'admin': 'Administrator',
    'manager': 'Manager',
    'user': 'User',
    'viewer': 'Viewer',
  };
  
  return roleNames[role] || role;
}

export default ProtectedRoute;