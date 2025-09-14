/**
 * Security Dashboard Page
 * 
 * Main security overview page showing threat monitoring, security headers status,
 * and security metrics with real-time updates.
 */

import React from 'react';
import AppLayout from '../components/layout/AppLayout';
import SecurityDashboard from '../components/security/SecurityDashboard';
import SecurityHeadersStatus from '../components/security/SecurityHeadersStatus';
import { Shield, AlertTriangle, Activity } from 'lucide-react';

export default function SecurityDashboardPage() {
  return (
    <AppLayout 
      title="Security Dashboard" 
      subtitle="Real-time security monitoring and threat detection"
    >
      <div className="space-y-6">
        {/* Quick Security Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-medium text-gray-900">Security Overview</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Monitor real-time security threats, events, and system protection status.
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-900">Active</div>
                  <div className="text-sm text-green-700">Protection</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-900">Real-time</div>
                  <div className="text-sm text-blue-700">Monitoring</div>
                </div>
                
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-900">Alerts</div>
                  <div className="text-sm text-yellow-700">Management</div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.href = '/security/headers'}
                  className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <div className="font-medium text-blue-900">Security Headers</div>
                  <div className="text-sm text-blue-700">View headers status</div>
                </button>
                
                <button 
                  onClick={() => window.location.href = '/security/monitoring'}
                  className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <div className="font-medium text-green-900">Event Monitoring</div>
                  <div className="text-sm text-green-700">Real-time events</div>
                </button>
                
                <button 
                  onClick={() => alert('Threat Analysis - Feature coming soon!')}
                  className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <div className="font-medium text-purple-900">Threat Analysis</div>
                  <div className="text-sm text-purple-700">Security analysis</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Headers Status */}
        <SecurityHeadersStatus showDetails={true} />

        {/* Main Security Dashboard */}
        <SecurityDashboard />
      </div>
    </AppLayout>
  );
}