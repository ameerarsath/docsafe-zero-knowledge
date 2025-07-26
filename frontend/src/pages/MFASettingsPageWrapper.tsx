/**
 * MFA Settings Page Wrapper
 * 
 * Wraps the MFA Settings component with AppLayout for standalone page usage
 */

import React from 'react';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import MFASettingsPage from '../components/mfa/MFASettingsPage';

export default function MFASettingsPageWrapper() {
  return (
    <RequireAuth>
      <AppLayout 
        title="Multi-Factor Authentication" 
        subtitle="Manage your two-factor authentication settings and backup codes"
      >
        <MFASettingsPage />
      </AppLayout>
    </RequireAuth>
  );
}