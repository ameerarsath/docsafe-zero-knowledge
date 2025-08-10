/**
 * Zero-Knowledge Login Page Component for SecureVault Frontend
 * 
 * Full page layout for zero-knowledge user authentication with branding.
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ZeroKnowledgeLoginForm from '../components/auth/ZeroKnowledgeLoginForm';
import { GuestOnly } from '../components/auth/ProtectedRoute';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { documentEncryptionService } from '../services/documentEncryption';
import useAuthStore from '../stores/authStore';
import { TokenManager } from '../services/api';
import { User } from '../types/auth';

export default function ZeroKnowledgeLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSuccess = useCallback(async (authData: any) => {
    try {
      console.log('🔑 ZeroKnowledgeLoginPage - handleLoginSuccess called with:', authData);
      console.log('🔑 LOGIN: documentEncryptionService instance:', documentEncryptionService);
      
      // Set master key in document encryption service if available
      if (authData.masterKey) {
        console.log('🔐 Setting master key in document encryption service');
        documentEncryptionService.setMasterKey(authData.masterKey);
        console.log('✅ Master key set successfully. Has master key:', documentEncryptionService.hasMasterKey());
        
        // Mark that user has zero-knowledge encryption configured
        sessionStorage.setItem('user_has_encryption', 'true');
        console.log('✅ Marked user as having zero-knowledge encryption configured');
      } else {
        console.warn('⚠️ No master key found in authData');
      }

      // Store tokens in TokenManager with proper parameters (expires_in from login response is in seconds)
      const expiresIn = authData.expires_in || 900; // Use actual expires_in from response or default
      console.log('🎫 LOGIN: Storing tokens - access_token:', authData.access_token?.substring(0, 20) + '...', 'expires_in:', expiresIn);
      
      TokenManager.setTokens(
        authData.access_token,
        authData.refresh_token,
        expiresIn,
        false // rememberMe - could be made configurable
      );
      
      // Verify tokens were stored
      const storedToken = TokenManager.getAccessToken();
      const isExpired = TokenManager.isTokenExpired();
      console.log('✅ LOGIN: Token stored successfully:', storedToken?.substring(0, 20) + '...', 'isExpired:', isExpired);

      // Create user object matching the auth store pattern
      const user: User = {
        id: authData.user_id,
        username: authData.username,
        role: authData.role as User['role'],
        must_change_password: false,
        email: '', // Will be fetched later
        is_admin: authData.role === 'admin' || authData.role === 'super_admin',
        mfa_enabled: false,
        account_locked: false,
        failed_login_attempts: 0,
        last_login: null,
        created_at: '',
        updated_at: ''
      };

      // Update auth store state directly (similar to how the normal login works)
      const authStore = useAuthStore.getState();
      authStore.setLoading(false);
      authStore.clearError();
      
      // Manually update the store state to mark user as authenticated
      useAuthStore.setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        tokens: {
          access_token: authData.access_token,
          refresh_token: authData.refresh_token,
          expires_at: Date.now() + (expiresIn * 1000),
        },
        rememberMe: false,
      });

      // Navigate to dashboard
      console.log('🚀 Navigating to dashboard');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login completion error:', error);
    }
  }, [navigate]);

  return (
    <GuestOnly>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Header with branding */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">SecureVault</h1>
            <p className="mt-2 text-sm text-gray-600">
              Zero-knowledge secure document storage
            </p>
            <div className="mt-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              🔒 Zero-Knowledge Encryption
            </div>
          </div>
        </div>

        {/* Zero-Knowledge Login Form */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <ZeroKnowledgeLoginForm onSuccess={handleLoginSuccess} />
        </div>

        {/* Registration Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Create zero-knowledge account
            </Link>
          </p>
        </div>

        {/* Legacy Login Link */}
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">
            <Link
              to="/login/legacy"
              className="text-gray-400 hover:text-gray-600"
            >
              Legacy login (for existing users)
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © 2024 SecureVault. All rights reserved.
          </p>
        </div>
      </div>
    </GuestOnly>
  );
}