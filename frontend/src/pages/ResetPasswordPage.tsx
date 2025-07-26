/**
 * Reset Password Page Component for SecureVault Frontend
 * 
 * Full page layout for password reset confirmation with token.
 */

import React from 'react';
import { PasswordResetConfirmForm } from '../components/auth/PasswordResetForm';
import { GuestOnly } from '../components/auth/ProtectedRoute';

export default function ResetPasswordPage() {
  return (
    <GuestOnly>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Header with branding */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">SecureVault</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enterprise-grade secure document storage
            </p>
          </div>
        </div>

        {/* Password Reset Confirmation Form */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <PasswordResetConfirmForm />
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