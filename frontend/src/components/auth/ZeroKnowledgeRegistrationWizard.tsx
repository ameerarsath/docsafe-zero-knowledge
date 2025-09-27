/**
 * Zero-Knowledge Registration Wizard Component
 * 
 * Multi-step registration wizard that sets up both login authentication
 * and zero-knowledge client-side encryption for new users.
 */

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User, Mail, Lock, Eye, EyeOff, Shield, Key, 
  CheckCircle, ArrowRight, ArrowLeft, AlertCircle,
  Loader2, Info, Zap
} from 'lucide-react';
import { 
  generateSalt, 
  deriveKey, 
  createValidationPayload,
  uint8ArrayToBase64,
  isWebCryptoSupported,
  validateEncryptionParameters
} from '../../utils/encryption';
import { apiRequest } from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';

// Validation schemas for each step
const step1Schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(254, 'Email is too long'),
  loginPassword: z
    .string()
    .min(10, 'Login password must be at least 10 characters')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    ),
  confirmLoginPassword: z.string().min(1, 'Please confirm the password'),
  fullName: z.string().optional(),
}).refine((data) => data.loginPassword === data.confirmLoginPassword, {
  message: "Passwords don't match",
  path: ["confirmLoginPassword"],
});

const step2Schema = z.object({
  encryptionPassword: z
    .string()
    .min(12, 'Encryption password must be at least 12 characters for security')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    ),
  confirmEncryptionPassword: z.string().min(1, 'Please confirm the encryption password'),
  keyDerivationIterations: z.number().min(100000).default(500000),
}).refine((data) => data.encryptionPassword === data.confirmEncryptionPassword, {
  message: "Encryption passwords don't match",
  path: ["confirmEncryptionPassword"],
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

interface ZeroKnowledgeRegistrationWizardProps {
  onSuccess?: (data: { user_id: number; username: string }) => void;
  onCancel?: () => void;
  className?: string;
}

interface RegistrationState {
  step1Data?: Step1Data;
  step2Data?: Step2Data;
  encryptionSalt?: string;
  keyVerificationPayload?: string;
  isGeneratingKeys?: boolean;
  registrationComplete?: boolean;
}

const STEPS = [
  { id: 1, title: 'Account Details', description: 'Create your login credentials' },
  { id: 2, title: 'Encryption Setup', description: 'Set up zero-knowledge encryption' },
  { id: 3, title: 'Key Generation', description: 'Generating encryption keys' },
  { id: 4, title: 'Complete', description: 'Registration successful' },
];

export default function ZeroKnowledgeRegistrationWizard({
  onSuccess,
  onCancel,
  className = ''
}: ZeroKnowledgeRegistrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<RegistrationState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showEncryptionPassword, setShowEncryptionPassword] = useState(false);

  // Check Web Crypto API support
  if (!isWebCryptoSupported()) {
    return (
      <div className={`w-full max-w-2xl mx-auto ${className}`}>
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

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      username: '',
      email: '',
      loginPassword: '',
      confirmLoginPassword: '',
      fullName: '',
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      encryptionPassword: '',
      confirmEncryptionPassword: '',
      keyDerivationIterations: 500000,
    },
  });

  const clearError = useCallback(() => setError(null), []);

  const handleStep1Submit = useCallback(async (data: Step1Data) => {
    clearError();
    setState(prev => ({ ...prev, step1Data: data }));
    setCurrentStep(2);
  }, [clearError]);

  const handleStep2Submit = useCallback(async (data: Step2Data) => {
    clearError();
    setIsLoading(true);
    setCurrentStep(3);

    try {
      // Generate encryption salt
      const salt = generateSalt(32);
      const saltBase64 = uint8ArrayToBase64(salt);

      // Derive master key from encryption password
      const masterKey = await deriveKey({
        password: data.encryptionPassword,
        salt,
        iterations: data.keyDerivationIterations
      });

      // Create validation payload
      const validationPayload = await createValidationPayload(
        state.step1Data!.username,
        masterKey
      );

      setState(prev => ({
        ...prev,
        step2Data: data,
        encryptionSalt: saltBase64,
        keyVerificationPayload: JSON.stringify(validationPayload)
      }));

      // Proceed to registration
      await performRegistration({
        ...state.step1Data!,
        ...data,
        encryptionSalt: saltBase64,
        keyVerificationPayload: JSON.stringify(validationPayload)
      });

    } catch (err) {
      console.error('Key generation error:', err);
      setError('Failed to generate encryption keys. Please try again.');
      setCurrentStep(2);
    } finally {
      setIsLoading(false);
    }
  }, [clearError, state.step1Data]);

  const performRegistration = useCallback(async (registrationData: any) => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', {
        username: registrationData.username,
        email: registrationData.email,
        password: registrationData.loginPassword,
        full_name: registrationData.fullName || undefined,
        encryption_salt: registrationData.encryptionSalt,
        key_verification_payload: registrationData.keyVerificationPayload,
        encryption_method: 'PBKDF2-SHA256',
        key_derivation_iterations: registrationData.keyDerivationIterations
      });

      if (response.success) {
        setState(prev => ({ ...prev, registrationComplete: true }));
        setCurrentStep(4);
        onSuccess?.(response.data as { user_id: number; username: string });
      } else {
        throw new Error(response.error?.detail || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      setCurrentStep(2);
    }
  }, [onSuccess]);

  const goBack = useCallback(() => {
    clearError();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, clearError]);

  // Step 1: Account Details
  const renderStep1 = () => (
    <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className={`h-5 w-5 ${step1Form.formState.errors.username ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...step1Form.register('username')}
              id="username"
              type="text"
              autoComplete="username"
              className={`
                block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${step1Form.formState.errors.username 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-blue-300'
                }
              `}
              placeholder="Choose a username"
            />
          </div>
          {step1Form.formState.errors.username && (
            <p className="mt-1 text-sm text-red-600">
              {step1Form.formState.errors.username.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className={`h-5 w-5 ${step1Form.formState.errors.email ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...step1Form.register('email')}
              id="email"
              type="email"
              autoComplete="email"
              className={`
                block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${step1Form.formState.errors.email 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-blue-300'
                }
              `}
              placeholder="your.email@example.com"
            />
          </div>
          {step1Form.formState.errors.email && (
            <p className="mt-1 text-sm text-red-600">
              {step1Form.formState.errors.email.message}
            </p>
          )}
        </div>
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
          Full Name (Optional)
        </label>
        <div className="mt-1">
          <input
            {...step1Form.register('fullName')}
            id="fullName"
            type="text"
            autoComplete="name"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-blue-300"
            placeholder="Your full name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Login Password */}
        <div>
          <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700">
            Login Password *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className={`h-5 w-5 ${step1Form.formState.errors.loginPassword ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...step1Form.register('loginPassword')}
              id="loginPassword"
              type={showLoginPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`
                block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${step1Form.formState.errors.loginPassword 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-blue-300'
                }
              `}
              placeholder="Create login password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowLoginPassword(!showLoginPassword)}
            >
              {showLoginPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {step1Form.formState.errors.loginPassword && (
            <p className="mt-1 text-sm text-red-600">
              {step1Form.formState.errors.loginPassword.message}
            </p>
          )}
        </div>

        {/* Confirm Login Password */}
        <div>
          <label htmlFor="confirmLoginPassword" className="block text-sm font-medium text-gray-700">
            Confirm Login Password *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className={`h-5 w-5 ${step1Form.formState.errors.confirmLoginPassword ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...step1Form.register('confirmLoginPassword')}
              id="confirmLoginPassword"
              type={showLoginPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`
                block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${step1Form.formState.errors.confirmLoginPassword 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-blue-300'
                }
              `}
              placeholder="Confirm login password"
            />
          </div>
          {step1Form.formState.errors.confirmLoginPassword && (
            <p className="mt-1 text-sm text-red-600">
              {step1Form.formState.errors.confirmLoginPassword.message}
            </p>
          )}
        </div>
      </div>

      {/* Info about two passwords */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Why two different passwords?</p>
            <p className="mt-1">
              Your <strong>login password</strong> authenticates you to the system, while your 
              <strong> encryption password</strong> (next step) protects your documents with 
              zero-knowledge encryption. This separation ensures maximum security.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 inline-flex items-center"
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </form>
  );

  // Step 2: Encryption Setup
  const renderStep2 = () => (
    <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <div className="flex">
          <Shield className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium">Zero-Knowledge Encryption</p>
            <p className="mt-1">
              This password will encrypt your documents locally in your browser. The server will 
              never see this password or your encryption keys. <strong>If you forget this password, 
              your documents cannot be recovered.</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Encryption Password */}
        <div>
          <label htmlFor="encryptionPassword" className="block text-sm font-medium text-gray-700">
            Encryption Password *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className={`h-5 w-5 ${step2Form.formState.errors.encryptionPassword ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...step2Form.register('encryptionPassword')}
              id="encryptionPassword"
              type={showEncryptionPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`
                block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                ${step2Form.formState.errors.encryptionPassword 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-green-300'
                }
              `}
              placeholder="Create encryption password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowEncryptionPassword(!showEncryptionPassword)}
            >
              {showEncryptionPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {step2Form.formState.errors.encryptionPassword && (
            <p className="mt-1 text-sm text-red-600">
              {step2Form.formState.errors.encryptionPassword.message}
            </p>
          )}
        </div>

        {/* Confirm Encryption Password */}
        <div>
          <label htmlFor="confirmEncryptionPassword" className="block text-sm font-medium text-gray-700">
            Confirm Encryption Password *
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className={`h-5 w-5 ${step2Form.formState.errors.confirmEncryptionPassword ? 'text-red-400' : 'text-gray-400'}`} />
            </div>
            <input
              {...step2Form.register('confirmEncryptionPassword')}
              id="confirmEncryptionPassword"
              type={showEncryptionPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`
                block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                ${step2Form.formState.errors.confirmEncryptionPassword 
                  ? 'border-red-300 text-red-900 focus:border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 text-gray-900 focus:border-green-300'
                }
              `}
              placeholder="Confirm encryption password"
            />
          </div>
          {step2Form.formState.errors.confirmEncryptionPassword && (
            <p className="mt-1 text-sm text-red-600">
              {step2Form.formState.errors.confirmEncryptionPassword.message}
            </p>
          )}
        </div>
      </div>

      {/* Security Level */}
      <div>
        <label htmlFor="keyDerivationIterations" className="block text-sm font-medium text-gray-700">
          Security Level
        </label>
        <div className="mt-1">
          <select
            {...step2Form.register('keyDerivationIterations', { valueAsNumber: true })}
            id="keyDerivationIterations"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:border-green-300"
          >
            <option value={100000}>Standard (100K iterations)</option>
            <option value={250000}>High (250K iterations)</option>
            <option value={500000}>Maximum (500K iterations) - Recommended</option>
          </select>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Higher security levels take longer to process but provide better protection against attacks.
        </p>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={goBack}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 inline-flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 inline-flex items-center disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Keys...
            </>
          ) : (
            <>
              Generate Keys
              <Zap className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );

  // Step 3: Key Generation
  const renderStep3 = () => (
    <div className="text-center py-8">
      <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 mb-6">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Encryption Keys</h3>
      <p className="text-sm text-gray-600 mb-4">
        Creating your zero-knowledge encryption keys securely in your browser...
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-sm text-yellow-800">
          <strong>Please don't close this page.</strong> Key generation may take a few moments 
          depending on your device and selected security level.
        </p>
      </div>
    </div>
  );

  // Step 4: Complete
  const renderStep4 = () => (
    <div className="text-center py-8">
      <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-6">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Registration Complete!</h3>
      <p className="text-sm text-gray-600 mb-6">
        Your account has been created with zero-knowledge encryption enabled.
      </p>
      
      <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
        <div className="text-sm text-green-800">
          <p className="font-medium mb-2">What happens next:</p>
          <ul className="text-left space-y-1">
            <li>• You can now log in with your username and login password</li>
            <li>• After login, you'll be prompted for your encryption password</li>
            <li>• Your documents will be encrypted locally before upload</li>
            <li>• The server will never see your encryption password or document content</li>
          </ul>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-sm text-red-800">
          <p className="font-medium">⚠️ Important Security Notice</p>
          <p className="mt-1">
            <strong>Your encryption password cannot be recovered.</strong> If you forget it, 
            your encrypted documents will be permanently inaccessible. Please store it securely.
          </p>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <div className={`w-full max-w-3xl mx-auto ${className}`}>
      <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Create Your Secure Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Set up zero-knowledge encryption for maximum document security
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    ${currentStep >= step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {step.id}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
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

        {/* Current Step Content */}
        {renderCurrentStep()}
      </div>
    </div>
  );
}