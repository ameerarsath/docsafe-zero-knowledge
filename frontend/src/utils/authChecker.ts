/**
 * Authentication status checker utility
 */

import { TokenManager } from '../services/api';

export interface AuthStatus {
  isAuthenticated: boolean;
  hasValidToken: boolean;
  tokenExpired: boolean;
  needsLogin: boolean;
}

export class AuthChecker {
  /**
   * Check the current authentication status
   */
  static checkAuthStatus(): AuthStatus {
    const token = TokenManager.getAccessToken();
    const refreshToken = TokenManager.getRefreshToken();
    const isExpired = TokenManager.isTokenExpired();
    
    const hasValidToken = !!token && !isExpired;
    const hasRefreshToken = !!refreshToken;
    const isAuthenticated = hasValidToken || hasRefreshToken;
    const needsLogin = !isAuthenticated;
    
    console.log('🔍 Auth Status Check:', {
      hasToken: !!token,
      hasRefreshToken,
      isExpired,
      hasValidToken,
      isAuthenticated,
      needsLogin
    });
    
    return {
      isAuthenticated,
      hasValidToken,
      tokenExpired: isExpired,
      needsLogin
    };
  }
  
  /**
   * Force redirect to login if not authenticated
   */
  static requireAuth(): boolean {
    const status = this.checkAuthStatus();
    
    if (status.needsLogin) {
      console.log('🔄 Authentication required, redirecting to login...');
      window.location.href = '/login';
      return false;
    }
    
    return true;
  }
  
  /**
   * Clear all authentication data
   */
  static clearAuth(): void {
    console.log('🗑️ Clearing authentication data...');
    TokenManager.clearTokens();
  }
  
  /**
   * Get a debug summary of auth state
   */
  static getDebugInfo(): Record<string, any> {
    const token = TokenManager.getAccessToken();
    const refreshToken = TokenManager.getRefreshToken();
    const expiresAt = TokenManager.getExpiresAt();
    const rememberMe = TokenManager.getRememberMe();
    
    return {
      hasAccessToken: !!token,
      hasRefreshToken: !!refreshToken,
      tokenLength: token?.length || 0,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      timeUntilExpiry: TokenManager.getTimeUntilExpiry(),
      rememberMe,
      isExpired: TokenManager.isTokenExpired()
    };
  }

  /**
   * Test API authentication with current token
   */
  static async testApiAuth(): Promise<boolean> {
    console.group('🌐 API AUTH TEST');
    
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        console.error('❌ No token available for testing');
        console.groupEnd();
        return false;
      }
      
      console.log('🔑 Testing with token:', `${token.substring(0, 20)}...`);
      
      // Test /me endpoint
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API auth successful!');
        console.log('👤 User data:', data);
        console.groupEnd();
        return true;
      } else {
        console.error('❌ API auth failed:', response.status, response.statusText);
        if (response.status === 401) {
          console.warn('🔄 Token may be expired or invalid - try refreshing');
        }
        console.groupEnd();
        return false;
      }
      
    } catch (error) {
      console.error('❌ API test failed:', error);
      console.groupEnd();
      return false;
    }
  }

  /**
   * Comprehensive debugging report
   */
  static fullReport(): void {
    console.clear();
    console.log('🚀 SECUREVAULT AUTH DIAGNOSTIC REPORT');
    console.log('=====================================\n');
    
    // Auth status
    const status = this.checkAuthStatus();
    console.log('📊 Current Status:', status);
    
    // Debug info
    const debugInfo = this.getDebugInfo();
    console.log('🔍 Debug Details:', debugInfo);
    
    // Storage check
    console.log('\n💾 Storage Contents:');
    console.log('  SessionStorage access_token:', sessionStorage.getItem('access_token') ? 'exists' : 'missing');
    console.log('  SessionStorage refresh_token:', sessionStorage.getItem('refresh_token') ? 'exists' : 'missing');
    console.log('  SessionStorage expires_at:', sessionStorage.getItem('expires_at'));
    console.log('  LocalStorage remember_me:', localStorage.getItem('remember_me'));
    
    console.log('\n🎯 RECOMMENDED ACTIONS:');
    if (!status.hasValidToken) {
      console.log('  1. AuthChecker.clearAuth() - Clear all auth data');
      console.log('  2. Navigate to /login and login again');
    } else {
      console.log('  Authentication appears to be working correctly');
    }
    
    console.log('\n🛠️  AVAILABLE COMMANDS:');
    console.log('  AuthChecker.clearAuth() - Clear all auth data');
    console.log('  AuthChecker.testApiAuth() - Test API with current token');
    console.log('  AuthChecker.checkAuthStatus() - Check current status');
    
    // Auto-test API if we have a token
    if (status.hasValidToken) {
      setTimeout(() => this.testApiAuth(), 100);
    }
  }

  /**
   * Set token manually for testing (useful for debugging)
   */
  static setTestToken(accessToken: string, expiresIn: number = 3600): void {
    console.log('🔧 Setting test token...');
    
    const refreshToken = 'test-refresh-token';
    TokenManager.setTokens(accessToken, refreshToken, expiresIn, false);
    console.log('✅ Test token set. Use AuthChecker.checkAuthStatus() to verify');
  }
}

// Make available globally for console debugging
(window as any).AuthChecker = AuthChecker;