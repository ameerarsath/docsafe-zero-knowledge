/**
 * Admin Dashboard Page Component for SecureVault
 * 
 * Main admin dashboard page that provides:
 * - System overview and health monitoring
 * - Quick navigation to admin functions
 * - Real-time metrics and alerts
 * - Administrative quick actions
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import { AdminDashboardOverview } from '../components/admin';

interface Props {
  onNavigate?: (page: string) => void;
}

export default function AdminDashboardPage({ onNavigate }: Props) {
  const navigate = useNavigate();
  
  const handleNavigation = (page: string) => {
    // Handle navigation to different admin sections
    onNavigate?.(page);
    
    // Map page names to proper routes
    const routeMap: Record<string, string> = {
      'users': '/admin/users',
      'audit': '/admin/audit', 
      'settings': '/admin/monitoring', // Map to monitoring since we don't have settings yet
      'compliance': '/admin/audit', // Map to audit for compliance reports
      'monitoring': '/admin/monitoring',
      'rbac': '/admin/rbac'
    };
    
    const targetRoute = routeMap[page] || `/admin/${page}`;
    navigate(targetRoute);
  };

  return (
    <RequireAuth>
      <AppLayout>
        <div className="container mx-auto px-6 py-8">
          <AdminDashboardOverview 
            refreshInterval={30000} // 30 seconds
            onNavigate={handleNavigation}
          />
        </div>
      </AppLayout>
    </RequireAuth>
  );
}