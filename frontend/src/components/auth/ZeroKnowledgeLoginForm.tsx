/**
 * Zero-Knowledge Two-Stage Login Form Component
 * 
 * Implements the two-stage login flow for zero-knowledge encryption:
 * Stage 1: Standard username/password authentication
 * Stage 2: Encryption password entry and master key derivation
 */

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { 
  User, Lock, Eye, EyeOff, Shield, Key, 
  CheckCircle, ArrowRight, AlertCircle,
  Loader2, LogIn, Zap, Unlock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  deriveKey, 
  verifyKeyValidation,
  base64ToUint8Array,
  isWebCryptoSupported,
  uint8ArrayToBase64
} from '../../utils/encryption';
import { apiRequest } from '../../services/api';
import { documentEncryptionService } from '../../services/documentEncryption';
import LoadingSpinner from '../ui/LoadingSpinner';

// Validation schemas for each stage
const stage1Schema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username is too long'),
  loginPassword: z
    .string()
    .min(1, 'Password is required')
});

const stage2Schema = z.object({
  encryptionPassword: z
    .string()
    .min(1, 'Encryption password is required')
});

type Stage1Data = z.infer<typeof stage1Schema>;
type Stage2Data = z.infer<typeof stage2Schema>;

interface LoginData {
  access_token: string;
  refresh_token: string;
  user_id: number;
  username: string;
  role: string;
  encryption_salt?: string;
  key_verification_payload?: string;
  encryption_method?: string;
  key_derivation_iterations?: number;
}

interface ZeroKnowledgeLoginFormProps {
  onSuccess?: (data: LoginData & { masterKey: CryptoKey }) => void;
  onCancel?: () => void;
  className?: string;
}

interface Stage1Response {
  access_token: string;
  refresh_token: string;
  user_id: number;
  username: string;
  role: string;
  must_change_password: boolean;
  mfa_required: boolean;
  // Zero-Knowledge encryption parameters
  encryption_salt?: string;
  key_verification_payload?: string;
  encryption_method?: string;
  key_derivation_iterations?: number;
}

export default function ZeroKnowledgeLoginForm({
  onSuccess,
  onCancel,
  className = ''
}: ZeroKnowledgeLoginFormProps) {
  const [currentStage, setCurrentStage] = useState<1 | 2>(1);
  const [stage1Response, setStage1Response] = useState<Stage1Response | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showEncryptionPassword, setShowEncryptionPassword] = useState(false);
  
  // Use auth context and navigation
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check Web Crypto API support
  if (!isWebCryptoSupported()) {
    return (
      <div className={`w-full max-w-md mx-auto ${className}`}>
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Browser Not Supported
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your browser doesn't support the Web Crypto API required for zero-knowledge encryption.
              Please use a modern browser like Chrome, Firefox, Safari, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stage1Form = useForm<Stage1Data>({
    resolver: zodResolver(stage1Schema),
    defaultValues: {
      username: '',
      loginPassword: '',
    },
  });

  const stage2Form = useForm<Stage2Data>({
    resolver: zodResolver(stage2Schema),
    defaultValues: {
      encryptionPassword: '',
    },
  });

  const clearError = useCallback(() => setError(null), []);

  const handleStage1Submit = useCallback(async (data: Stage1Data) => {
    clearError();
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/auth/login', {
        username: data.username,
        password: data.loginPassword
      });

      if (response.success) {
        const loginData = response.data as Stage1Response;
        
        // Check if user has zero-knowledge encryption configured
        if (loginData.encryption_salt && loginData.key_verification_payload) {
          // User has encryption configured, proceed to Stage 2
          setStage1Response(loginData);
          setCurrentStage(2);
        } else {
          // User doesn't have encryption configured, complete login without Stage 2
          onSuccess?.({
            access_token: loginData.access_token,
            refresh_token: loginData.refresh_token,
            user_id: loginData.user_id,
            username: loginData.username,
            role: loginData.role,
            masterKey: null as any // No encryption configured
          });
        }
      } else {
        const errorDetail = response.error?.detail || 'Login failed';
        const errorCode = response.error?.error_code;

        // Provide specific messages for different error types
        if (errorCode === 'RATE_LIMITED') {
          setError('Too many login attempts. Please wait a few minutes before trying again.');
        } else if (errorCode === 'UNAUTHORIZED') {
          setError('Invalid credentials. Please check your username and password.');
        } else if (errorCode === 'CONNECTION_REFUSED' || errorCode === 'NETWORK_ERROR') {
          setError('Cannot connect to the server. Please check your internet connection.');
        } else {
          setError(errorDetail);
        }
      }
    } catch (err: any) {
      console.error('Stage 1 login error:', err);
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [clearError, onSuccess]);

  const handleStage2Submit = useCallback(async (data: Stage2Data) => {
    if (!stage1Response) {
      setError('Session expired. Please restart login.');
      setCurrentStage(1);
      return;
    }

    clearError();
    setIsLoading(true);

    try {
      // Derive master key from encryption password
      // Handle both base64-encoded salt and plain text salt
      let salt: Uint8Array;
      try {
        // Try to decode as base64 first
        salt = base64ToUint8Array(stage1Response.encryption_salt!);
      } catch {
        // If base64 decoding fails, treat as plain text and encode it
        console.log('Salt is not base64, treating as plain text');
        salt = new TextEncoder().encode(stage1Response.encryption_salt!);
      }
      let masterKey = await deriveKey({
        password: data.encryptionPassword,
        salt,
        iterations: stage1Response.key_derivation_iterations || 500000
      });

      // Verify the derived key using the verification payload
      
      // Validate only the entered password
      let isValidKey = false;
      
      try {
        // Validate the entered encryption password
        isValidKey = await verifyKeyValidation(
          stage1Response.username,
          masterKey,
          stage1Response.key_verification_payload!
        );

      } catch (validationError) {
        console.error('Key validation error:', validationError);
      }

      if (!isValidKey) {
        setError('Invalid encryption password. Please check your password and try again.');
        return;
      }

      // Key is valid, complete login with master key
      onSuccess?.({
        access_token: stage1Response.access_token,
        refresh_token: stage1Response.refresh_token,
        user_id: stage1Response.user_id,
        username: stage1Response.username,
        role: stage1Response.role,
        encryption_salt: stage1Response.encryption_salt,
        key_verification_payload: stage1Response.key_verification_payload,
        encryption_method: stage1Response.encryption_method,
        key_derivation_iterations: stage1Response.key_derivation_iterations,
        masterKey
      });

    } catch (err: any) {
      console.error('Stage 2 encryption error:', err);
      setError('Failed to verify encryption password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [clearError, stage1Response, onSuccess]);

  const goBack = useCallback(() => {
    clearError();
    setCurrentStage(1);
    setStage1Response(null);
    stage2Form.reset();
  }, [clearError, stage2Form]);

  // Stage 1: Standard Login
  const renderStage1 = () => (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
          <LogIn className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Sign In
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your credentials to access your secure documents
        </p>
      </div>

      <form onSubmit={stage1Form.handleSubmit(handleStage1Submit)} className="space-y-6">
        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username or Email
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className={`h-5 w-5 ${stage1Form.formState.errors.username ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...stage1Form.register('username')}
              id="username"
              type="text"
              autoComplete="username"
              disabled={isLoading}
              className={`
                block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                disabled:bg-gray-50 disabled:text-gray-500
                ${stage1Form.formState.errors.username 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-blue-300'
                }
              `}
              placeholder="Enter your username or email"
            />
          </div>
          {stage1Form.formState.errors.username && (
            <p className="mt-1 text-sm text-red-600">
              {stage1Form.formState.errors.username.message}
            </p>
          )}
        </div>

        {/* Login Password */}
        <div>
          <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700">
            Login Password
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className={`h-5 w-5 ${stage1Form.formState.errors.loginPassword ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...stage1Form.register('loginPassword')}
              id="loginPassword"
              type={showLoginPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isLoading}
              className={`
                block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                disabled:bg-gray-50 disabled:text-gray-500
                ${stage1Form.formState.errors.loginPassword 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-blue-300'
                }
              `}
              placeholder="Enter your login password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowLoginPassword(!showLoginPassword)}
              disabled={isLoading}
            >
              {showLoginPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {stage1Form.formState.errors.loginPassword && (
            <p className="mt-1 text-sm text-red-600">
              {stage1Form.formState.errors.loginPassword.message}
            </p>
          )}
        </div>

        <div className="flex justify-between">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 max-w-xs ml-auto px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 inline-flex items-center justify-center disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  // Stage 2: Encryption Password
  const renderStage2 = () => (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
          <Shield className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Unlock Your Documents
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your encryption password to access your secure documents
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
        <div className="flex">
          <Key className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium">Zero-Knowledge Encryption</p>
            <p className="mt-1">
              Your documents are encrypted with zero-knowledge technology. Only you have access 
              to this encryption password - the server cannot see it or recover it.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={stage2Form.handleSubmit(handleStage2Submit)} className="space-y-6">
        {/* Encryption Password */}
        <div>
          <label htmlFor="encryptionPassword" className="block text-sm font-medium text-gray-700">
            Encryption Password
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className={`h-5 w-5 ${stage2Form.formState.errors.encryptionPassword ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...stage2Form.register('encryptionPassword')}
              id="encryptionPassword"
              type={showEncryptionPassword ? 'text' : 'password'}
              autoComplete="off"
              disabled={isLoading}
              className={`
                block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                disabled:bg-gray-50 disabled:text-gray-500
                ${stage2Form.formState.errors.encryptionPassword 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-green-300'
                }
              `}
              placeholder="Enter your encryption password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowEncryptionPassword(!showEncryptionPassword)}
              disabled={isLoading}
            >
              {showEncryptionPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {stage2Form.formState.errors.encryptionPassword && (
            <p className="mt-1 text-sm text-red-600">
              {stage2Form.formState.errors.encryptionPassword.message}
            </p>
          )}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 inline-flex items-center"
          >
            Back to Login
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 inline-flex items-center disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                <Unlock className="mr-2 h-4 w-4" />
                Unlock Documents
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStage >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className="ml-3 text-sm">
              <p className={`font-medium ${currentStage >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
                Authentication
              </p>
            </div>
            <div className={`flex-1 h-0.5 mx-4 ${currentStage > 1 ? 'bg-green-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStage >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <div className="ml-3 text-sm">
              <p className={`font-medium ${currentStage >= 2 ? 'text-green-600' : 'text-gray-500'}`}>
                Encryption
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Current Stage Content */}
        {currentStage === 1 ? renderStage1() : renderStage2()}
      </div>
    </div>
  );
}