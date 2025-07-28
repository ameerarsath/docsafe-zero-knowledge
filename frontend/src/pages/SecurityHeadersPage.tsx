/**
 * Security Headers Management Page
 * 
 * Dedicated page for monitoring and managing security headers,
 * CSP violations, and browser security features.
 */

import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import SecurityHeadersStatus from '../components/security/SecurityHeadersStatus';
import { useCSPViolations, useSecurity } from '../hooks/useSecurity';
import { 
  Shield, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Settings,
  Eye,
  TrendingUp,
  Clock,
  Globe,
  Lock,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';

export default function SecurityHeadersPage() {
  const security = useSecurity();
  const cspViolations = useCSPViolations();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'violations' | 'config'>('overview');

  /**
   * Render CSP violations table
   */
  const renderViolationsTable = () => {
    if (cspViolations.violations.length === 0) {
      return (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No CSP Violations</h3>
          <p className="text-gray-600">Your Content Security Policy is working correctly.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Directive
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Blocked URI
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Document
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cspViolations.violations.slice(0, 20).map((violation, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {violation.violatedDirective}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 break-all">
                    {violation.blockedURI || 'inline'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 truncate max-w-xs">
                    {violation.documentURI}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {violation.lineNumber}:{violation.columnNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-700 mr-3">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="text-gray-600 hover:text-gray-700">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /**
   * Render violations by directive chart
   */
  const renderViolationsByDirective = () => {
    const directives = Object.entries(cspViolations.violationsByDirective);
    
    if (directives.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p>No violation data available</p>
        </div>
      );
    }

    const maxCount = Math.max(...directives.map(([, violations]) => violations.length));

    return (
      <div className="space-y-4">
        {directives.map(([directive, violations]) => {
          const percentage = maxCount > 0 ? (violations.length / maxCount) * 100 : 0;
          
          return (
            <div key={directive} className="flex items-center space-x-3">
              <div className="w-32 text-sm font-medium text-gray-700 truncate">
                {directive}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-12 text-sm text-gray-600 text-right">
                {violations.length}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AppLayout 
      title="Security Headers" 
      subtitle="Monitor and manage browser security features and CSP violations"
    >
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Shield },
              { id: 'violations', name: 'CSP Violations', icon: AlertTriangle },
              { id: 'config', name: 'Configuration', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                  {tab.id === 'violations' && cspViolations.totalCount > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs rounded-full px-2 py-0.5">
                      {cspViolations.totalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Security Headers Status */}
            <SecurityHeadersStatus showDetails={true} />

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <Shield className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {security.isSecure ? 'Secure' : 'Insecure'}
                    </div>
                    <div className="text-sm text-gray-600">Connection</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {cspViolations.totalCount}
                    </div>
                    <div className="text-sm text-gray-600">CSP Violations</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {security.suspiciousActivities.length}
                    </div>
                    <div className="text-sm text-gray-600">Suspicious Activities</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {security.isMonitoring ? 'Active' : 'Inactive'}
                    </div>
                    <div className="text-sm text-gray-600">Monitoring</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'violations' && (
          <div className="space-y-6">
            {/* Violations Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">CSP Violations</h3>
                <p className="text-sm text-gray-600">
                  Content Security Policy violations detected by the browser
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={cspViolations.clearViolations}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear All
                </button>
                <button className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            </div>

            {/* Violations by Directive */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Violations by Directive</h4>
              {renderViolationsByDirective()}
            </div>

            {/* Violations Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900">Recent Violations</h4>
              </div>
              {renderViolationsTable()}
            </div>
          </div>
        )}

        {selectedTab === 'config' && (
          <div className="space-y-6">
            {/* Security Configuration */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Headers Configuration</h3>
              
              <div className="space-y-6">
                {/* HSTS Configuration */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-5 h-5 text-blue-600" />
                      <h4 className="font-medium text-gray-900">HSTS Configuration</h4>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Max Age: 31536000 seconds (1 year)</div>
                    <div>Include Subdomains: Yes</div>
                    <div>Preload: Yes</div>
                  </div>
                </div>

                {/* CSP Configuration */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      <h4 className="font-medium text-gray-900">Content Security Policy</h4>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded font-mono">
                    default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; 
                    img-src 'self' data: blob: https:; font-src 'self' data:; 
                    connect-src 'self' http://localhost:8002; object-src 'none'; 
                    frame-ancestors 'none'; base-uri 'self'; form-action 'self'
                  </div>
                </div>

                {/* Other Headers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Globe className="w-4 h-4 text-purple-600" />
                      <h5 className="font-medium text-gray-900">X-Frame-Options</h5>
                    </div>
                    <div className="text-sm text-gray-600">DENY</div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Eye className="w-4 h-4 text-orange-600" />
                      <h5 className="font-medium text-gray-900">X-Content-Type-Options</h5>
                    </div>
                    <div className="text-sm text-gray-600">nosniff</div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-red-600" />
                      <h5 className="font-medium text-gray-900">X-XSS-Protection</h5>
                    </div>
                    <div className="text-sm text-gray-600">1; mode=block</div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Globe className="w-4 h-4 text-teal-600" />
                      <h5 className="font-medium text-gray-900">Referrer-Policy</h5>
                    </div>
                    <div className="text-sm text-gray-600">strict-origin-when-cross-origin</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Testing Tools */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Testing</h3>
              <div className="space-y-4">
                <button
                  onClick={security.checkHeaders}
                  disabled={security.isLoading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${security.isLoading ? 'animate-spin' : ''}`} />
                  Test Security Headers
                </button>
                
                <button
                  onClick={security.testEncryption}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Test Crypto Functions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}