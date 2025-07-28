/**
 * Authentication Store (Zustand) for SecureVault Frontend
 * 
 * Centralized state management for authentication including user data,
 * login state, session management, and token handling.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  AuthState, 
  User, 
  LoginCredentials, 
  UserCreateRequest,
  PasswordResetRequest,
  PasswordResetConfirm 
} from '../types/auth';
import { authService } from '../services/authService';
import { TokenManager } from '../services/api';

interface AuthActions {
  // Authentication actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  getCurrentUser: () => Promise<void>;
  
  // User management actions
  createUser: (userData: UserCreateRequest) => Promise<boolean>;
  updateUser: (userId: number, userData: Partial<User>) => Promise<boolean>;
  deleteUser: (userId: number) => Promise<boolean>;
  
  // Password management actions
  requestPasswordReset: (data: PasswordResetRequest) => Promise<boolean>;
  confirmPasswordReset: (data: PasswordResetConfirm) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  
  // Session management actions
  checkAuthStatus: () => Promise<void>;
  startSessionTimer: () => void;
  stopSessionTimer: () => void;
  extendSession: () => Promise<void>;
  showSessionWarning: (timeRemaining: number) => void;
  hideSessionWarning: () => void;
  
  // State management actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

// Session timeout configuration (15 minutes by default)
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before timeout

let sessionTimer: NodeJS.Timeout | null = null;
let warningTimer: NodeJS.Timeout | null = null;

const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        tokens: {
          access_token: null,
          refresh_token: null,
          expires_at: null,
        },
        sessionTimeout: null,
        rememberMe: false,

        // Authentication actions
        login: async (credentials) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authService.login(credentials);
            
            if (response.success && response.data) {
              const { user_id, username, role, access_token, refresh_token, expires_in, must_change_password } = response.data;
              
              // Construct user object from login response
              const user: User = {
                id: user_id,
                username,
                role: role as User['role'],
                must_change_password,
                // Set default values for other user properties
                email: '', // Will be fetched from user profile later
                is_admin: role === 'admin' || role === 'super_admin',
                mfa_enabled: false, // Will be updated after fetching user profile
                account_locked: false,
                failed_login_attempts: 0,
                last_login: null,
                created_at: '',
                updated_at: ''
              };
              
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                tokens: {
                  access_token,
                  refresh_token,
                  expires_at: Date.now() + (expires_in * 1000),
                },
                rememberMe: credentials.remember_me || false,
              });
              
              // Start session management
              get().startSessionTimer();
              
              return true;
            } else {
              // Handle API error response properly
              let errorMessage = 'Login failed';
              
              if (response.error) {
                if (typeof response.error === 'string') {
                  errorMessage = response.error;
                } else if (response.error.detail) {
                  if (typeof response.error.detail === 'string') {
                    errorMessage = response.error.detail;
                  } else if (Array.isArray(response.error.detail)) {
                    // Handle validation errors array
                    errorMessage = (response.error.detail as any[]).map((err: any) => err.msg || err.toString()).join(', ');
                  } else {
                    errorMessage = 'Invalid credentials';
                  }
                } else {
                  errorMessage = 'Invalid credentials';
                }
              }
              
              set({
                isLoading: false,
                error: errorMessage,
              });
              return false;
            }
          } catch (error) {
            set({
              isLoading: false,
              error: 'Login failed. Please try again.',
            });
            return false;
          }
        },

        logout: async () => {
          set({ isLoading: true });
          
          try {
            await authService.logout();
          } catch (error) {
            // Continue with logout even if API call fails
          }
          
          // Stop session timers
          get().stopSessionTimer();
          
          // Clear state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            tokens: {
              access_token: null,
              refresh_token: null,
              expires_at: null,
            },
            sessionTimeout: null,
            rememberMe: false,
          });
        },

        refreshToken: async () => {
          try {
            const response = await authService.refreshToken();
            
            if (response.success && response.data) {
              const { access_token, refresh_token, expires_in } = response.data;
              
              set({
                tokens: {
                  access_token,
                  refresh_token,
                  expires_at: Date.now() + (expires_in * 1000),
                },
              });
              
              // Restart session timer with new expiry
              get().startSessionTimer();
              
              return true;
            } else {
              // Refresh failed, logout user
              await get().logout();
              return false;
            }
          } catch (error) {
            await get().logout();
            return false;
          }
        },

        getCurrentUser: async () => {
          set({ isLoading: true });
          
          try {
            const response = await authService.getCurrentUser();
            
            if (response.success && response.data) {
              set({
                user: response.data,
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              // User fetch failed, logout
              await get().logout();
            }
          } catch (error) {
            await get().logout();
          }
        },

        // User management actions
        createUser: async (userData) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authService.createUser(userData);
            
            if (response.success) {
              set({ isLoading: false });
              return true;
            } else {
              set({
                isLoading: false,
                error: response.error?.detail || 'Failed to create user',
              });
              return false;
            }
          } catch (error) {
            set({
              isLoading: false,
              error: 'Failed to create user. Please try again.',
            });
            return false;
          }
        },

        updateUser: async (userId, userData) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authService.updateUser(userId, userData);
            
            if (response.success && response.data) {
              // Update current user if updating self
              const currentUser = get().user;
              if (currentUser && currentUser.id === userId) {
                set({ user: response.data });
              }
              
              set({ isLoading: false });
              return true;
            } else {
              set({
                isLoading: false,
                error: response.error?.detail || 'Failed to update user',
              });
              return false;
            }
          } catch (error) {
            set({
              isLoading: false,
              error: 'Failed to update user. Please try again.',
            });
            return false;
          }
        },

        deleteUser: async (userId) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authService.deleteUser(userId);
            
            if (response.success) {
              set({ isLoading: false });
              return true;
            } else {
              set({
                isLoading: false,
                error: response.error?.detail || 'Failed to delete user',
              });
              return false;
            }
          } catch (error) {
            set({
              isLoading: false,
              error: 'Failed to delete user. Please try again.',
            });
            return false;
          }
        },

        // Password management actions
        requestPasswordReset: async (data) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authService.requestPasswordReset(data);
            
            if (response.success) {
              set({ isLoading: false });
              return true;
            } else {
              set({
                isLoading: false,
                error: response.error?.detail || 'Failed to request password reset',
              });
              return false;
            }
          } catch (error) {
            set({
              isLoading: false,
              error: 'Failed to request password reset. Please try again.',
            });
            return false;
          }
        },

        confirmPasswordReset: async (data) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authService.confirmPasswordReset(data);
            
            if (response.success) {
              set({ isLoading: false });
              return true;
            } else {
              set({
                isLoading: false,
                error: response.error?.detail || 'Failed to reset password',
              });
              return false;
            }
          } catch (error) {
            set({
              isLoading: false,
              error: 'Failed to reset password. Please try again.',
            });
            return false;
          }
        },

        changePassword: async (currentPassword, newPassword) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authService.changePassword(currentPassword, newPassword);
            
            if (response.success) {
              set({ isLoading: false });
              return true;
            } else {
              set({
                isLoading: false,
                error: response.error?.detail || 'Failed to change password',
              });
              return false;
            }
          } catch (error) {
            set({
              isLoading: false,
              error: 'Failed to change password. Please try again.',
            });
            return false;
          }
        },

        // Session management actions
        checkAuthStatus: async () => {
          const authStatus = await authService.getAuthStatus();
          
          if (authStatus.isAuthenticated && authStatus.user) {
            set({
              user: authStatus.user,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Start session timer if not already running
            if (!sessionTimer) {
              get().startSessionTimer();
            }
          } else {
            await get().logout();
          }
        },

        startSessionTimer: () => {
          const { stopSessionTimer } = get();
          
          // Clear existing timers
          stopSessionTimer();
          
          const expiresAt = TokenManager.getExpiresAt();
          if (!expiresAt) return;
          
          const timeUntilExpiry = expiresAt - Date.now();
          const timeUntilWarning = timeUntilExpiry - WARNING_TIME;
          
          // Set warning timer
          if (timeUntilWarning > 0) {
            warningTimer = setTimeout(() => {
              get().showSessionWarning(WARNING_TIME);
            }, timeUntilWarning);
          }
          
          // Set session timeout timer
          if (timeUntilExpiry > 0) {
            sessionTimer = setTimeout(async () => {
              await get().logout();
            }, timeUntilExpiry);
          }
        },

        stopSessionTimer: () => {
          if (sessionTimer) {
            clearTimeout(sessionTimer);
            sessionTimer = null;
          }
          if (warningTimer) {
            clearTimeout(warningTimer);
            warningTimer = null;
          }
          
          set({ sessionTimeout: null });
        },

        extendSession: async () => {
          const refreshed = await get().refreshToken();
          if (refreshed) {
            get().hideSessionWarning();
          }
        },

        showSessionWarning: (timeRemaining) => {
          set({ sessionTimeout: timeRemaining });
        },

        hideSessionWarning: () => {
          set({ sessionTimeout: null });
        },

        // State management actions
        setLoading: (loading) => {
          set({ isLoading: loading });
        },

        setError: (error) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        reset: () => {
          get().stopSessionTimer();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            tokens: {
              access_token: null,
              refresh_token: null,
              expires_at: null,
            },
            sessionTimeout: null,
            rememberMe: false,
          });
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          // Only persist user data and remember me preference
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          rememberMe: state.rememberMe,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);

export default useAuthStore;