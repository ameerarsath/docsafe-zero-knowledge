/**
 * User Registration Form Component for SecureVault Frontend
 * 
 * Admin-only user creation form with comprehensive validation,
 * role selection, and security features.
 */

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Mail, User as UserIcon, Lock, Eye, EyeOff, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types/auth';
import LoadingSpinner from '../ui/LoadingSpinner';

// User registration validation schema
const registrationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(254, 'Email is too long'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    ),
  confirm_password: z
    .string()
    .min(1, 'Please confirm the password'),
  role: z.enum(['super_admin', 'admin', 'manager', 'user', 'viewer'] as const),
  must_change_password: z.boolean().default(true),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface UserRegistrationFormProps {
  onSuccess?: (user: User) => void;
  onCancel?: () => void;
  className?: string;
}

// Role descriptions for better UX
const roleDescriptions: Record<User['role'], string> = {
  super_admin: 'Full system access including user management and system configuration',
  admin: 'Administrative access with user management capabilities',
  manager: 'Manage documents and users within their department',
  user: 'Upload, view, and manage own documents with sharing capabilities',
  viewer: 'View and download shared documents only',
};

const roleColors: Record<User['role'], string> = {
  super_admin: 'bg-purple-50 border-purple-200 text-purple-800',
  admin: 'bg-red-50 border-red-200 text-red-800',
  manager: 'bg-blue-50 border-blue-200 text-blue-800',
  user: 'bg-green-50 border-green-200 text-green-800',
  viewer: 'bg-gray-50 border-gray-200 text-gray-800',
};

export default function UserRegistrationForm({ 
  onSuccess, 
  onCancel, 
  className = '' 
}: UserRegistrationFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState<User | null>(null);

  const { createUser, isLoading, error, clearError, isAdmin } = useAuth();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError: setFormError,
    clearErrors,
    watch,
    reset,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirm_password: '',
      role: 'user',
      must_change_password: true,
    },
  });

  // Watch form fields for real-time validation
  const watchedFields = watch();

  // Clear errors when form values change
  React.useEffect(() => {
    clearError();
    clearErrors();
  }, [
    watchedFields.email, 
    watchedFields.username, 
    watchedFields.password, 
    watchedFields.confirm_password,
    clearError, 
    clearErrors
  ]);

  // Check admin permissions
  if (!isAdmin()) {
    return (
      <div className={`w-full max-w-md mx-auto ${className}`}>
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Only administrators can create new users.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      clearError();
      
      const userData = {
        email: data.email,
        username: data.username,
        password: data.password,
        role: data.role,
        must_change_password: data.must_change_password,
      };

      const success = await createUser(userData);
      
      if (success) {
        setIsSuccess(true);
        // In a real implementation, you'd get the created user data back
        const newUser: User = {
          id: Date.now(), // Placeholder - would come from API
          email: data.email,
          username: data.username,
          role: data.role,
          is_admin: ['super_admin', 'admin'].includes(data.role),
          mfa_enabled: false,
          must_change_password: data.must_change_password,
          account_locked: false,
          failed_login_attempts: 0,
          last_login: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        setCreatedUser(newUser);
        onSuccess?.(newUser);
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setIsSuccess(false);
          setCreatedUser(null);
          reset();
        }, 3000);
      } else {
        // Handle specific field errors
        if (error) {
          if (error.includes('email') || error.includes('Email')) {
            setFormError('email', { message: error });
          } else if (error.includes('username') || error.includes('Username')) {
            setFormError('username', { message: error });
          } else {
            setFormError('root', { message: error });
          }
        }
      }
    } catch (err) {
      setFormError('root', { 
        message: 'An unexpected error occurred. Please try again.' 
      });
    }
  };

  // Success state
  if (isSuccess && createdUser) {
    return (
      <div className={`w-full max-w-md mx-auto ${className}`}>
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              User Created Successfully
            </h2>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">
                {createdUser.username} ({createdUser.email})
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Role: {roleDescriptions[createdUser.role]}
              </p>
              {createdUser.must_change_password && (
                <p className="text-xs text-yellow-600 mt-1">
                  ⚠️ User must change password on first login
                </p>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              The user can now sign in with their credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Create New User
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Add a new user to the SecureVault system
          </p>
        </div>

        {/* Global error message */}
        {error && !Object.keys(errors).length && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 ${errors.email ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  className={`
                    block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    disabled:bg-gray-50 disabled:text-gray-500
                    ${errors.email 
                      ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 text-gray-900 focus:border-blue-300'
                    }
                  `}
                  placeholder="user@example.com"
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className={`h-5 w-5 ${errors.username ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  {...register('username')}
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={isLoading}
                  className={`
                    block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    disabled:bg-gray-50 disabled:text-gray-500
                    ${errors.username 
                      ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 text-gray-900 focus:border-blue-300'
                    }
                  `}
                  placeholder="username"
                  aria-invalid={errors.username ? 'true' : 'false'}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.username.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 ${errors.password ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  className={`
                    block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    disabled:bg-gray-50 disabled:text-gray-500
                    ${errors.password 
                      ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 text-gray-900 focus:border-blue-300'
                    }
                  `}
                  placeholder="Enter password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 ${errors.confirm_password ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                <input
                  {...register('confirm_password')}
                  id="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading}
                  className={`
                    block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    disabled:bg-gray-50 disabled:text-gray-500
                    ${errors.confirm_password 
                      ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 text-gray-900 focus:border-blue-300'
                    }
                  `}
                  placeholder="Confirm password"
                  aria-invalid={errors.confirm_password ? 'true' : 'false'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              User Role *
            </label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  {Object.entries(roleDescriptions).map(([role, description]) => (
                    <label
                      key={role}
                      className={`
                        relative flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50
                        ${field.value === role ? roleColors[role as User['role']] : 'border-gray-200'}
                      `}
                    >
                      <input
                        type="radio"
                        {...field}
                        value={role}
                        checked={field.value === role}
                        disabled={isLoading}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <span className="text-sm font-medium capitalize">
                            {role.replace('_', ' ')}
                          </span>
                          {['super_admin', 'admin'].includes(role) && (
                            <Shield className="h-4 w-4 ml-2 text-red-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.role && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.role.message}
              </p>
            )}
          </div>

          {/* Must Change Password */}
          <div className="flex items-center">
            <input
              {...register('must_change_password')}
              id="must_change_password"
              type="checkbox"
              disabled={isLoading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
            <label htmlFor="must_change_password" className="ml-2 block text-sm text-gray-900">
              Require password change on first login
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || isSubmitting ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" color="white" className="mr-2" />
                  Creating User...
                </div>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}