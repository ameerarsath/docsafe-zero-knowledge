/**
 * Admin System Monitoring Page Component for SecureVault
 * 
 * Real-time system monitoring page providing:
 * - System health and performance metrics
 * - Resource usage visualization
 * - Alert management and thresholds
 * - Historical performance data
 */

import React from 'react';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import { SystemMonitoringInterface } from '../components/admin';

export default function AdminMonitoringPage() {
  return (
    <RequireAuth>
      <AppLayout>
        <div className="container mx-auto px-6 py-8">
          <SystemMonitoringInterface 
            refreshInterval={10000} // 10 seconds for more frequent updates
            enableRealTime={true}
          />
        </div>
      </AppLayout>
    </RequireAuth>
  );
}