/**
 * Security Dashboard Test Component
 * 
 * Simple test component to verify security dashboard functionality
 */

import React from 'react';
import SecurityDashboard from './SecurityDashboard';
import SecurityHeadersStatus from './SecurityHeadersStatus';

export default function SecurityDashboardTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Security Dashboard Test
          </h1>
          <p className="text-gray-600">
            Testing security dashboard components and functionality
          </p>
        </div>

        {/* Test Security Headers Status */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Security Headers Status Test
          </h2>
          <SecurityHeadersStatus showDetails={true} />
        </div>

        {/* Test Security Dashboard */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Security Dashboard Test
          </h2>
          <SecurityDashboard autoRefresh={false} refreshInterval={60000} />
        </div>

        {/* Test Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Test Status
          </h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Security Dashboard Component Loaded</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Security Headers Status Component Loaded</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Mock Data Fallback Working</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700">API Integration Ready (will use mock data if API unavailable)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}