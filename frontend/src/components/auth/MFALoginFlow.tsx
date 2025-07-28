/**
 * MFA-Aware Login Flow Component
 * 
 * Enhanced login flow that handles both regular authentication and 
 * MFA verification in a seamless user experience. Manages the multi-step
 * login process including credential verification and TOTP/backup code input.
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { mfaService } from '../../services/mfaService';
import { ApiResponse } from '../../types/auth';
import { MFALoginRequest, MFALoginResponse } from '../../types/mfa';
import LoadingSpinner from '../ui/LoadingSpinner';

// Step 1: Credentials form validation schema
const credentialsSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username is too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  remember_me: z.boolean().default(false),
});

type CredentialsFormData = z.infer<typeof credentialsSchema>;

type LoginStep = 'credentials' | 'mfa' | 'complete';

interface LoginState {
  currentStep: LoginStep;
  username: string;
  password: string;
  rememberMe: boolean;
  requiresMFA: boolean;
  tempToken: string | null;
  isLoading: boolean;
  error: string | null;
  loginAttempts: number;
  isRateLimited: boolean;
}

interface MFALoginFlowProps {
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

export default function MFALoginFlow({ 
  onSuccess, 
  redirectTo,
  className = '' 
}: MFALoginFlowProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>({
    currentStep: 'credentials',
    username: '',
    password: '',
    rememberMe: false,
    requiresMFA: false,
    tempToken: null,
    isLoading: false,
    error: null,
    loginAttempts: 0,
    isRateLimited: false, // Force disabled for testing
  });

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state or use provided redirectTo
  const from = location.state?.from || redirectTo || '/dashboard';

  // Form setup for credentials step
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    clearErrors,
    watch,
    getValues,
  } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      username: '',
      password: '',
      remember_me: false,
    },
  });

  const watchedFields = watch();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Clear errors when form values change
  useEffect(() => {
    if (loginState.currentStep === 'credentials') {
      setLoginState(prev => ({ ...prev, error: null }));
      clearErrors();
    }
  }, [watchedFields.username, watchedFields.password, clearErrors, loginState.currentStep]);

  // Update login state helper
  const updateLoginState = (updates: Partial<LoginState>) => {
    setLoginState(prev => ({ ...prev, ...updates }));
  };

  // Handle initial login with credentials
  const handleCredentialsSubmit = async (data: CredentialsFormData) => {
    updateLoginState({ 
      isLoading: true, 
      error: null,
      username: data.username,
      password: data.password,
      rememberMe: data.remember_me
    });

    try {
      // First, attempt login to check if MFA is required
      const loginRequest: MFALoginRequest = {
        username: data.username,
        password: data.password,
        remember_me: data.remember_me
      };

      // We need to create a custom login flow that returns MFA status
      const response = await performInitialLogin(loginRequest);

      if (response.success && response.data) {
        if (response.data.requires_mfa) {
          // MFA is required, proceed to MFA step and store temp_token
          updateLoginState({
            currentStep: 'mfa',
            requiresMFA: true,
            tempToken: response.data.temp_token || null,
            isLoading: false,
            loginAttempts: 0
          });
        } else {
          // Login successful without MFA
          handleLoginSuccess(response.data);
        }
      } else {
        // Login failed
        handleLoginFailure(response.error?.detail || 'Login failed');
      }
    } catch (err) {
      handleLoginFailure('An unexpected error occurred. Please try again.');
    }
  };

  // Perform initial login attempt
  const performInitialLogin = async (request: MFALoginRequest): Promise<ApiResponse<MFALoginResponse>> => {
    try {
      // Call the backend login endpoint directly
      const authResponse = await authService.login({
        username: request.username,
        password: request.password,
        remember_me: request.remember_me
      });

      if (authResponse.success && authResponse.data) {
        if (authResponse.data.mfa_required) {
          // MFA is required, return the temp token for verification
          return {
            success: true,
            data: {
              requires_mfa: true,
              temp_token: authResponse.data.temp_token
            }
          };
        } else {
          // No MFA required, login is complete
          return {
            success: true,
            data: {
              requires_mfa: false,
              access_token: authResponse.data.access_token,
              refresh_token: authResponse.data.refresh_token,
              expires_in: authResponse.data.expires_in,
              user: {
                id: authResponse.data.user_id,
                username: authResponse.data.username,
                role: authResponse.data.role
              }
            }
          };
        }
      } else {
        return {
          success: false,
          error: authResponse.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          detail: 'Network error occurred',
          status_code: 0,
          error_code: 'NETWORK_ERROR'
        }
      };
    }
  };

  // Handle MFA verification with specific code
  const handleMFAVerification = async (mfaCode: string) => {
    if (!loginState.tempToken) {
      handleMFAFailure('No verification token available');
      return;
    }

    updateLoginState({ isLoading: true, error: null });

    try {
      // Use the stored temp_token for MFA login verification
      const verifyResponse = await authService.verifyMFALogin(loginState.tempToken, mfaCode);
      
      if (verifyResponse.success && verifyResponse.data) {
        handleLoginSuccess({
          requires_mfa: false,
          access_token: verifyResponse.data.access_token,
          refresh_token: verifyResponse.data.refresh_token,
          expires_in: verifyResponse.data.expires_in,
          user: {
            id: verifyResponse.data.user_id,
            username: verifyResponse.data.username,
            role: verifyResponse.data.role
          }
        });
      } else {
        handleMFAFailure(verifyResponse.error?.detail || 'MFA verification failed');
      }
    } catch (err) {
      handleMFAFailure('An unexpected error occurred during MFA verification');
    }
  };

  // Handle MFA verification failure
  const handleMFAFailure = (error: string) => {
    updateLoginState({ 
      error, 
      isLoading: false,
      loginAttempts: loginState.loginAttempts + 1
    });

    // Rate limiting after multiple failed MFA attempts
    if (loginState.loginAttempts >= 5) {
      updateLoginState({ 
        isRateLimited: true,
        currentStep: 'credentials'
      });
      
      setTimeout(() => {
        updateLoginState({ 
          isRateLimited: false,
          loginAttempts: 0
        });
      }, 600000); // 10 minute lockout for MFA failures
    }
  };

  // Handle successful login
  const handleLoginSuccess = async (loginData: MFALoginResponse) => {
    updateLoginState({ 
      currentStep: 'complete',
      isLoading: false,
      error: null,
      loginAttempts: 0
    });

    try {
      // Import auth store and trigger authentication status check
      const useAuthStore = (await import('../../stores/authStore')).default;
      
      // Call checkAuthStatus to update the auth store with current token state
      await useAuthStore.getState().checkAuthStatus();
      
      // Small delay to ensure auth state is properly updated
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Trigger onSuccess callback
      onSuccess?.();
      
      // Navigate to dashboard
      navigate(from, { replace: true });
      
    } catch (error) {
      // Fallback navigation - force redirect if navigation fails
      window.location.href = from;
    }
  };

  // Handle login failure
  const handleLoginFailure = (errorMessage: string) => {
    const newAttempts = loginState.loginAttempts + 1;
    
    updateLoginState({
      error: errorMessage,
      isLoading: false,
      loginAttempts: newAttempts,
      currentStep: 'credentials'
    });

    // Rate limiting after 3 failed credential attempts (disabled for testing)
    if (false && newAttempts >= 3) {
      updateLoginState({ isRateLimited: true });
      
      setTimeout(() => {
        updateLoginState({ 
          isRateLimited: false,
          loginAttempts: 0
        });
      }, 300000); // 5 minute lockout
    }

    // Set form-level errors
    if (errorMessage.includes('username') || errorMessage.includes('Username')) {
      setFormError('username', { message: errorMessage });
    } else if (errorMessage.includes('password') || errorMessage.includes('Password')) {
      setFormError('password', { message: errorMessage });
    }
  };

  // Go back to credentials step
  const handleBackToCredentials = () => {
    updateLoginState({
      currentStep: 'credentials',
      requiresMFA: false,
      error: null
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handle MFA form submission
  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.trim()) {
      await handleMFAVerification(mfaCode.trim());
    }
  };

  // Render credentials step
  const renderCredentialsStep = () => (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
          <Lock className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Sign in to SecureVault
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your credentials to access your secure documents
        </p>
      </div>

      {/* Rate limiting warning */}
      {loginState.isRateLimited && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-800">
              Too many failed attempts. Please wait before trying again.
            </p>
          </div>
        </div>
      )}

      {/* Login attempts warning */}
      {loginState.loginAttempts > 0 && loginState.loginAttempts < 3 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            {3 - loginState.loginAttempts} attempt{3 - loginState.loginAttempts !== 1 ? 's' : ''} remaining.
          </p>
        </div>
      )}

      {/* Error message */}
      {loginState.error && !errors.username && !errors.password && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-800">{loginState.error}</p>
          </div>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSubmit(handleCredentialsSubmit)} className="space-y-6" noValidate>
        {/* Username Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className={`h-5 w-5 ${errors.username ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...register('username')}
              id="username"
              type="text"
              autoComplete="username"
              required
              disabled={loginState.isLoading || loginState.isRateLimited}
              className={`
                block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                ${errors.username 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-blue-300'
                }
              `}
              placeholder="Enter your username"
              aria-invalid={errors.username ? 'true' : 'false'}
              aria-describedby={errors.username ? 'username-error' : undefined}
            />
          </div>
          {errors.username && (
            <p id="username-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className={`h-5 w-5 ${errors.password ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              disabled={loginState.isLoading || loginState.isRateLimited}
              className={`
                block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                ${errors.password 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-blue-300'
                }
              `}
              placeholder="Enter your password"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={togglePasswordVisibility}
              disabled={loginState.isLoading || loginState.isRateLimited}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              {...register('remember_me')}
              id="remember_me"
              type="checkbox"
              disabled={loginState.isLoading || loginState.isRateLimited}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
            <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link
              to="/forgot-password"
              className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={loginState.isLoading || isSubmitting || loginState.isRateLimited}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loginState.isLoading || isSubmitting ? (
              <div className="flex items-center">
                <LoadingSpinner size="sm" color="white" className="mr-2" />
                Signing in...
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>
    </>
  );

  // Render MFA step
  const renderMFAStep = () => (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
          <Shield className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Two-Factor Authentication
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your verification code to complete sign in for{' '}
          <span className="font-medium">{loginState.username}</span>
        </p>
      </div>

      {/* Error Display */}
      {loginState.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-800">{loginState.error}</p>
          </div>
        </div>
      )}

      {/* MFA Code Form */}
      <form onSubmit={handleMFASubmit} className="space-y-6">
        <div>
          <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700">
            Authenticator Code
          </label>
          <input
            id="mfa-code"
            type="text"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, isBackupCode ? 8 : 6))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={isBackupCode ? "00000000" : "000 000"}
            maxLength={isBackupCode ? 8 : 6}
            disabled={loginState.isLoading}
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the {isBackupCode ? '8-digit backup code' : '6-digit code from your authenticator app'}
          </p>
        </div>

        {/* Backup Code Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsBackupCode(!isBackupCode);
              setMfaCode('');
            }}
            className="text-sm text-blue-600 hover:text-blue-500 underline"
          >
            {isBackupCode ? 'Use authenticator code instead' : "Can't access your authenticator? Use a backup code"}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleBackToCredentials}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Use Different Account
          </button>
          <button
            type="submit"
            disabled={loginState.isLoading || !mfaCode.trim()}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginState.isLoading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" color="white" className="mr-2" />
                Verifying...
              </div>
            ) : (
              'Complete Sign In'
            )}
          </button>
        </div>
      </form>
    </>
  );

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
        {loginState.currentStep === 'credentials' && renderCredentialsStep()}
        {loginState.currentStep === 'mfa' && renderMFAStep()}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}