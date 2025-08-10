/**
 * Registration Page Component for SecureVault Frontend
 * 
 * Full page layout for zero-knowledge user registration with branding.
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ZeroKnowledgeRegistrationWizard from '../components/auth/ZeroKnowledgeRegistrationWizard';
import { GuestOnly } from '../components/auth/ProtectedRoute';
import { Link } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();

  const handleRegistrationSuccess = useCallback(() => {
    // After successful registration, redirect to login page
    navigate('/login', { 
      state: { 
        message: 'Account created successfully! Please sign in with your credentials.' 
      }
    });
  }, [navigate]);

  return (
    <GuestOnly>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Header with branding */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">SecureVault</h1>
            <p className="mt-2 text-sm text-gray-600">
              Create your zero-knowledge encrypted account
            </p>
            <div className="mt-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              🔒 Zero-Knowledge Registration
            </div>
          </div>
        </div>

        {/* Registration Wizard */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
          <ZeroKnowledgeRegistrationWizard onComplete={handleRegistrationSuccess} />
        </div>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in here
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