/**
 * Authentication Service for SecureVault Frontend
 * 
 * Provides all authentication-related API calls including login, logout,
 * registration, password reset, and user management functions.
 */

import { 
  LoginCredentials, 
  LoginResponse, 
  RefreshTokenResponse, 
  User, 
  UserCreateRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  ApiResponse 
} from '../types/auth';
import { apiRequest, TokenManager } from './api';

class AuthService {
  /**
   * Login user with username and password
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const response = await apiRequest<LoginResponse>('POST', '/api/auth/login', {
      username: credentials.username,
      password: credentials.password,
      remember_me: credentials.remember_me || false
    });
    
    if (response.success && response.data) {
      // Store tokens if login successful
      TokenManager.setTokens(
        response.data.access_token,
        response.data.refresh_token,
        response.data.expires_in,
        credentials.remember_me || false
      );
    }
    
    return response;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await apiRequest<void>('POST', '/api/auth/logout');
      
      // Always clear tokens regardless of API response
      TokenManager.clearTokens();
      
      return response;
    } catch (error: any) {
      // Handle 403 errors gracefully (user may not be fully authenticated during MFA flow)
      if (error?.response?.status === 403 || error?.status_code === 403) {
        // Still clear tokens even if logout API fails with 403
        TokenManager.clearTokens();
        return {
          success: true,
          data: undefined
        };
      }
      
      // For other errors, still clear tokens but return the error
      TokenManager.clearTokens();
      return {
        success: false,
        error: {
          detail: error.message || 'Logout failed',
          status_code: error?.status_code || 500,
          error_code: 'LOGOUT_ERROR'
        }
      };
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    const refreshToken = TokenManager.getRefreshToken();
    
    if (!refreshToken) {
      return {
        success: false,
        error: {
          detail: 'No refresh token available',
          status_code: 401,
          error_code: 'NO_REFRESH_TOKEN',
        },
      };
    }

    const response = await apiRequest<RefreshTokenResponse>('POST', '/api/auth/refresh', {
      refresh_token: refreshToken,
    });

    if (response.success && response.data) {
      // Update stored tokens
      TokenManager.setTokens(
        response.data.access_token,
        response.data.refresh_token,
        response.data.expires_in,
        TokenManager.getRememberMe()
      );
    }

    return response;
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiRequest<User>('GET', '/api/auth/me');
  }

  /**
   * Create new user (admin only)
   */
  async createUser(userData: UserCreateRequest): Promise<ApiResponse<User>> {
    return apiRequest<User>('POST', '/api/auth/users', userData);
  }

  /**
   * Update user information
   */
  async updateUser(userId: number, userData: Partial<User>): Promise<ApiResponse<User>> {
    return apiRequest<User>('PUT', `/api/auth/users/${userId}`, userData);
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: number): Promise<ApiResponse<void>> {
    return apiRequest<void>('DELETE', `/api/auth/users/${userId}`);
  }

  /**
   * Get list of users (admin only)
   * TODO: This endpoint doesn't exist in the backend yet
   */
  async getUsers(page: number = 1, limit: number = 20): Promise<ApiResponse<{users: User[], total: number}>> {
    // Temporary mock response until backend user management is implemented
    return Promise.resolve({
      success: true,
      data: {
        users: [],
        total: 0
      }
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<ApiResponse<{message: string}>> {
    return apiRequest<{message: string}>('POST', '/api/auth/password-reset', data);
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(data: PasswordResetConfirm): Promise<ApiResponse<{message: string}>> {
    return apiRequest<{message: string}>('POST', '/api/auth/password-reset/confirm', data);
  }

  /**
   * Change password for current user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{message: string}>> {
    return apiRequest<{message: string}>('POST', '/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  /**
   * Lock user account (admin only)
   */
  async lockUser(userId: number): Promise<ApiResponse<{message: string}>> {
    return apiRequest<{message: string}>('POST', `/api/auth/users/${userId}/lock`);
  }

  /**
   * Unlock user account (admin only)
   */
  async unlockUser(userId: number): Promise<ApiResponse<{message: string}>> {
    return apiRequest<{message: string}>('POST', `/api/auth/users/${userId}/unlock`);
  }

  /**
   * Force password reset for user (admin only)
   */
  async forcePasswordReset(userId: number): Promise<ApiResponse<{message: string}>> {
    return apiRequest<{message: string}>('POST', `/api/auth/users/${userId}/force-password-reset`);
  }

  /**
   * Complete MFA verification during login flow
   */
  async verifyMFALogin(tempToken: string, mfaCode: string): Promise<ApiResponse<LoginResponse>> {
    const response = await apiRequest<LoginResponse>('POST', '/api/auth/mfa/verify', {
      temp_token: tempToken,
      mfa_code: mfaCode
    });
    
    if (response.success && response.data) {
      // Store tokens if MFA verification successful
      TokenManager.setTokens(
        response.data.access_token,
        response.data.refresh_token,
        response.data.expires_in,
        false // rememberMe - should be handled from original login
      );
    }
    
    return response;
  }

  /**
   * Get authentication status
   */
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    user: User | null;
    tokenValid: boolean;
    timeUntilExpiry: number;
  }> {
    const token = TokenManager.getAccessToken();
    const isTokenExpired = TokenManager.isTokenExpired();
    const timeUntilExpiry = TokenManager.getTimeUntilExpiry();
    
    if (!token || isTokenExpired) {
      return {
        isAuthenticated: false,
        user: null,
        tokenValid: false,
        timeUntilExpiry: 0,
      };
    }

    try {
      const userResponse = await this.getCurrentUser();
      
      if (userResponse.success && userResponse.data) {
        return {
          isAuthenticated: true,
          user: userResponse.data,
          tokenValid: true,
          timeUntilExpiry,
        };
      } else {
        // Token exists but user fetch failed
        TokenManager.clearTokens();
        return {
          isAuthenticated: false,
          user: null,
          tokenValid: false,
          timeUntilExpiry: 0,
        };
      }
    } catch (error) {
      TokenManager.clearTokens();
      return {
        isAuthenticated: false,
        user: null,
        tokenValid: false,
        timeUntilExpiry: 0,
      };
    }
  }

  /**
   * Check if current user has specific role
   */
  hasRole(user: User | null, role: User['role']): boolean {
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
  }

  /**
   * Check if current user is admin
   */
  isAdmin(user: User | null): boolean {
    return user?.is_admin || false;
  }

  /**
   * Get user-friendly role name
   */
  getRoleName(role: User['role']): string {
    const roleNames: Record<User['role'], string> = {
      'super_admin': 'Super Administrator',
      'admin': 'Administrator',
      'manager': 'Manager',
      'user': 'User',
      'viewer': 'Viewer',
    };
    
    return roleNames[role] || role;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;