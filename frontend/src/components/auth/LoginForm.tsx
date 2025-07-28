/**
 * Login Form Component for SecureVault Frontend
 * 
 * Provides secure login form with validation, error handling, and remember me functionality.
 * Includes accessibility features and responsive design.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

// Form validation schema
const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  remember_me: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

export default function LoginForm({ 
  onSuccess, 
  redirectTo,
  className = '' 
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state or use provided redirectTo
  const from = location.state?.from || redirectTo || '/dashboard';

  // Form setup with validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    clearErrors,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      remember_me: false,
    },
  });

  // Watch form fields for real-time validation
  const watchedFields = watch();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Clear errors when form values change
  useEffect(() => {
    clearError();
    clearErrors();
  }, [watchedFields.username, watchedFields.password]); // Remove function dependencies

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      
      const success = await login(data.username, data.password, data.remember_me);
      
      if (success) {
        setLoginAttempts(0);
        onSuccess?.();
        navigate(from, { replace: true });
      } else {
        // Handle login failure
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        // Rate limiting after 3 failed attempts
        if (newAttempts >= 3) {
          setIsRateLimited(true);
          setTimeout(() => {
            setIsRateLimited(false);
            setLoginAttempts(0);
          }, 300000); // 5 minute lockout
        }
        
        // Set form-level error
        if (error) {
          if (error.includes('username') || error.includes('Username') || error.includes('user')) {
            setFormError('username', { message: error });
          } else if (error.includes('password') || error.includes('Password')) {
            setFormError('password', { message: error });
          }
        }
      }
    } catch (err) {
      setFormError('root', { 
        message: 'An unexpected error occurred. Please try again.' 
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
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
        {isRateLimited && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-800">
                Too many failed attempts. Please wait 5 minutes before trying again.
              </p>
            </div>
          </div>
        )}

        {/* Login attempts warning */}
        {loginAttempts > 0 && loginAttempts < 3 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              {3 - loginAttempts} attempt{3 - loginAttempts !== 1 ? 's' : ''} remaining before temporary lockout.
            </p>
          </div>
        )}

        {/* Global error message */}
        {error && !errors.username && !errors.password && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-800">
                {typeof error === 'string' ? error : 'Login failed. Please check your credentials and try again.'}
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail 
                  className={`h-5 w-5 ${errors.username ? 'text-red-400' : 'text-gray-400'}`} 
                />
              </div>
              <input
                {...register('username')}
                id="username"
                type="text"
                autoComplete="username"
                required
                disabled={isLoading || isRateLimited}
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
                <Lock 
                  className={`h-5 w-5 ${errors.password ? 'text-red-400' : 'text-gray-400'}`} 
                />
              </div>
              <input
                {...register('password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={isLoading || isRateLimited}
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
                disabled={isLoading || isRateLimited}
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
                disabled={isLoading || isRateLimited}
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
              disabled={isLoading || isSubmitting || isRateLimited}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading || isSubmitting ? (
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