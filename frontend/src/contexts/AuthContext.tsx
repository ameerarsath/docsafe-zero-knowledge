/**
 * Authentication Context Provider for SecureVault Frontend
 * 
 * Provides authentication context throughout the React component tree,
 * handling user state, session management, and authentication actions.
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { User, SessionWarning } from '../types/auth';
import useAuthStore from '../stores/authStore';

interface AuthContextType {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;  
  error: string | null;
  sessionTimeout: number | null;
  
  // Authentication actions
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  
  // User management actions
  createUser: (userData: any) => Promise<boolean>;
  updateUser: (userId: number, userData: Partial<User>) => Promise<boolean>;
  deleteUser: (userId: number) => Promise<boolean>;
  
  // Password management actions
  requestPasswordReset: (username: string) => Promise<boolean>;
  confirmPasswordReset: (token: string, newPassword: string, confirmPassword: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  
  // Session management actions
  extendSession: () => Promise<void>;
  hideSessionWarning: () => void;
  
  // Utility actions
  clearError: () => void;
  hasRole: (role: User['role']) => boolean;
  isAdmin: () => boolean;
  getRoleName: (role: User['role'] | string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    sessionTimeout,
    rememberMe,
    
    // Actions
    login: storeLogin,
    logout: storeLogout,
    refreshToken: storeRefreshToken,
    createUser: storeCreateUser,
    updateUser: storeUpdateUser,
    deleteUser: storeDeleteUser,
    requestPasswordReset: storeRequestPasswordReset,
    confirmPasswordReset: storeConfirmPasswordReset,
    changePassword: storeChangePassword,
    checkAuthStatus,
    extendSession: storeExtendSession,
    hideSessionWarning: storeHideSessionWarning,
    clearError: storeClearError,
  } = useAuthStore();

  // Initialize authentication state on mount
  useEffect(() => {
    checkAuthStatus();
  }, []); // Empty dependency array since checkAuthStatus should only run once on mount

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!isAuthenticated) return;

    const setupAutoRefresh = () => {
      // Refresh token 5 minutes before expiry
      const refreshInterval = 10 * 60 * 1000; // 10 minutes
      
      const interval = setInterval(async () => {
        if (isAuthenticated) {
          await storeRefreshToken();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    };

    const cleanup = setupAutoRefresh();
    return cleanup;
  }, [isAuthenticated]); // Remove storeRefreshToken from dependencies

  // Wrapped authentication actions with better error handling
  const login = async (username: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    try {
      return await storeLogin({ username, password, remember_me: rememberMe });
    } catch (error) {
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await storeLogout();
      // Redirect to login page after logout
      window.location.href = '/login';
    } catch (error) {
      // Force redirect even if logout fails
      window.location.href = '/login';
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      return await storeRefreshToken();
    } catch (error) {
      return false;
    }
  };

  const createUser = async (userData: any): Promise<boolean> => {
    try {
      return await storeCreateUser(userData);
    } catch (error) {
      return false;
    }
  };

  const updateUser = async (userId: number, userData: Partial<User>): Promise<boolean> => {
    try {
      return await storeUpdateUser(userId, userData);
    } catch (error) {
      return false;
    }
  };

  const deleteUser = async (userId: number): Promise<boolean> => {
    try {
      return await storeDeleteUser(userId);
    } catch (error) {
      return false;
    }
  };

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    try {
      return await storeRequestPasswordReset({ email });
    } catch (error) {
      return false;
    }
  };

  const confirmPasswordReset = async (
    token: string, 
    newPassword: string, 
    confirmPassword: string
  ): Promise<boolean> => {
    try {
      return await storeConfirmPasswordReset({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
    } catch (error) {
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      return await storeChangePassword(currentPassword, newPassword);
    } catch (error) {
      return false;
    }
  };

  const extendSession = async (): Promise<void> => {
    try {
      await storeExtendSession();
    } catch (error) {
      // Failed to extend session
    }
  };

  const hideSessionWarning = (): void => {
    storeHideSessionWarning();
  };

  const clearError = (): void => {
    storeClearError();
  };

  // Utility functions
  const hasRole = (role: User['role']): boolean => {
    if (!user) return false;
    
    // Role hierarchy for permission checking
    const roleHierarchy: Record<User['role'], number> = {
      'super_admin': 5,
      'admin': 4,
      'manager': 3,
      'user': 2,
      'viewer': 1,
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[role];
  };

  const isAdmin = (): boolean => {
    return user?.is_admin || user?.role === 'super_admin' || user?.role === 'admin' || false;
  };

  const getRoleName = (role: User['role'] | string): string => {
    // Handle both string and numeric role IDs
    const roleNames: Record<string, string> = {
      'super_admin': 'Super Administrator',
      'admin': 'Administrator', 
      'manager': 'Manager',
      'user': 'User',
      'viewer': 'Viewer',
      // Numeric role mappings
      '5': 'Super Administrator',
      '4': 'Administrator',
      '3': 'Manager', 
      '2': 'User',
      '1': 'Viewer',
    };
    
    return roleNames[role as string] || role as string;
  };

  const contextValue: AuthContextType = {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    sessionTimeout,
    
    // Authentication actions
    login,
    logout,
    refreshToken,
    
    // User management actions  
    createUser,
    updateUser,
    deleteUser,
    
    // Password management actions
    requestPasswordReset,
    confirmPasswordReset,
    changePassword,
    
    // Session management actions
    extendSession,
    hideSessionWarning,
    
    // Utility actions
    clearError,
    hasRole,
    isAdmin,
    getRoleName,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// HOC for components that require authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const AuthenticatedComponent = (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      window.location.href = '/login';
      return null;
    }
    
    return <Component {...props} />;
  };
  
  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
}

// HOC for components that require specific roles
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: User['role']
): React.ComponentType<P> {
  const RoleProtectedComponent = (props: P) => {
    const { hasRole, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    if (!hasRole(requiredRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
  
  RoleProtectedComponent.displayName = `withRole(${Component.displayName || Component.name})`;
  
  return RoleProtectedComponent;
}

export default AuthContext;